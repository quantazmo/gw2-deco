// @ts-nocheck
/**
 * ThemeManager
 * Applies the user's preferred color theme to the document root element
 * by setting or removing the `data-theme` attribute on `<html>`.
 *
 * Theme values:
 *   'light'  — force light theme regardless of OS setting
 *   'dark'   — force dark theme regardless of OS setting
 *   'system' — remove the attribute so CSS @media (prefers-color-scheme: dark)
 *              handles it automatically; updates in real time when OS changes
 */
export class ThemeManager {
    /**
     * Apply the given theme preference.
     * @param {'light'|'dark'|'system'} theme
     */
    apply(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            // 'system' — no explicit attribute; CSS media query takes over
            document.documentElement.removeAttribute('data-theme');
        }
    }

    /**
     * Read the current effective theme as resolved by the browser.
     * Returns 'dark' when dark mode is active, 'light' otherwise.
     * @returns {'light'|'dark'}
     */
    getEffective() {
        const attr = document.documentElement.getAttribute('data-theme');
        if (attr === 'dark') return 'dark';
        if (attr === 'light') return 'light';
        // System — detect via media query
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }
}
