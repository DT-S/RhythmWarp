// Original user-supplied Starfleet/LCARS UI sounds (October 2026).
// Each filename is retained verbatim; no replacement oscillators or remixes.
// This is the single registry used by both AudioEngine and the offline cache.
export const UI_CUE_ASSETS=Object.freeze({
  'lcars-launch':'launchsound_Staggered_Entrance_Animation.mp3',
  'lcars-menu-build':'menu_or_window_change.mp3',
  'switchingmenus':'modechange.mp3',
  'hoversound':'hovering.mp3',
  'buttonpress':'keypress_standart.mp3',
  'keypress-increase':'keypress_increase.mp3',
  'keypress-decrease':'keypress_decrease.mp3',
  'option-toggle':'option_toggle_or_secondary_menu_pops_up.mp3',
  'Warningsound':'caution.mp3',
  'consolewarning':'consolewarning.mp3',
  'denied':'denied.mp3',
  'erase-accepted':'erase_accepted.mp3',
  'invalidsound':'invalid_input.mp3',
  'update-restart':'update&restart.mp3',
  'windowcloses':'windowcloses.mp3'
});
export const UI_CUE_PATHS=Object.freeze(Object.values(UI_CUE_ASSETS).map(file=>'./assets/audio/ui/'+file));

// Two pairs in the supplied archive are byte-for-byte identical:
// update&restart = erase_accepted, windowcloses = menu_or_window_change.
// Keep separate semantic cue names so files can be swapped independently.
// Acceptsound is intentionally preserved from the previous pack because
// there is no general-purpose positive confirmation sound in this archive.

export function classifyControlCue(control){
  if(control.dataset?.tab)return control.classList.contains('active')?'buttonpress':'lcars-menu-build';
  // The three Tactical/Circular/Linear selectors are genuine view builds.
  if(control.dataset?.tacView)return control.getAttribute('aria-pressed')==='true'?'buttonpress':'lcars-menu-build';
  if(control.dataset?.mode)return control.getAttribute('aria-pressed')==='true'?'buttonpress':'switchingmenus';
  const id=control.id||'';
  // Circular/Linear changes are genuine layout transitions, so reuse the
  // same original window-build sample as a sidebar page change.
  if(id==='view')return 'lcars-menu-build';
  if(id==='diaryDangerCancel')return 'denied';
  if(id==='diaryDangerConfirm')return 'buttonpress'; // Success is sounded by the actual deletion.
  if(id==='diaryClearAll'||id==='diaryClearRecent')return 'buttonpress'; // Modal plays warning.
  if(id==='update')return 'update-restart';
  if(id==='plus'||id==='linearTempoPlus')return 'keypress-increase';
  if(id==='minus'||id==='linearTempoMinus')return 'keypress-decrease';
  const cl=control.classList;
  if(['matrix-quick-right','matrix-step-up','matrix-micro-right','lcars-plus','lcars-jump-up']
      .some(name=>cl?.contains?.(name)))return 'keypress-increase';
  if(['matrix-quick-left','matrix-step-down','matrix-micro-left','lcars-minus','lcars-jump-down']
      .some(name=>cl?.contains?.(name)))return 'keypress-decrease';
  if(control.tagName==='SUMMARY'||control.getAttribute?.('aria-expanded')!==null&&control.getAttribute?.('aria-expanded')!==undefined)
    return 'option-toggle';
  if(control.type==='checkbox'||(control.tagName==='LABEL'&&control.querySelector?.('input[type=checkbox]')))return 'option-toggle';
  return 'buttonpress';
}
