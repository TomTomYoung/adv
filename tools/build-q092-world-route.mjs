import {movingShelterSource} from '../authoring/editions/e2/story-q092.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildMovingShelter(options){
  return buildPreservedWorldFile('q092',(original,items)=>
    compilePreservedWorldQuest(original,items,movingShelterSource(),'shelter'),options);
}
