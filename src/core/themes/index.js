import { defaultTheme } from './default.js';
import { inkTheme } from './ink.js';
import { minimalTheme } from './minimal.js';
import { warmTheme } from './warm.js';
import { cyberTheme } from './cyber.js';

export const themes = {
  default: defaultTheme,
  ink: inkTheme,
  minimal: minimalTheme,
  warm: warmTheme,
  cyber: cyberTheme
};

export function getTheme(name) {
  return themes[name] || themes.default;
}

export function listThemes() {
  return Object.keys(themes);
}

export default themes;
