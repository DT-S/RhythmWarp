// Fixed stereo panning positions shared by both audio channels.
export const PAN_PRESETS=Object.freeze([
  Object.freeze({label:'LEFT',value:-1}),
  Object.freeze({label:'CENTER',value:0}),
  Object.freeze({label:'RIGHT',value:1})
]);

// Keep actual audio state, range input and preset indicators in sync.
// Arbitrary slider values remain valid without falsely selecting a preset.
export function setChannelPan(channel,value,slider,buttons){
  const pan=Number(value);
  if(!Number.isFinite(pan)||pan<-1||pan>1)throw RangeError('Pan must be between -1 and 1');
  channel.pan=pan;
  slider.value=String(pan);
  for(const button of buttons){
    button.setAttribute('aria-pressed',String(Number(button.dataset.pan)===pan));
  }
  return pan;
}
