import { themeById, THEMES } from './themes';
import type { Theme } from './types';

const STORAGE_KEY = 'survivor:theme';

function initialTheme(): Theme {
  const fromUrl = new URLSearchParams(location.search).get('theme');
  if (fromUrl) return themeById(fromUrl);
  return themeById(localStorage.getItem(STORAGE_KEY));
}

let current: Theme = initialTheme();

export function getTheme(): Theme {
  return current;
}

export function setTheme(id: string) {
  current = themeById(id);
  localStorage.setItem(STORAGE_KEY, current.id);
}

/** T 키로 순환 전환 */
export function cycleTheme(): Theme {
  const i = THEMES.findIndex((t) => t.id === current.id);
  setTheme(THEMES[(i + 1) % THEMES.length].id);
  return current;
}

export { THEMES, themeById };
export type { Theme };
export * from './textures';
