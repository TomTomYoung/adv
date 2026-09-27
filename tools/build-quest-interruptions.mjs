import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const ref=ref=>({ref}),and=args=>args.length===1?args[0]:{op:'and',args};
const resourceTest=c=>c?.op==='has_item'||c?.op==='gte'&&c.left?.ref==='gold'&&Number.isFinite(c.right);
const terms=c=>c?.op==='and'?c.args.flatMap(terms):c===undefined?[]:[c];
// Costs remain on the original action. This compiles a separate, non-paying
// route and an explicit re-entry script for that exact unfinished scene.
export function compileQuestInterruptions(q,items){
 const old=q.model.interruptionRoutes??[],pending=`flags.questResume.${q.id}`;
 for(const r of old){delete q.scripts[r.shortage];delete q.scripts[r.resume];}
 for(const [id,script] of Object.entries(q.scripts)){
  // A preceding generator may have rebuilt this entry while retaining model metadata.
  if(q.model.interruptionEntries?.includes(id)&&script.commands[0]?.op==='switch'&&script.commands[0].value?.ref===pending)script.commands=script.commands[0].default;
 }
 delete q.model.interruptionEntries;
 const routes=[];
 function walk(value,scriptId){
  if(Array.isArray(value)){for(const c of value)walk(c,scriptId);return;}
  if(!value||typeof value!=='object')return;
  if(value.op==='choice'){
   value.options=value.options.filter(o=>o.id!=='pause'&&!old.some(r=>r.option===o.id&&r.from===scriptId));
   for(const o of [...value.options]){
    const conditions=terms(o.condition),costTests=conditions.filter(resourceTest),cost={};
    for(const c of costTests)cost[c.op==='has_item'?c.item:'gold']=c.op==='has_item'?(c.count??1):c.right;
    Object.assign(cost,q.story?.actions[o.storyAction?.action]?.cost??{});
    if(!Object.keys(cost).length)continue;
    const enough=and(Object.entries(cost).map(([item,n])=>item==='gold'?{op:'gte',left:ref('gold'),right:n}:{op:'has_item',item,count:n}));
    const lacking={op:'not',arg:enough},eligible=and([...conditions.filter(c=>!resourceTest(c)),lacking]);
    const id=`${scriptId}.${o.id}`,shortage=`${id}.shortage`,resume=`${id}.resume`,option=`${o.id}_supplies`;
    if(q.scripts[shortage]||q.scripts[resume]||value.options.some(o=>o.id===option))throw Error(`Interruption route collision: ${id}`);
    const supplies=Object.entries(cost).map(([item,n])=>item==='gold'?`${n}G`:`${items[item]?.name??item}${n}個`).join('・');
    const text=`${supplies}が足りない。この作業はまだ行っていない。必要な品と費用をそろえてから、ここで続けよう。`;
    q.scripts[shortage]={commands:[{op:'set',target:pending,value:resume},{op:'say',text}]};
    q.scripts[resume]={commands:[{op:'set',target:pending,value:null},{op:'say',text:`${supplies}を使う作業の続きだ。準備を確かめよう。`},{op:'jump',script:scriptId}]};
    value.options.push({id:option,text:`${supplies}を用意しに戻る`,condition:eligible,visibleWhen:o.visibleWhen===undefined?eligible:and([o.visibleWhen,eligible]),commands:[{op:'jump',script:shortage}]});
    routes.push({from:scriptId,action:o.id,option,shortage,resume,cost});
   }
  }
  for(const c of Object.values(value))walk(c,scriptId);
 }
 for(const [id,s] of Object.entries(q.scripts))walk(s.commands,id);
 if(routes.length){
  for(const [id,s] of Object.entries(q.scripts))if(id.endsWith('.visit')){
   s.commands=[{op:'switch',value:ref(pending),cases:routes.map(r=>({equals:r.resume,commands:[{op:'jump',script:r.resume}]})),default:s.commands}];(q.model.interruptionEntries??=[]).push(id);
  }
  q.model.interruptionRoutes=routes;
 }else delete q.model.interruptionRoutes;
 return q;
}

export async function buildQuestInterruptions(root=path.resolve(import.meta.dirname,'..')){
 const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
 const game=await read('data/game.json'),items=await read('data/items.json');let count=0;
 for(const file of game.files.quests){const q=compileQuestInterruptions(await read(file),items);count+=q.model.interruptionRoutes?.length??0;await fs.writeFile(path.join(root,file),JSON.stringify(q,null,2)+'\n');}
 console.log(`Quest interruption routes: ${count}; shared pause choices removed`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildQuestInterruptions();
