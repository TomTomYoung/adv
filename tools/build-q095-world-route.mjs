import {heroMemorialSource} from '../authoring/editions/e2/story-q095.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildHeroMemorial(options){
  return buildPreservedWorldFile('q095',(original,items)=>
    compilePreservedWorldQuest(original,items,heroMemorialSource(),'memorial'),options);
}
