import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {skillLevel,effectiveSkill,recordSkillUse,recordSkillAction,advanceSkills,trainSkill,skillGrowthView} from '../src/core/skill-levels.js';
import {fieldActionPlan} from '../src/core/jobs.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {validateSchema} from '../config/shared/schema.js';
import {createDefinitions} from '../config/shared/validation.js';
import {projectGame} from '../src/application/projection.js';
function game(){const d=structuredClone(data),g=new GameEngine(d);drain(g);return {g,d};}
function condition(g,c){g.data.fieldAbilities.trap_detect.levelUp={'2':c};}
const roundtrip=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),g.data),[]);g.load(text);assert.equal(g.save(),text);};
test('character unlock and skill level are independent; shared skill progression survives job change',()=>{
  const {g}=game();g.award(0,data.system.xpBase*9*10);assert.equal(g.state.actors.nio.level,10);assert.equal(skillLevel(g.state,'nio','recon'),1);
  g.state.actors.nio.skillProgress={trap_disarm:{level:2,uses:5}};
  assert.ok(g.dispatch({type:'job.change',actor:'nio',job:'rogue'}));assert.equal(effectiveSkill(g.data,g.state,'nio','trap_disarm').recover,true);roundtrip(g);
  assert.equal(skillLevel(g.state,'ada','trap_disarm'),1);
});
for(const kind of ['actor_level','uses','weapon_uses','action_uses','event','flag','training','skill','companion'])test(`growth condition ${kind} composes with all/any and persists`,()=>{
  const {g,d}=game(),a=g.state.actors.nio;
  const conditions={actor_level:{level:2},uses:{skill:'trap_disarm',count:2},weapon_uses:{weapon:'iron_sword',count:1},action_uses:{action:'training_drill',count:1},event:{event:'test/done'},flag:{flag:'trained'},training:{count:1},skill:{skill:'trap_disarm',level:2},companion:{actor:'ren'}};
  condition(g,{all:[{kind,...conditions[kind]},{any:[{kind:'flag',flag:'approved'},{kind:'actor_level',level:30}]}]});
  advanceSkills(g,'nio');assert.equal(skillLevel(g.state,'nio','trap_detect'),1);
  g.state.flags.approved=true;
  if(kind==='actor_level')g.award(0,d.system.xpBase*2);
  if(kind==='uses')for(let i=0;i<2;i++)recordSkillUse(g,'nio','trap_disarm');
  if(kind==='weapon_uses')a.skillCounters={weapons:{iron_sword:1}};
  if(kind==='action_uses')recordSkillAction(g,'nio','training_drill');
  if(kind==='event')g.state.events['test/done']=1;
  if(kind==='flag')g.state.flags.trained=true;
  if(kind==='training')trainSkill(g,'nio','trap_detect');
  if(kind==='skill')a.skillProgress={trap_disarm:{level:2,uses:5}};
  if(kind==='companion')g.state.members.push('ren');
  advanceSkills(g,'nio');assert.equal(skillLevel(g.state,'nio','trap_detect'),2);advanceSkills(g,'nio');assert.equal(skillLevel(g.state,'nio','trap_detect'),2);roundtrip(g);
});
for(const on of ['skill','weapon','action'])test(`random growth only rolls on its ${on} event, never projection/save/load/walking`,()=>{
  const {g}=game(),id={skill:'trap_detect',weapon:'iron_sword',action:'training_drill'}[on];
  condition(g,{kind:'random',on,id,chance:.5});let rolls=0;g.random=()=>{rolls++;return .1;};
  for(let i=0;i<3;i++){projectGame(g);advanceSkills(g,'nio');roundtrip(g);}assert.equal(rolls,0);
  g.teleport('region_2_f1',1,1,'east');g.data.maps.region_2_f1.encounterRate=0;
  g.dispatch({type:'move',direction:'right'});assert.equal(rolls,0);
  recordSkillUse(g,'nio','guard');assert.equal(rolls,0);
  if(on==='skill')recordSkillUse(g,'nio',id);
  if(on==='weapon'){g.state.actors.nio.equipment.weapon=id;recordSkillUse(g,'nio','attack',{weapon:true});delete g.state.actors.nio.equipment.weapon;}
  if(on==='action')recordSkillAction(g,'nio',id);
  assert.equal(rolls,1);assert.equal(skillLevel(g.state,'nio','trap_detect'),2);roundtrip(g);assert.equal(rolls,1);
});
test('failed actions spend neither resources nor growth; level deltas change the real execution cost',()=>{
  const {g}=game();assert.equal(g.dispatch({type:'job.action',actor:'nio',ability:'trap_detect'}),false);assert.equal(g.state.actors.nio.skillProgress,undefined);
  g.teleport('region_2_f1',1,1);g.state.actors.nio.skillProgress={seek_enemy:{level:3,uses:15}};
  g.state.actors.nio.mp=0;assert.equal(fieldActionPlan(g.data,g.state,'nio','seek_enemy').ability.mp,0);
  assert.equal(g.dispatch({type:'job.action',actor:'nio',ability:'trap_detect'}),false);assert.equal(g.state.actors.nio.skillProgress.trap_detect,undefined);
});
test('growth display full/progress/hidden stays read-only and training is expressible in scripts',()=>{
  const {g,d}=game();condition(g,{all:[{kind:'uses',count:5},{kind:'companion',actor:'ada'}]});
  assert.match(skillGrowthView(d,g.state,'nio','trap_detect').growth,/アダ/);
  d.fieldAbilities.trap_detect.growthDisplay='progress';assert.doesNotMatch(skillGrowthView(d,g.state,'nio','trap_detect').growth,/アダ/);
  d.fieldAbilities.trap_detect.growthDisplay='hidden';assert.equal(skillGrowthView(d,g.state,'nio','trap_detect').growth,'');
  condition(g,{kind:'training',count:1});d.scripts.training={commands:[{op:'skill.train',actor:'nio',skill:'trap_detect'}]};g.run('training');assert.equal(skillLevel(g.state,'nio','trap_detect'),2);roundtrip(g);
});
test('save validation rejects unknown skills, impossible levels, negative counters and unknown counter IDs',()=>{
  const {g}=game(),base=JSON.parse(g.save());
  for(const p of [{unknown:{level:1,uses:0}},{trap_detect:{level:4,uses:0}},{trap_detect:{level:0,uses:0}},{trap_detect:{level:1,uses:-1}},{trap_detect:null}]){const s=structuredClone(base);s.state.actors.nio.skillProgress=p;assert.ok(validateSave(s,g.data).length);}
  for(const counters of [{actions:{unknown:1}},{training:{missing:1}},{weapons:{iron_sword:-1}},{weapons:{potion:1}},{invalid:{a:1}}]){const s=structuredClone(base);s.state.actors.nio.skillCounters=counters;assert.ok(validateSave(s,g.data).length);}
});
test('content and authoring schema reject malformed growth definitions',async()=>{
  const {d}=game();assert.deepEqual(validateContent(d),[]);
  for(const patch of [{maxSkillLevel:0},{levels:{'4':{radius:3}}},{levels:{'2':{api:'anything'}}},{levels:{'2':{radius:-1}}},{levelUp:{'2':{kind:'uses',skill:'missing',count:1}}},{levelUp:{'2':{kind:'random',on:'menu',id:'x',chance:2}}},{levelUp:{'2':{all:[]}}}]){const copy=structuredClone(d);Object.assign(copy.fieldAbilities.trap_detect,patch);assert.ok(validateContent(copy).length,JSON.stringify(patch));}
  const read=async p=>JSON.parse(await fs.readFile(new URL('../'+p,import.meta.url),'utf8')),source=await read('config/jobs.json'),schema=await createDefinitions(read)({family:'jobs',file:'jobs.json'});
  assert.deepEqual(validateSchema(source,schema),[]);source.fieldAbilities.trap_detect.levelUp['2']={kind:'random',on:'menu',id:'x',chance:2};assert.ok(validateSchema(source,schema).length);
});

test('growth condition editor selects all/any without losing the branch and creates a finite valid condition',async()=>{
 const {skillConditionSchema}=await import('../config/shared/skill-schemas.js'),{resolveSchema,initialValue}=await import('../config/shared/studio/schema-form.js');
 const root={$defs:{skillCondition:skillConditionSchema}},ref={$ref:'#/$defs/skillCondition'};
 assert.deepEqual(initialValue(ref,root),{kind:'actor_level',level:1});
 for(const key of ['all','any']){const c={[key]:[{kind:'uses',count:2}]};assert.ok(resolveSchema(ref,root,c).properties[key]);assert.deepEqual(validateSchema(c,{...root,...ref}),[]);}
});
