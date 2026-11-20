import {theatreSource} from '../authoring/editions/e2/story-q056.mjs';
import {stallSource} from '../authoring/editions/e2/story-q057.mjs';
import {exchangeSource} from '../authoring/editions/e2/story-q058.mjs';
import {feastSource} from '../authoring/editions/e2/story-q059.mjs';
import {wakingSource} from '../authoring/editions/e2/story-q060.mjs';
import {auctionSource} from '../authoring/editions/e2/story-q052.mjs';
import {foodSource} from '../authoring/editions/e2/story-q053.mjs';
import {dreamSource} from '../authoring/editions/e2/story-q054.mjs';
import {shadowSource} from '../authoring/editions/e2/story-q055.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export async function buildMarketWorldRoutes(options){
  for(const [id,source] of Object.entries({q052:auctionSource,q053:foodSource,q054:dreamSource,q055:shadowSource,
    q056:theatreSource,q057:stallSource,q058:exchangeSource,q059:feastSource,q060:wakingSource})){
    await buildPreservedWorldFile(id,(original,items)=>compilePreservedWorldQuest(original,items,source(),'market'),options);
  }
}
