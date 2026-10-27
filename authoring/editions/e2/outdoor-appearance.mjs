import {OUTDOOR_THEMES} from '../../../src/core/outdoor-appearance.js';

export function applyOutdoorAppearance(bundle){
  for(const theme of OUTDOOR_THEMES){
    const map=bundle.additions.maps['e2_'+theme];
    if(map)map.outdoor=theme;
  }
}
