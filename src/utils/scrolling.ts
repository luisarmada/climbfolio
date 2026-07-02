import { Platform, ScrollView } from 'react-native';

type ScrollableNode = {
  clientHeight: number;
  scrollHeight: number;
  scrollTo?: (options: { behavior?: 'auto' | 'smooth'; top: number }) => void;
  scrollTop: number;
};

type ScrollViewWithNodes = ScrollView & {
  getNativeScrollRef?: () => unknown;
  getScrollableNode?: () => unknown;
};

type GlobalWithWebScroll = typeof globalThis & {
  document?: {
    querySelectorAll: (selector: string) => ArrayLike<unknown>;
  };
  performance?: {
    now: () => number;
  };
  requestAnimationFrame?: (callback: (timestamp: number) => void) => number;
};

const scrollTopAnimationDurationMs = 320;

function isScrollableNode(node: unknown): node is ScrollableNode {
  if (!node || typeof node !== 'object') {
    return false;
  }

  const maybeNode = node as Partial<ScrollableNode>;

  return (
    typeof maybeNode.clientHeight === 'number' &&
    typeof maybeNode.scrollHeight === 'number' &&
    typeof maybeNode.scrollTop === 'number'
  );
}

function getFirstScrollablePageNode() {
  const documentRef = (globalThis as GlobalWithWebScroll).document;

  if (!documentRef) {
    return null;
  }

  const scrollableNode = Array.from(documentRef.querySelectorAll('*')).find((node) => {
    if (!isScrollableNode(node)) {
      return false;
    }

    return node.scrollHeight > node.clientHeight + 1;
  });

  return isScrollableNode(scrollableNode) ? scrollableNode : null;
}

function getWebScrollableNode(scrollView: ScrollView, allowPageFallback = true) {
  const handle = scrollView as ScrollViewWithNodes;
  const candidates = [handle.getScrollableNode?.(), handle.getNativeScrollRef?.(), scrollView];

  return candidates.find(isScrollableNode) ?? (allowPageFallback ? getFirstScrollablePageNode() : null);
}

function easeOutQuad(progress: number) {
  return 1 - Math.pow(1 - progress, 2);
}

function smoothScrollNodeToTop(node: ScrollableNode) {
  const startY = node.scrollTop;

  if (startY <= 0) {
    return;
  }

  const webGlobal = globalThis as GlobalWithWebScroll;

  if (!webGlobal.requestAnimationFrame) {
    node.scrollTo?.({ behavior: 'smooth', top: 0 });
    return;
  }

  const startedAt = webGlobal.performance?.now() ?? Date.now();

  function animateFrame() {
    const now = webGlobal.performance?.now() ?? Date.now();
    const elapsedMs = now - startedAt;
    const progress = Math.min(elapsedMs / scrollTopAnimationDurationMs, 1);
    const nextY = Math.round(startY * (1 - easeOutQuad(progress)));

    node.scrollTop = nextY;

    if (progress < 1) {
      webGlobal.requestAnimationFrame?.(animateFrame);
      return;
    }

    node.scrollTop = 0;
  }

  webGlobal.requestAnimationFrame(animateFrame);
}

export function smoothScrollViewToTop(scrollView: ScrollView | null) {
  if (!scrollView) {
    return;
  }

  if (Platform.OS !== 'web') {
    scrollView.scrollTo({ animated: true, y: 0 });
    return;
  }

  const scrollableNode = getWebScrollableNode(scrollView);

  if (!scrollableNode) {
    scrollView.scrollTo({ animated: true, y: 0 });
    return;
  }

  smoothScrollNodeToTop(scrollableNode);
}

export function scrollViewToOffset(scrollView: ScrollView | null, offset: number, animated = false) {
  if (!scrollView) {
    return;
  }

  const nextOffset = Math.max(0, offset);

  if (Platform.OS !== 'web') {
    scrollView.scrollTo({ animated, y: nextOffset });
    return;
  }

  const scrollableNode = getWebScrollableNode(scrollView);

  if (!scrollableNode) {
    scrollView.scrollTo({ animated, y: nextOffset });
    return;
  }

  scrollableNode.scrollTop = nextOffset;
}
