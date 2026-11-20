import {auctionSource} from '../authoring/editions/e2/story-q052.mjs';
import {foodSource} from '../authoring/editions/e2/story-q053.mjs';
import {dreamSource} from '../authoring/editions/e2/story-q054.mjs';
import {shadowSource} from '../authoring/editions/e2/story-q055.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export async function buildMarketWorldRoutes(options){
  for(const [id,source] of Object.entries({q052:auctionSource,q053:foodSource,q054:dreamSource,q055:shadowSource})){
    await buildPreservedWorldFile(id,(original,items)=>compilePreservedWorldQuest(original,items,source(),'market'),options);
  }
}
