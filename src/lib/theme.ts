export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const THEME_CHANGE_EVENT = "themechange";

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * It resolves the stored preference (or the OS setting) to `data-theme` on
 * <html> and keeps following the OS while the preference is "system".
 */
export const themeScript = `(function(){try{var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var p=localStorage.getItem("${THEME_STORAGE_KEY}");d.dataset.theme=p==="light"||p==="dark"?p:m.matches?"dark":"light"}a();m.addEventListener("change",a);window.addEventListener("${THEME_CHANGE_EVENT}",a);window.addEventListener("storage",function(e){if(e.key==="${THEME_STORAGE_KEY}")a()})}catch(e){}})();`;
