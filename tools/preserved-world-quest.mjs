import fs from 'node:fs/promises';
import {ref, eq, and, or} from '../authoring/story-kit.mjs';
import {compileQuestInterruptions} from './build-quest-interruptions.mjs';

function narrate(text) {
  if (Array.isArray(text)) return text.flatMap(narrate);
  if (typeof text === 'string') return [{op:'narrate',text}];
  return [{op:'if',condition:text.when,then:narrate(text.yes),else:narrate(text.no)}];
}

export function compilePreservedWorldQuest(original, items, source, namespace) {
  const q = structuredClone(original);
  const {id} = q;
  const sid = node => id+'.'+namespace+'.'+node;
  const jump = node => ({op:'jump',script:sid(node)});
  const completed = eq(ref('quests.'+id+'.stage'),'completed');
  const preserved = eq(ref('flags.legacyStoryRoutes.'+id),true);
  const current = eq(ref('flags.currentStoryRoutes.'+id),true);
  q.story = source.story;
  const units = source.nodes.map(n => ({id:n.id,script:sid(n.id),assertion:q.story.scenes[n.id]}));
  q.model = {
    ...q.model, source:'authoring/editions/e2/story-'+id+'.mjs', revision:'scenario-edition-e2-'+id+'-r1',
    edition:{id:'e2',revision:1,inherits:'e1'}, entryScript:sid('visit'), preserveAcceptedRoute:true,
    currentStoryScriptPrefix:sid(''), narrative:{...q.model.narrative,units},
    graph:source.nodes.map(n => ({id:n.id,text:n.text,options:n.options.map(o => ({
      id:o.id,text:o.text,to:o.to,action:o.action,...(o.combat && {combat:true}),...(o.when && {when:o.when}),...(o.visibleWhen!==undefined && {visibleWhen:o.visibleWhen})
    }))})),
    stateRegistry:Object.entries(q.story.registry).map(([key,value]) => ({
      path:'stories.'+id+'.values.'+key,...value,writer:'story.action',scope:'quest',lifetime:'保存・再開・完了後まで保持'
    }))
  };
  q.model.beats = units;
  q.model.standard = {id:'game-scenario-model',version:'1.1',source:'https://app.notion.com/p/v1-1-3dac3c1966b38069ab3bf87729e453c4',adapter:'adv-story-state/1',scope:'quest-episode'};
  delete q.model.progressionUpgrade;
  delete q.model.interruptionRoutes;
  delete q.model.interruptionEntries;
  q.scripts = {};
  function choice(o) {
    const action = q.story.actions[o.action];
    const local = [{op:'story.action',quest:id,action:o.action},jump(o.to.startsWith('@')?'end.'+o.to.slice(1):o.to)];
    let commands = local;
    if (action.journey) commands = [{op:'story.journey',quest:id,action:o.action}];
    if (o.combat) commands = [{op:'battle.start',encounter:o.combat,on_win:local,
      on_escape:[{op:'narrate',text:'退路へ戻った。戦闘後に予定していた作業は、まだ成立していない。'}],
      on_lose:[{op:'narrate',text:'救助班に運び出された。現場へ戻ると直前の場面から再開できる。'}]}];
    const requirements=o.costRequirement?[o.costRequirement]:Object.entries(action.cost??{}).map(([item,n])=>item==='gold'?n+'Gを支払う。':items[item].name+n+'個を使う。');
    if(o.combat) requirements.push(o.combatRequirement??'戦闘に勝つと次の場面へ進む。');
    return {id:o.id,text:o.text,storyAction:{quest:id,action:o.action},...(o.when && {condition:o.when}),
      ...(o.visibleWhen!==undefined && {visibleWhen:o.visibleWhen}),requirement:requirements.join(' '),commands};
  }
  for (const node of source.nodes) {
    q.scripts[sid(node.id)] = {storyQuest:id,commands:[
      {op:'story.scene',quest:id,scene:node.id},...narrate(node.text),{op:'choice',options:node.options.map(choice)}
    ]};
  }
  for (const [key,o] of Object.entries(q.outcomes)) {
    o.requires=q.story.endings[key];
    q.scripts[sid('end.'+key)]={commands:[{op:'quest.complete',quest:id,outcome:key},{op:'add',target:'vars.'+key,value:1},{op:'narrate',text:o.text}]};
  }
  const endings = Object.entries(q.outcomes).map(([key,o])=>({equals:key,commands:[{op:'narrate',text:o.text}]}));
  const scenes = source.nodes.map(n=>({equals:n.id,commands:[jump(n.id)]}));
  q.scripts[sid('visit')] = {commands:[{op:'if',condition:completed,
    then:[{op:'switch',value:ref('quests.'+id+'.outcome'),cases:endings,default:[]}],
    else:[{op:'story.init',quest:id},{op:'switch',value:ref('stories.'+id+'.scene'),cases:scenes,default:[jump('entry')]}]}]};
  compileQuestInterruptions(q,items);
  const visit=q.scripts[sid('visit')];
  visit.commands=[{op:'if',condition:preserved,then:[{op:'jump',script:original.model.entryScript??id+'.visit'}],else:visit.commands}];
  q.scripts={...structuredClone(original.scripts),...q.scripts};
  for (const field of ['interruptionRoutes','interruptionEntries'])
    q.model[field]=[...(original.model[field]??[]),...(q.model[field]??[])];
  const active=or(eq(ref('quests.'+id+'.stage'),'active'),completed);
  q.events=q.events.map(e=>e.trigger==='action'?e:{...e,visibleWhen:and(e.visibleWhen??true,preserved)});
  for(const [key,p] of Object.entries(q.story.worldPlaces)){
    if(p.kind!=='dungeon') continue;
    const {kind,event,...point}=p;
    q.events.push({id:event,title:q.title+'：'+q.story.places[key],points:[point],kind:'decision',trigger:'interact',
      interactionRange:'here',safe:true,script:sid('visit'),role:'decision',visibleWhen:and(active,current),dungeon:p.dungeon});
  }
  return q;
}

export async function buildPreservedWorldFile(id,compile,{check=false}={}) {
  const readJSON=async path=>JSON.parse(await fs.readFile(new URL('../'+path,import.meta.url),'utf8'));
  const quest=compile(await readJSON('data/quests/'+id+'.json'),await readJSON('data/items.json'));
  const path=new URL('../data/scenario-editions/e2/'+id+'.json',import.meta.url);
  const text=JSON.stringify(quest,null,2)+'\n';
  if(check) {
    if(await fs.readFile(path,'utf8')!==text) throw Error(id+' world route generation differs');
  } else await fs.writeFile(path,text);
  return quest;
}
