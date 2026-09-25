import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {installDOM} from './view-dom.mjs';
import {newGame} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {replaceView} from '../src/view/view-layout.js';
import {handleGameKey} from '../src/view/keyboard.js';
import {MAP_ASSETS,mapSection} from '../src/view/minimap.js';

test('map icons are square SVG geometry and every rendered asset exists',async()=>{
  for(const id of MAP_ASSETS){const svg=await fs.readFile(new URL(`../assets/images/map/${id}.svg`,import.meta.url),'utf8');assert.match(svg,/width="24" height="24" viewBox="0 0 24 24"/);assert.doesNotMatch(svg,/<text\b/);}
  const dom=installDOM();try{
    const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const model=projectGame(g);
    for(const direction of ['north','east','south','west']){
      model.dungeon.location.facing=direction;dom.root.replaceChildren(mapSection(model));
      assert.equal(dom.root.querySelector('.minimap').textContent,'');
      const player=dom.root.querySelector('.map-player');assert.ok(player.src.endsWith('player.svg'));
      assert.match(player.style.transform,/^rotate\((0|90|180|270)deg\)$/);
      for(const image of dom.root.querySelectorAll('img'))await fs.access(new URL('../'+image.src,import.meta.url));
    }
  }finally{dom.restore();}
});

test('dark explored cells keep a readable floor while unknown cells reveal no objects or light',()=>{
  const dom=installDOM();try{
    const model={light:0,lightMax:100,dungeon:{name:'確認用',width:3,height:1,location:{x:0,y:0,facing:'east'},cells:[[
      {x:0,y:0,known:true,floor:true,illumination:0},
      {x:1,y:0,known:true,floor:true,illumination:0},
      {x:2,y:0,known:false,floor:true,illumination:8}
    ]],objects:[{x:2,y:0,kind:'chest',name:'未発見の宝箱'}]}};
    dom.root.append(mapSection(model));const cells=dom.root.querySelectorAll('.map-cell');
    assert.equal(cells[1].querySelector('.map-terrain').style.filter,'brightness(0.85)');
    assert.ok(cells[1].querySelector('.map-terrain').src.endsWith('floor.svg'));
    assert.equal(cells[2].dataset.light,undefined);assert.equal(cells[2].querySelector('.map-object'),null);assert.equal(cells[2].title,undefined);
    assert.ok(cells[2].querySelector('.map-terrain').src.endsWith('unknown.svg'));
  }finally{dom.restore();}
});

for(const layout of ['scene','classic'])test(`${layout}: enlarge and restore map preserves exact game state and blocks underlying controls`,()=>{
  const dom=installDOM();let view;try{
    const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const intents=[];
    const dispatch=i=>{intents.push(i);g.dispatch(i);view.render(projectGame(g));};
    view=replaceView(null,layout,dom.root,dispatch,{status(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
    const key=k=>handleGameKey({key:k,preventDefault(){this.defaultPrevented=true;}},{view,model:view.model,dispatch,activeElement:dom.document.activeElement});
    const saved=g.save(),opener=dom.root.querySelector('.map-expand');opener.focus();opener.click();
    assert.ok(view.blocksGameInput());assert.equal(dom.document.activeElement.dataset.focus,'map:close');
    assert.equal(dom.root.querySelector('.map-dialog').getAttribute('aria-modal'),'true');
    for(const k of ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','e','1','Tab'])key(k);
    assert.deepEqual(intents,[]);assert.equal(g.save(),saved);
    key('Escape');assert.equal(dom.root.querySelector('.map-dialog'),null);assert.equal(dom.document.activeElement,opener);assert.equal(view.blocksGameInput(),false);
    opener.click();dom.root.querySelector('[data-focus="map:close"]').click();assert.equal(g.save(),saved);
    key('ArrowRight');assert.deepEqual(intents,[{type:'move',direction:'right'}]);
    dom.root.querySelector('.map-expand').click();view.destroy();assert.equal(dom.root.querySelector('.map-dialog'),null);assert.equal(dom.root.children.some(e=>e.inert),false);
  }finally{view?.destroy();dom.restore();}
});
