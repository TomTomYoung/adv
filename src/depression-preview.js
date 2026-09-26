import {beginFeedback} from './core/feedback.js';
// Isolated authoring preview: real presets, projection and renderer; no saved game.
import {loadContent} from './core/loader.js';
import {GameEngine} from './core/engine.js';
import {projectGame} from './application/projection.js';
import {paintDungeon} from './view/dungeon.js';
const data=await loadContent(),game=new GameEngine(data),map=data.maps.region_2_f1;
while(game.state.waiting?.type==='text')game.dispatch({type:'advance'});
map.objects=[];map.encounterRate=0;
const ids=['shallow_depression','deep_depression','bottomless_depression','shallow_depression_water','deep_depression_water','bottomless_depression_water'];
const shape=document.querySelector('#shape'),facing=document.querySelector('#facing'),light=document.querySelector('#light'),canvas=document.querySelector('#preview');
let selected=ids[0];
function render(){
 const rows=Array.from({length:9},(_,y)=>Array.from({length:9},(_,x)=>x===0||y===0||x===8||y===8?'W':'F'));
 const points={single:[[4,4]],pair:[[3,4],[4,4]],square:[[3,3],[4,3],[3,4],[4,4]],elbow:[[3,3],[3,4],[4,4]],mixed:[[3,3],[4,3],[5,3],[3,4],[4,4],[5,4]]}[shape.value];
 const wet=selected.endsWith('_water');
 for(const [x,y] of points)rows[y][x]=String(shape.value==='mixed'?ids.indexOf(['shallow','deep','bottomless'][x-3]+'_depression'+(wet?'_water':'')):ids.indexOf(selected));
 map.cells={legend:{W:'stone_wall',F:'stone_floor',...Object.fromEntries(ids.map((id,i)=>[i,id]))},rows:rows.map(row=>row.join('')),overrides:{}};
 map.tiles=map.cells.rows.map(row=>[...row].map(c=>data.cellTypes[map.cells.legend[c]].passage).join(''));
 const [x,y]={north:[4,6],east:[1,4],south:[4,1],west:[6,4]}[facing.value];
 beginFeedback(game);game.teleport(map.id,x,y,facing.value);
 const model=projectGame(game);
 model.dungeon.objects=[];
 for(const row of model.dungeon.cells)for(const cell of row)cell.illumination=Number(light.value);
 paintDungeon(canvas,model.dungeon,null);
 for(const b of document.querySelectorAll('[data-preset]'))b.setAttribute('aria-pressed',String(b.dataset.preset===selected));
 document.querySelector('#description').textContent=data.cellTypes[selected].description;
 document.querySelector('#status').textContent='表示確認専用です。冒険の記録やマップ原稿は変更しません。';
}
for(const id of ids){const b=document.createElement('button');b.textContent=data.cellTypes[id].name;b.dataset.preset=id;b.addEventListener('click',()=>{selected=id;render();});document.querySelector('#types').append(b);}
for(const control of [shape,facing,light])control.addEventListener('input',render);
render();
