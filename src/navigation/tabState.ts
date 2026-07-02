import { Href } from 'expo-router';

export type TabKey = 'home' | 'climb' | 'profile';

const tabRootPaths: Record<TabKey, string> = {
  climb: '/climb',
  home: '/',
  profile: '/profile',
};

const rememberedTabRoutes: Record<TabKey, Href> = {
  climb: '/climb',
  home: '/',
  profile: '/profile',
};

const rememberedScrollOffsets = new Map<string, number>();
const nonPersistentTabRoutes = new Set(['/session/active', '/session/finish', '/session/summary']);

type SearchParams = Record<string, string | string[] | undefined>;

function encodeSearchParams(params: SearchParams) {
  const pairs = Object.entries(params).flatMap(([key, value]) => {
    if (value === undefined) {
      return [];
    }

    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(item)}`);
  });

  return pairs.join('&');
}

export function getTabRootPath(tab: TabKey) {
  return tabRootPaths[tab];
}

export function getTabForPathname(pathname: string): TabKey {
  if (pathname === '/search') {
    return 'home';
  }

  if (
    pathname.startsWith('/climb') ||
    pathname === '/session/active' ||
    pathname === '/session/finish' ||
    pathname === '/session/summary'
  ) {
    return 'climb';
  }

  if (
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/collection') ||
    pathname.startsWith('/session/')
  ) {
    return 'profile';
  }

  return 'home';
}

export function isTabRootPath(tab: TabKey, pathname: string) {
  return pathname === tabRootPaths[tab];
}

export function createRouteHref(pathname: string, params: SearchParams = {}) {
  const query = encodeSearchParams(params);

  return (query ? `${pathname}?${query}` : pathname) as Href;
}

export function createRouteKey(pathname: string, params: SearchParams = {}) {
  return createRouteHref(pathname, params).toString();
}

export function rememberRouteForTab(tab: TabKey, href: Href) {
  rememberedTabRoutes[tab] = href;
}

export function rememberRouteForPath(pathname: string, href: Href) {
  const tab = getTabForPathname(pathname);

  if (nonPersistentTabRoutes.has(pathname)) {
    resetRememberedRouteForTab(tab);
    return;
  }

  rememberRouteForTab(tab, href);
}

export function getRememberedRouteForTab(tab: TabKey) {
  return rememberedTabRoutes[tab] ?? tabRootPaths[tab];
}

export function resetRememberedRouteForTab(tab: TabKey) {
  rememberedTabRoutes[tab] = tabRootPaths[tab] as Href;
}

export function rememberScrollOffset(routeKey: string, offset: number) {
  rememberedScrollOffsets.set(routeKey, Math.max(0, offset));
}

export function getRememberedScrollOffset(routeKey: string) {
  return rememberedScrollOffsets.get(routeKey) ?? 0;
}

export function clearRememberedScrollOffset(routeKey: string) {
  rememberedScrollOffsets.delete(routeKey);
}
