import {returnTaxSource} from '../authoring/editions/e2/story-q094.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildReturnTax(options){
  return buildPreservedWorldFile('q094',(original,items)=>
    compilePreservedWorldQuest(original,items,returnTaxSource(),'tax'),options);
}
