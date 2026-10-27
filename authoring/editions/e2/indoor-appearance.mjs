import {INDOOR_THEMES} from '../../../src/core/indoor-appearance.js';
export function applyIndoorAppearance(bundle){
  for(const theme of INDOOR_THEMES){
    const map=bundle.additions.maps['e2_'+theme];
    if(map)map.indoor=theme;
  }
}
