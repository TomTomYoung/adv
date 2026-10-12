// Authoring presets compile into the existing script VM; no parallel event engine.
export const TRAP_NAMES={rockfall:'落石',cave_in:'落盤',needle:'針',arrow:'矢',gas:'ガス',magic_circle:'魔法陣',pit:'落とし穴',explosion:'爆発',drip:'落滴'};
export function compileTrap(spec){
  if(!spec||!Object.hasOwn(TRAP_NAMES,spec.kind)||Object.keys(spec).some(k=>!['kind','message','damage','target','statuses','patches','extinguish','destination','encounter','script'].includes(k))||spec.kind==='cave_in'&&!spec.patches?.length||spec.kind==='pit'&&!spec.destination||['cave_in','explosion'].includes(spec.kind)&&!Array.isArray(spec.patches)||spec.message!==undefined&&spec.message!==false&&typeof spec.message!=='string')throw Error('トラップパッケージが不正です');
  const target=spec.target??'party',defaults={needle:[{status:'weakened'}],arrow:[{status:'weakened'}],gas:[{status:'enfeebled'}],magic_circle:spec.encounter?[]:[{status:'arcane_malaise'}]};
  const damage=spec.damage??({rockfall:8,cave_in:24,arrow:6,explosion:24}[spec.kind]??0);
  const impact={op:'hazard.impact',target,damage,statuses:spec.statuses??defaults[spec.kind]??[],patches:spec.patches??[],extinguish:spec.kind==='drip'?(spec.extinguish??['portable']):[]};
  const commands=[impact];
  if(spec.destination)commands.push({op:'map.teleport',...spec.destination});
  if(spec.encounter)commands.push({op:'battle.start',encounter:spec.encounter,on_win:[],on_lose:[],on_escape:[]});
  if(spec.script)commands.push({op:'call',script:spec.script,args:{map:{ref:'local.args.map'},x:{ref:'local.args.x'},y:{ref:'local.args.y'},event:{ref:'local.args.event'}}});
  if(spec.message!==false)commands.push({op:'narrate',text:spec.message??`${TRAP_NAMES[spec.kind]}が発生した。`});
  return commands;
}
export function compileCellPackages(source){
  const result=structuredClone(source);
  for(const [id,event] of Object.entries(result.events))if(event.package){
    const script=`cell.package.${id}`;if(result.scripts[script])throw Error(`生成処理IDが重複しています: ${script}`);
    result.scripts[script]={commands:compileTrap(event.package)};
    event.trap=JSON.parse(JSON.stringify(event.package));delete event.package;event.script=script;
  }
  return result;
}
export function compileTreasure(map,object){
  const t=object.treasure,script=`treasure.package.${map}.${object.id}`;
  const commands=[{op:'treasure.collect',map,object:object.id}];
  const effects=t.trap?compileTrap(t.trap):[];
  commands.push({op:'if',condition:{ref:'local.collected'},then:[{op:'narrate',text:{format:'{receipt}',values:{receipt:{ref:'local.receipt'}}}},...effects],else:[{op:'narrate',text:{format:'{receipt}',values:{receipt:{ref:'local.receipt'}}}}]});
  return {script,commands};
}
export function compileServiceLocations(locations,generated={services:[],scripts:{}}){
  const result=structuredClone(locations);
  for(const location of Object.values(result))if(location.package){
    const p=location.package;
    if(!['merchant','rest','camp','services'].includes(p.kind)||Object.keys(p).some(k=>!['kind','services','shop','rest'].includes(k))||!Array.isArray(p.services))throw Error(`サービスパッケージが不正です: ${location.id}`);
    location.services=[...new Set(p.services)];location.shop=p.shop??p.kind==='merchant';
    if(p.rest){
      const {cost,ratio}=p.rest;if(Object.keys(p.rest).some(k=>!['cost','ratio'].includes(k))||!Number.isSafeInteger(cost)||cost<0||cost>1e9||!Number.isFinite(ratio)||ratio<=0||ratio>1)throw Error(`休息の費用・回復率が不正です: ${location.id}`);
      const id=`package_rest_${location.id}`,script=`service.package.${location.id}.rest`;
      generated.services.push({id,label:'休息する',detail:`${cost}GでHP・MPを最大値の${Math.round(ratio*100)}%まで回復し、状態異常を解除する。`,script,interior:true});
      generated.scripts[script]={commands:[{op:'if',condition:{op:'gte',left:{ref:'gold'},right:cost},then:[{op:'rest',cost,ratio},{op:'narrate',text:'休息を終え、旅支度を整えた。'}],else:[{op:'narrate',text:`休息には${cost}Gが必要だ。`}]}]};location.services.push(id);
    }
    delete location.package;
  }
  return result;
}
