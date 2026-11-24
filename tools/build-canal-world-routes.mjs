import locks from '../authoring/editions/e2/story-q101.mjs';
import bells from '../authoring/editions/e2/story-q102.mjs';
import tickets from '../authoring/editions/e2/story-q103.mjs';
import rain from '../authoring/editions/e2/story-q104.mjs';
import wedding from '../authoring/editions/e2/story-q105.mjs';
import bread from '../authoring/editions/e2/story-q106.mjs';
import {quarter} from '../authoring/editions/e2/canal-quarter.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export const canalQuests=[locks,bells,tickets,rain,wedding,bread];
export function extendCanalQuarter(bundle){
  const locations=bundle.additions.locations;
  locations[quarter.id]=quarter;
  for(const quest of canalQuests)Object.assign(locations,quest.locations);
}
export async function buildCanalWorldRoutes(options){
  for(const {id,source} of canalQuests){
    await buildPreservedWorldFile(id,(original,items)=>{
      const q=compilePreservedWorldQuest(original,items,source(),'canal');
      q.unlockHint='いつでも受注できる。荷揚げ河岸から運河通りへ進み、手帳に示される現場を訪ねる。';
      for(const key of Object.keys(q.outcomes))q.scripts[id+'.canal.end.'+key]={commands:[{op:'jump',script:id+'.end.'+key}]};
      return q;
    },options);
  }
}
