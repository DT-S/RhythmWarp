// Theme preference is part of the validated, offline native state.
export const THEMES=Object.freeze(['voyager','elite','redalert']);
export const normalizeTheme=value=>THEMES.includes(value)?value:'voyager';
export function applyTheme(root,raw){
 const theme=normalizeTheme(raw);
 root.documentElement.dataset.appTheme=theme;
 const overlay=root.querySelector('#lcarsStartup');
 if(overlay)overlay.dataset.theme=theme;
 for(const b of root.querySelectorAll('[data-set-theme]'))
  b.setAttribute('aria-pressed',String(b.dataset.setTheme===theme));
 const selector=root.querySelector('#appTheme');
 if(selector)selector.value=theme;
 return theme;
}
