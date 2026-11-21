import {storesSource,storesCharacters} from '../authoring/editions/e2/story-q096.mjs';
import {rollSource,rollCharacters} from '../authoring/editions/e2/story-q097.mjs';
import {roomSource,roomCharacters} from '../authoring/editions/e2/story-q098.mjs';
import {beaconSource,beaconCharacters} from '../authoring/editions/e2/story-q099.mjs';
import {hundredSource,hundredCharacters} from '../authoring/editions/e2/story-q100.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export const deepAbyssCasts=[storesCharacters,rollCharacters,roomCharacters,beaconCharacters,hundredCharacters];
export async function buildDeepAbyssWorldRoutes(options){
  for(const [id,source] of Object.entries({q096:storesSource,q097:rollSource,q098:roomSource,q099:beaconSource,q100:hundredSource})){
    await buildPreservedWorldFile(id,(original,items)=>{
      const quest=compilePreservedWorldQuest(original,items,source(),'abyss');
      // The hundredth quest also records the campaign ending and its title.
      if(id==='q100')for(const key of Object.keys(quest.outcomes)){
        quest.scripts[id+'.abyss.end.'+key]={commands:[{op:'jump',script:id+'.flow.end.'+key}]};
      }
      return quest;
    },options);
  }
}
