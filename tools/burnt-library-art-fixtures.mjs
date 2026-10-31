import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';
export const books=['medicine','family','language'];
export const q137Roles=['el','librarian','firefighter'];
export const previousQ137=await read('tests/fixtures/e2-q137-before-cast.json');
export const previousQ137Data={...data,quests:{...data.quests,q137:previousQ137},scripts:{...data.scripts,...previousQ137.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q137_')))};
export const acceptedQ137=data.previousQuestRoutes.q137;
export const acceptedQ137Data={...previousQ137Data,quests:{...previousQ137Data.quests,q137:acceptedQ137},scripts:{...previousQ137Data.scripts,...acceptedQ137.scripts}};
export const q137Routes=[{path:['close','finish'],outcome:'close',book:'none',pages:0},...books.flatMap(book=>[
 {path:[book,'page','page','page','carry_'+book,'finish'],outcome:book,book,pages:3},
 {path:[book,'page','page','page','prepare','request','finish'],outcome:'prepare',book,pages:3},
 ...[0,1,2,3].map(pages=>({path:[book,...Array(pages).fill('page'),'close','seal','finish'],outcome:'close',book,pages}))
])];
export const q137AcceptedRoutes=q137Routes.map(r=>({...r,path:r.path.filter(x=>!['finish','seal','request'].includes(x))}));
export const q137Cast=scene=>scene==='entry'?['q137_el','q137_librarian','q137_firefighter']:scene==='closed'?['q137_librarian']:[];
export function q137PeopleAt(state){if(state.journey?.quest==='q137'&&['entry_close','replace_book_seal'].includes(state.journey.action))return 'transit';return state.stories.q137.events.some(e=>['entry_close','replace_book_seal'].includes(e))?'exit':'entry';}
export function upgradedQ137Save(raw){const save=JSON.parse(raw),s=save.state.stories.q137;s.revision=2;for(const role of q137Roles)s.values[role+'At']=q137PeopleAt(save.state);return save;}
export function q137Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ137Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q137');return g;}
export function q137AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ137Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q137'));
 if(entered){const p=acceptedQ137.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon??'region_4',map:p.map,x:p.x,y:p.y});}
 if(started)g.run(acceptedQ137.model.entryScript??'q137.visit');return g;
}
export function q137AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
function options(scene,book,pages){return scene==='read'?{availableChoice:pages<3?'page':'carry_'+book,blockedChoices:pages<3?['carry_'+book,'prepare']:['page']}:{availableChoice:{entry:'medicine',replace_book:'seal',prepare_book:'request',requested:'finish',closed:'finish',carry_medicine:'finish',carry_family:'finish',carry_language:'finish'}[scene]};}
function prose(q,scene,pages){const t=q.model.graph.find(n=>n.id===scene).text;return typeof t==='string'?t:pages>=3?t[0].yes:t[0].no;}
function variant(scene,book,pages){return scene==='entry'?'':scene==='read'?`-${book}-${pages}`:scene==='closed'?(book==='none'?'-direct':'-returned'):['replace_book','prepare_book','requested'].includes(scene)?'-'+book:'';}
export async function burntLibraryArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});for(const id of q137Cast('entry'))assert.equal(first.characters[id],undefined);assert.deepEqual(first.quests.q137,await read('data/quests/q137.json'));
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const s=g.state.stories.q137,{book,pages}=s.values,scene=s.scene,suffix=variant(scene,book,pages),key=scene+suffix;if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ137Save(raw));else assert.equal(current.save(),raw);checkpoint(current);
   for(const role of q137Roles)assert.equal(current.state.stories.q137.values[role+'At'],q137PeopleAt(current.state));assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),q137Cast(scene));
   const faces=Object.fromEntries(q137Cast(scene).filter(id=>id!=='q137_firefighter').map(id=>[id,id==='q137_el'?[.50,.075,.57,.105]:[.42,.065,.49,.10]]));
   fixtures.push({edition:'e2',quest:'q137',scene,variant:(legacy?'migrated':'current')+suffix,cast:q137Cast(scene),textOnlyCast:scene==='entry'?['q137_firefighter']:[],save:current.save(),...(Object.keys(faces).length?{faces,clearOfHud:true}:{}),...options(scene,book,pages),expectedText:prose(previousQ137,scene,pages)});
  };
  for(const route of q137Routes){const g=q137Engine({legacy});capture(g);for(const action of route.path){choose(g,'q137',action);if(g.state.quests.q137.stage!=='completed')capture(g);}assert.equal(g.state.quests.q137.outcome,route.outcome);outcomes.add('e2/q137/'+route.outcome);}
  assert.equal(seen.size,27);
 }
 const seen=new Set(),capture=g=>{
  const s=g.state.flags.quest.q137,scene=s.node,key=scene+variant(scene,s.book,s.pages);if(seen.has(key))return;seen.add(key);
  const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q137,true);assert.equal(current.state.stories.q137,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q137',scene,variant:'accepted-legacy'+variant(scene,s.book,s.pages),cast:[],absentStoryScene:true,save:current.save(),...options(scene,s.book,s.pages),expectedText:prose(acceptedQ137,scene,s.pages)});
 };
 for(const route of q137AcceptedRoutes){const g=q137AcceptedEngine();drain(g);capture(g);for(const action of route.path){q137AcceptedChoose(g,action);if(g.state.quests.q137.stage!=='completed')capture(g);}assert.equal(g.state.quests.q137.outcome,route.outcome);outcomes.add('e2/q137/'+route.outcome);}
 assert.equal(seen.size,13);return {fixtures,outcomes:[...outcomes]};
}
