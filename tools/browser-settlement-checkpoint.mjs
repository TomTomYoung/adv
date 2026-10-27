import assert from 'node:assert/strict';
import path from 'node:path';

// Called after a real arrival by the existing regional browser journeys.
export async function settlementCheckpoint(page,{location,asset,layout,width,output}){
  const before=await page.evaluate(()=>({save:JSON.parse(h.g.save()),town:h.g.state.townLocation}));
  assert.equal(before.town,location);
  await page.evaluate(()=>h.resume());
  assert.deepEqual(await page.evaluate(()=>JSON.parse(h.g.save())),before.save);
  const background=page.locator('.town-background');
  await background.waitFor({state:'visible'});
  const image=await background.evaluate(async el=>{
    await el.decode();
    const rect=el.getBoundingClientRect();
    return {src:new URL(el.currentSrc).pathname,width:el.naturalWidth,height:el.naturalHeight,
      shownWidth:rect.width,shownHeight:rect.height,alt:el.alt,
      viewport:innerWidth,document:document.documentElement.scrollWidth};
  });
  assert.equal(image.src,`/assets/images/locations/${asset}.webp`);
  assert.deepEqual([image.width,image.height],[1536,1024]);
  assert.ok(image.shownWidth>0&&image.shownHeight>0&&image.alt);
  assert.ok(image.document<=image.viewport+1,`${layout} ${width} ${location}: horizontal overflow`);
  await page.screenshot({path:path.join(output,`${layout}-${width}-arrival-${asset}.png`),fullPage:true});
}
