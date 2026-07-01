import { beforeEach, describe, expect, it } from 'vitest';
import {
  getRememberedRouteForTab,
  rememberRouteForPath,
  resetRememberedRouteForTab,
} from '../navigation/tabState';

describe('tab route memory', () => {
  beforeEach(() => {
    resetRememberedRouteForTab('climb');
    resetRememberedRouteForTab('home');
    resetRememberedRouteForTab('profile');
  });

  it.each([
    ['/session/active', '/session/active'],
    ['/session/finish', '/session/finish'],
    ['/session/summary', '/session/summary?sessionId=session_1'],
  ])('does not persist %s as the remembered Climb destination', (pathname, href) => {
    rememberRouteForPath('/climb/start', '/climb/start');
    expect(getRememberedRouteForTab('climb')).toBe('/climb/start');

    rememberRouteForPath(pathname, href);

    expect(getRememberedRouteForTab('climb')).toBe('/climb');
  });
});
