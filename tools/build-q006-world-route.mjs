import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {wageBoxSource} from '../authoring/editions/e2/story-q006.mjs';
import {ref,eq,and,or} from '../authoring/story-kit.mjs';
import {compileQuestInterruptions} from './build-quest-interruptions.mjs';

const root=path.resolve(import.meta.dirname,'..'),sid=node=>`q006.wagebox.${node}`;
export function buildWageBoxQuest(first,items){
  const q=structuredClone(first),s=wageBoxSource();q.story=s.story;
  q.model={...q.model,source:'authoring/editions/e2/story-q006.mjs',revision:'scenario-edition-e2-q006-r2',edition:{id:'e2',revision:2,inherits:'e1'},entryScript:sid('visit'),preserveAcceptedRoute:true,preserveAcceptedStory:true,currentStoryScriptPrefix:'q006.wagebox.',
    narrative:{...q.model.narrative,units:s.nodes.map(n=>({id:n.id,script:sid(n.id),assertion:q.story.scenes[n.id]}))},
    graph:s.nodes.map(n=>({id:n.id,text:n.text,options:n.options.map(o=>({id:o.id,text:o.text,to:o.to,action:o.action,...(o.combat?{combat:true}:{}),...(o.when?{when:o.when}:{})}))})),
    stateRegistry:Object.entries(q.story.registry).map(([key,value])=>({path:`stories.q006.values.${key}`,...value,writer:'story.action',scope:'quest',lifetime:'保存・再開・完了後まで保持'}))};
  q.model.beats=q.model.narrative.units;
  delete q.model.interruptionRoutes;delete q.model.interruptionEntries;
  q.scripts={};
  for(const n of s.nodes){
    const options=n.options.map(o=>{
      const local=[{op:'story.action',quest:q.id,action:o.action},{op:'jump',script:sid(o.to.startsWith('@')?'end.'+o.to.slice(1):o.to)}];
      const commands=q.story.actions[o.action].journey?[{op:'story.journey',quest:q.id,action:o.action}]:o.combat?[{op:'battle.start',encounter:'guard_1',on_win:local,on_escape:[{op:'narrate',text:'浅瀬から距離を取った。箱は引き揚げておらず、縄もまだ使っていない。'}],on_lose:[{op:'narrate',text:'現場から救援された。箱の回収と縄の消費はまだ確定していない。'}]}]:local;
      const requirement=[...Object.entries(q.story.actions[o.action].cost??{}).map(([item,count])=>`${items[item].name}${count}個を使う。`),...(o.combat?['戦闘・縄の消費と回収は勝利時に確定。']:[])].join(' ');
      return {id:o.id,text:o.text,storyAction:{quest:q.id,action:o.action},...(o.when?{condition:o.when}:{}),requirement,commands};
    });
    q.scripts[sid(n.id)]={storyQuest:q.id,commands:[{op:'story.scene',quest:q.id,scene:n.id},{op:'narrate',text:n.text},{op:'choice',options}]};
  }
  for(const [key,o] of Object.entries(q.outcomes))q.scripts[sid('end.'+key)]={commands:[{op:'quest.complete',quest:q.id,outcome:key},{op:'add',target:'vars.'+key,value:1},{op:'narrate',text:o.text}]};
  q.scripts[sid('visit')]={commands:[{op:'if',condition:eq(ref('quests.q006.stage'),'completed'),then:[{op:'switch',value:ref('quests.q006.outcome'),cases:Object.entries(q.outcomes).map(([key,o])=>({equals:key,commands:[{op:'narrate',text:o.text}]})),default:[]}],else:[{op:'story.init',quest:q.id},{op:'switch',value:ref('stories.q006.scene'),cases:s.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]};
  compileQuestInterruptions(q,items);
  q.scripts={...structuredClone(first.scripts),...q.scripts};
  q.model.interruptionRoutes=[...(first.model.interruptionRoutes??[]),...(q.model.interruptionRoutes??[])];
  q.model.interruptionEntries=[...(first.model.interruptionEntries??[]),...(q.model.interruptionEntries??[])];
  const preserved=eq(ref('flags.preservedStoryRoutes.q006'),true),current=eq(ref('flags.currentStoryRoutes.q006'),true),active=or(eq(ref('quests.q006.stage'),'active'),eq(ref('quests.q006.stage'),'completed'));
  q.events=q.events.map(e=>({...e,visibleWhen:and(e.visibleWhen??true,preserved)}));
  for(const [key,p] of Object.entries(q.story.worldPlaces)){
    const {kind,event,...point}=p;
    q.events.push({id:event,title:'沈んだ給金箱：'+q.story.places[key],points:[point],kind:'decision',trigger:'interact',interactionRange:'here',safe:true,script:sid('visit'),role:'decision',visibleWhen:and(active,current),dungeon:'region_1'});
  }
  return q;
}
export async function buildWageBox({check=false}={}){
  const first=JSON.parse(await fs.readFile(path.join(root,'data/quests/q006.json'),'utf8')),items=JSON.parse(await fs.readFile(path.join(root,'data/items.json'),'utf8'));
  const q=buildWageBoxQuest(first,items),file=path.join(root,'data/scenario-editions/e2/q006.json'),text=JSON.stringify(q,null,2)+'\n';
  if(check){if(await fs.readFile(file,'utf8').catch(()=>null)!==text)throw Error('q006 world route generation differs');}else await fs.writeFile(file,text);
  return q;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildWageBox({check:process.argv.includes('--check')});
