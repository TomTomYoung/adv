import {returningFootprintsSource} from '../authoring/editions/e2/story-q091.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildReturningFootprints(options){
  return buildPreservedWorldFile('q091',(original,items)=>
    compilePreservedWorldQuest(original,items,returningFootprintsSource(),'footprints'),options);
}
