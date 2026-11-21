import {innNamesSource} from '../authoring/editions/e2/story-q093.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildInnNames(options){
  return buildPreservedWorldFile('q093',(original,items)=>
    compilePreservedWorldQuest(original,items,innNamesSource(),'inn'),options);
}
