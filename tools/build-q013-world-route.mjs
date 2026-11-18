import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {breathingVeinSource} from '../authoring/editions/e2/story-q013.mjs';
import {ref,eq,and,or} from '../authoring/story-kit.mjs';
import {compileQuestInterruptions} from './build-quest-interruptions.mjs';

const render=t=>Array.isArray(t)?t.flatMap(render):typeof t==='string'?[{op:'narrate',text:t}]:[{op:'if',condition:t.when,then:render(t.yes),else:render(t.no)}];
const root=path.resolve(import.meta.dirname,'..'),sid=node=>`q013.breathingvein.${node}`;
export function buildBreathingVeinQuest(first,items){
  const q=structuredClone(first),s=breathingVeinSource();q.story=s.story;
  q.model={...q.model,source:'authoring/editions/e2/story-q013.mjs',revision:'scenario-edition-e2-q013-r1',edition:{id:'e2',revision:1,inherits:'e1'},entryScript:sid('visit'),preserveAcceptedRoute:true,currentStoryScriptPrefix:'q013.breathingvein.',
    narrative:{...q.model.narrative,units:s.nodes.map(n=>({id:n.id,script:sid(n.id),assertion:q.story.scenes[n.id]}))},
    graph:s.nodes.map(n=>({id:n.id,text:n.text,options:n.options.map(o=>({id:o.id,text:o.text,to:o.to,action:o.action,...(o.combat?{combat:true}:{}),...(o.when?{when:o.when}:{})}))})),
    stateRegistry:Object.entries(q.story.registry).map(([key,value])=>({path:`stories.q013.values.${key}`,...value,writer:'story.action',scope:'quest',lifetime:'保存・再開・完了後まで保持'}))};
  q.model.beats=q.model.narrative.units;
  q.model.standard={id:'game-scenario-model',version:'1.1',source:'https://app.notion.com/p/v1-1-3dac3c1966b38069ab3bf87729e453c4',adapter:'adv-story-state/1',scope:'quest-episode'};
  delete q.model.progressionUpgrade;
  for(const [key,o] of Object.entries(q.outcomes))o.requires=q.story.endings[key];
  delete q.model.interruptionRoutes;delete q.model.interruptionEntries;
  q.scripts={};
  for(const n of s.nodes){
    const options=n.options.map(o=>{
      const local=[{op:'story.action',quest:q.id,action:o.action},{op:'jump',script:sid(o.to.startsWith('@')?'end.'+o.to.slice(1):o.to)}];
      const commands=q.story.actions[o.action].journey?[{op:'story.journey',quest:q.id,action:o.action}]:local;
      const requirement=Object.entries(q.story.actions[o.action].cost??{}).map(([item,count])=>`${items[item].name}${count}個を使う。`).join(' ');
      return {id:o.id,text:o.text,storyAction:{quest:q.id,action:o.action},...(o.when?{condition:o.when}:{}),requirement,commands};
    });
    q.scripts[sid(n.id)]={storyQuest:q.id,commands:[{op:'story.scene',quest:q.id,scene:n.id},...render(n.text),{op:'choice',options}]};
  }
  for(const [key,o] of Object.entries(q.outcomes))q.scripts[sid('end.'+key)]={commands:[{op:'quest.complete',quest:q.id,outcome:key},{op:'add',target:'vars.'+key,value:1},{op:'narrate',text:o.text}]};
  q.scripts[sid('visit')]={commands:[{op:'if',condition:eq(ref('quests.q013.stage'),'completed'),then:[{op:'switch',value:ref('quests.q013.outcome'),cases:Object.entries(q.outcomes).map(([key,o])=>({equals:key,commands:[{op:'narrate',text:o.text}]})),default:[]}],else:[{op:'story.init',quest:q.id},{op:'switch',value:ref('stories.q013.scene'),cases:s.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]};
  compileQuestInterruptions(q,items);
  q.scripts[sid('visit')].commands=[{op:'if',condition:eq(ref('flags.legacyStoryRoutes.q013'),true),then:[{op:'jump',script:first.model.entryScript}],else:q.scripts[sid('visit')].commands}];
  q.scripts={...structuredClone(first.scripts),...q.scripts};
  q.model.interruptionRoutes=[...(first.model.interruptionRoutes??[]),...(q.model.interruptionRoutes??[])];
  q.model.interruptionEntries=[...(first.model.interruptionEntries??[]),...(q.model.interruptionEntries??[])];
  const preserved=eq(ref('flags.legacyStoryRoutes.q013'),true),current=eq(ref('flags.currentStoryRoutes.q013'),true),active=or(eq(ref('quests.q013.stage'),'active'),eq(ref('quests.q013.stage'),'completed'));
  q.events=q.events.map(e=>e.trigger==='action'?e:({...e,visibleWhen:and(e.visibleWhen??true,preserved)}));
  for(const [key,p] of Object.entries(q.story.worldPlaces)){
    if(p.kind!=='dungeon')continue;
    const {kind,event,...point}=p;
    q.events.push({id:event,title:'呼吸する鉱脈：'+q.story.places[key],points:[point],kind:'decision',trigger:'interact',interactionRange:'here',safe:true,script:sid('visit'),role:'decision',visibleWhen:and(active,current),dungeon:'region_2'});
  }
  return q;
}
export async function buildBreathingVein({check=false}={}){
  const first=JSON.parse(await fs.readFile(path.join(root,'data/quests/q013.json'),'utf8')),items=JSON.parse(await fs.readFile(path.join(root,'data/items.json'),'utf8'));
  const q=buildBreathingVeinQuest(first,items),file=path.join(root,'data/scenario-editions/e2/q013.json'),text=JSON.stringify(q,null,2)+'\n';
  if(check){if(await fs.readFile(file,'utf8').catch(()=>null)!==text)throw Error('q013 world route generation differs');}else await fs.writeFile(file,text);
  return q;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildBreathingVein({check:process.argv.includes('--check')});
