import { RefObject, useCallback, useLayoutEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { clearRememberedScrollOffset, getRememberedScrollOffset, rememberScrollOffset } from '../navigation/tabState';
import { ScrollableHandle, scrollViewToOffset } from '../utils/scrolling';

const restoreRetryDelayMs = 50;
const restoreRetryCount = 2;
const restoreOffsetTolerance = 2;
let rememberedScrollViewId = 0;

type WebScrollableNode = {
  addEventListener?: (type: 'scroll', listener: () => void, options?: { passive?: boolean }) => void;
  clientHeight: number;
  querySelectorAll?: (selector: string) => ArrayLike<unknown>;
  removeEventListener?: (type: 'scroll', listener: () => void) => void;
  scrollHeight: number;
  scrollTop: number;
};

type GlobalWithDocument = typeof globalThis & {
  document?: {
    getElementById: (id: string) => unknown;
  };
};

function isScrollableNode(node: unknown): node is WebScrollableNode {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const maybeNode = node as Partial<WebScrollableNode>;

  return (
    typeof maybeNode.clientHeight === 'number' &&
    typeof maybeNode.scrollHeight === 'number' &&
    typeof maybeNode.scrollTop === 'number'
  );
}

function canRememberWebScrollNode(node: WebScrollableNode) {
  return node.clientHeight > 0 && node.scrollHeight > node.clientHeight + 1;
}

function getWebScrollNode(nativeID: string) {
  const rootNode = (globalThis as GlobalWithDocument).document?.getElementById(nativeID);

  if (isScrollableNode(rootNode) && canRememberWebScrollNode(rootNode)) {
    return rootNode;
  }

  if (!rootNode || typeof rootNode !== 'object') {
    return null;
  }

  const descendants = (rootNode as WebScrollableNode).querySelectorAll?.('*');

  if (!descendants) {
    return null;
  }

  const scrollableNode = Array.from(descendants).find((node) => isScrollableNode(node) && canRememberWebScrollNode(node));

  return isScrollableNode(scrollableNode) ? scrollableNode : null;
}

type RememberedScrollViewOptions = {
  canRestore?: boolean;
  initialOffset?: number;
  resetRememberedOffsetOnMount?: boolean;
};

export function useRememberedScrollView(routeKey: string, scrollViewRef: RefObject<ScrollableHandle>, options: RememberedScrollViewOptions = {}) {
  const canRestore = options.canRestore ?? true;
  const resetRememberedOffsetOnMountRef = useRef(Boolean(options.resetRememberedOffsetOnMount));
  const nativeIDRef = useRef<string | null>(null);
  const webScrollNodeRef = useRef<WebScrollableNode | null>(null);

  if (!nativeIDRef.current) {
    rememberedScrollViewId += 1;
    nativeIDRef.current = `remembered-scroll-view-${rememberedScrollViewId}`;
  }

  const nativeID = nativeIDRef.current;
  const initialContentOffsetRef = useRef({
    x: 0,
    y: Math.max(resetRememberedOffsetOnMountRef.current ? 0 : getRememberedScrollOffset(routeKey), options.initialOffset ?? 0),
  });
  const isRestoringRef = useRef(initialContentOffsetRef.current.y > 0);
  const restoreTargetOffsetRef = useRef(initialContentOffsetRef.current.y);
  const restoreTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const findWebScrollNode = useCallback(() => {
    const cachedNode = webScrollNodeRef.current;

    if (cachedNode && canRememberWebScrollNode(cachedNode)) {
      return cachedNode;
    }

    const nextNode = getWebScrollNode(nativeID);
    webScrollNodeRef.current = nextNode;
    return nextNode;
  }, [nativeID]);

  const scrollWebNodeToOffset = useCallback((offset: number) => {
    const scrollNode = findWebScrollNode();

    if (!scrollNode) {
      return false;
    }

    scrollNode.scrollTop = Math.max(0, offset);
    return true;
  }, [findWebScrollNode]);

  const stopRestore = useCallback(() => {
    if (restoreTimerRef.current) {
      globalThis.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }

    isRestoringRef.current = false;
  }, []);

  const restoreScrollOffset = useCallback((offset = getRememberedScrollOffset(routeKey), retriesRemaining = restoreRetryCount) => {
    if (restoreTimerRef.current) {
      globalThis.clearTimeout(restoreTimerRef.current);
      restoreTimerRef.current = null;
    }

    if (!canRestore) {
      isRestoringRef.current = false;
      return;
    }

    if (offset <= 0) {
      isRestoringRef.current = false;
      return;
    }

    isRestoringRef.current = true;
    restoreTargetOffsetRef.current = offset;

    if (!scrollWebNodeToOffset(offset)) {
      scrollViewToOffset(scrollViewRef.current, offset, false, false);
    }

    if (retriesRemaining <= 0) {
      restoreTimerRef.current = globalThis.setTimeout(() => {
        isRestoringRef.current = false;
        restoreTimerRef.current = null;
      }, restoreRetryDelayMs);
      return;
    }

    restoreTimerRef.current = globalThis.setTimeout(() => {
      restoreScrollOffset(offset, retriesRemaining - 1);
    }, restoreRetryDelayMs);
  }, [canRestore, routeKey, scrollViewRef, scrollWebNodeToOffset]);

  useLayoutEffect(() => {
    if (resetRememberedOffsetOnMountRef.current) {
      clearRememberedScrollOffset(routeKey);
    }
  }, [routeKey]);

  useLayoutEffect(() => {
    restoreScrollOffset(initialContentOffsetRef.current.y, 1);
  }, [restoreScrollOffset]);

  const rememberObservedOffset = useCallback((offset: number) => {
    if (!canRestore) {
      return;
    }

    const restoreTargetOffset = restoreTargetOffsetRef.current;

    if (isRestoringRef.current && offset < restoreTargetOffset - restoreOffsetTolerance) {
      return;
    }

    if (isRestoringRef.current) {
      isRestoringRef.current = false;
    }

    restoreTargetOffsetRef.current = offset;
    rememberScrollOffset(routeKey, offset);
  }, [canRestore, routeKey]);

  const rememberProtectedOffset = useCallback((offset: number) => {
    const nextOffset = Math.max(0, offset);

    restoreTargetOffsetRef.current = nextOffset;
    isRestoringRef.current = nextOffset > 0;
    rememberScrollOffset(routeKey, nextOffset);
  }, [routeKey]);

  const rememberCurrentWebScrollOffset = useCallback(() => {
    if (!canRestore) {
      return null;
    }

    const scrollNode = findWebScrollNode();

    if (scrollNode && canRememberWebScrollNode(scrollNode)) {
      rememberProtectedOffset(scrollNode.scrollTop);
      return scrollNode.scrollTop;
    }

    const rememberedOffset = getRememberedScrollOffset(routeKey);
    return rememberedOffset > 0 ? rememberedOffset : null;
  }, [canRestore, findWebScrollNode, rememberProtectedOffset, routeKey]);

  useFocusEffect(
    useCallback(() => {
      restoreScrollOffset();

      return () => {
        rememberCurrentWebScrollOffset();
        stopRestore();
      };
    }, [rememberCurrentWebScrollOffset, restoreScrollOffset, stopRestore]),
  );

  useLayoutEffect(() => {
    if (!canRestore) {
      return undefined;
    }

    const scrollNode = findWebScrollNode();

    if (!scrollNode?.addEventListener) {
      return undefined;
    }

    const handleWebScroll = () => {
      if (!canRememberWebScrollNode(scrollNode)) {
        return;
      }

      rememberObservedOffset(scrollNode.scrollTop);
    };

    scrollNode.addEventListener('scroll', handleWebScroll, { passive: true });

    return () => {
      if (canRememberWebScrollNode(scrollNode)) {
        rememberProtectedOffset(scrollNode.scrollTop);
      }

      scrollNode.removeEventListener?.('scroll', handleWebScroll);
    };
  }, [canRestore, findWebScrollNode, rememberObservedOffset, rememberProtectedOffset]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    if (layoutMeasurement.height <= 0 || contentSize.height <= layoutMeasurement.height + 1) {
      return;
    }

    rememberObservedOffset(contentOffset.y);
  }, [rememberObservedOffset]);

  const handleContentSizeChange = useCallback(() => {
    if (!canRestore) {
      return;
    }

    if (restoreTargetOffsetRef.current <= 0) {
      return;
    }

    restoreScrollOffset(restoreTargetOffsetRef.current, 1);
  }, [canRestore, restoreScrollOffset]);

  return {
    handleContentSizeChange,
    handleScroll,
    initialContentOffset: initialContentOffsetRef.current,
    nativeID,
    rememberCurrentScrollOffset: rememberCurrentWebScrollOffset,
    restoreScrollOffset,
  };
}
