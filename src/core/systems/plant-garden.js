import {object,identifier,integer,closeTo} from './common.js';
import {empty,exact,pointsValid,pointValid,floorValid,patchValid,patchTile,patchCell,materialsValid,inventoryPlan,action,markers,panel,sameCell} from './environment.js';
const speciesOf=(ctx,plot)=>ctx.spec.species[ctx.persistent.plants[plot.id]?.species];
const mature=(ctx,plot)=>{const p=ctx.persistent.plants[plot.id];return p&&p.age>=ctx.spec.species[p.species].growth;};
function terrain(ctx){return ctx.spec.plots.flatMap(plot=>{const patches=mature(ctx,plot)?plot.terrain[speciesOf(ctx,plot).terrain]:null;return Array.isArray(patches)?patches:[];});}
function nearPlants(ctx){const loc=ctx.state.location;return ctx.spec.plots.filter(p=>mature(ctx,p)&&p.map===loc.map&&Math.abs(p.x-loc.x)+Math.abs(p.y-loc.y)<=speciesOf(ctx,p).radius);}
function tick(ctx){
  for(const [id,plant] of Object.entries(ctx.persistent.plants)){
    const species=ctx.spec.species[plant.species],plot=ctx.spec.plots.find(p=>p.id===id);
    if(plant.age>=species.growth)continue;
    // A barrier waits one step instead of growing through the party's current cell.
    if(plant.age+1>=species.growth&&(plot.terrain[species.terrain]??[]).some?.(p=>p.tile==='#'&&sameCell(p,ctx.state.location)))continue;
    plant.age++;if(plant.age===species.growth)ctx.engine.notify(`${plot.name}の${species.name}が生長しました。`);
  }
  for(const plot of nearPlants(ctx)){const amount=speciesOf(ctx,plot).heal??0;if(amount)for(const id of ctx.state.members){const a=ctx.state.actors[id];if(a.hp>0)a.hp=Math.min(ctx.engine.stats(id).hp,a.hp+amount);}}
}
function plan(ctx,intent){
  if(intent.action==='wait')return {ok:true};
  if(intent.action==='supplies'){
    if(!closeTo(ctx.state,ctx.spec.supply)||ctx.persistent.supplied)return {ok:false,reason:'育苗箱は入口にあります。一度だけ受け取れます。'};
    return inventoryPlan(ctx,{},ctx.spec.supplies);
  }
  const plot=ctx.spec.plots.find(p=>p.id===intent.target),plant=ctx.persistent.plants[plot?.id],species=Object.hasOwn(ctx.spec.species,intent.species??'')?ctx.spec.species[intent.species]:null;
  if(!plot||!closeTo(ctx.state,plot))return {ok:false,reason:'足元か正面の植床を選んでください。'};
  if(intent.action==='plant'){
    if(plant)return {ok:false,reason:'先に採取・伐採してください。'};
    if(!species||species.terrain&&!plot.terrain[species.terrain])return {ok:false,reason:'この植床には適さない植物です。'};
    return {...inventoryPlan(ctx,species.materials),plot,species};
  }
  if(intent.action==='harvest'){
    if(!plant)return {ok:false,reason:'植物がありません。'};
    const s=ctx.spec.species[plant.species];
    const candidate={...ctx,persistent:{...ctx.persistent,plants:{...ctx.persistent.plants}}};delete candidate.persistent.plants[plot.id];
    const loc=ctx.state.location,now=patchTile(terrain(ctx),ctx.data.maps[loc.map],loc.x,loc.y),after=patchTile(terrain(candidate),ctx.data.maps[loc.map],loc.x,loc.y)??ctx.data.maps[loc.map].tiles[loc.y][loc.x];
    if(now==='.'&&after==='#')return {ok:false,reason:'橋から降りてから採取してください。'};
    return {...inventoryPlan(ctx,{},mature(ctx,plot)?s.harvest:s.immatureHarvest),plot};
  }
  if(intent.action==='climb'&&plant&&mature(ctx,plot)&&ctx.spec.species[plant.species].terrain==='vine')return {ok:true,plot,destination:plot.terrain.vine};
  return {ok:false,reason:'植える・採取する・ツタを登る操作を選んでください。'};
}
export const plantGarden={createPersistent:()=>({plants:{},supplied:false}),createRun:()=>({}),step:tick,plan,
  act(ctx,intent,p){
    if(intent.action==='wait'){tick(ctx);return;}
    if(p.inventory)ctx.state.inventory=p.inventory;
    if(intent.action==='supplies'){ctx.persistent.supplied=true;ctx.engine.notify('育苗箱から種・胞子と培養土を受け取りました。');return;}
    if(intent.action==='plant'){ctx.persistent.plants[p.plot.id]={species:intent.species,age:0};ctx.engine.notify(`${p.species.name}を植えました。移動や待機で育ちます。`);}
    if(intent.action==='harvest'){delete ctx.persistent.plants[p.plot.id];ctx.engine.reveal();ctx.engine.notify('植物を採取しました。周囲への効果と地形変化が消えました。');}
    if(p.destination){const d=p.destination;ctx.engine.teleport(d.map,d.x,d.y,d.facing??'north');ctx.engine.notify('生長したツタを伝って階層を移りました。');}
  },
  tile:(ctx,map,x,y)=>patchTile(terrain(ctx),map,x,y),
  cell:(ctx,map,x,y)=>patchCell(terrain(ctx),map,x,y),
  encounter(ctx){return {rate:nearPlants(ctx).reduce((n,p)=>n*(speciesOf(ctx,p).encounterRate??1),1),enemyScale:1};},
  project(ctx){
    const cards=ctx.spec.plots.filter(p=>closeTo(ctx.state,p)).map(p=>{
      const plant=ctx.persistent.plants[p.id],s=speciesOf(ctx,p),actions=[];
      if(plant){actions.push(action(ctx,plan,'採取・伐採する',{action:'harvest',target:p.id}));if(s.terrain==='vine')actions.push(action(ctx,plan,'ツタを登る',{action:'climb',target:p.id}));}
      else for(const [id,s] of Object.entries(ctx.spec.species))if(!s.terrain||p.terrain[s.terrain])actions.push(action(ctx,plan,`${s.name}を植える（${Object.entries(s.materials).map(([id,n])=>`${ctx.data.items[id].name}×${n}`).join('・')}）`,{action:'plant',target:p.id,species:id}));
      return {artKey:plant?.species,name:p.name,text:plant?`${s.name}：${mature(ctx,p)?'生長済み':`生長 ${plant.age}/${s.growth}`}。${s.description}`:'種や胞子を植えられます。',actions};
    });
    if(closeTo(ctx.state,ctx.spec.supply)&&!ctx.persistent.supplied)cards.unshift({name:ctx.spec.supply.name,text:'種・胞子と培養土の初回支給です。追加分は町でも購入できます。',actions:[action(ctx,plan,'育苗資材を受け取る',{action:'supplies'})]});
    return panel(ctx,'植物の育成','植物の種類に応じて周囲に効果を与えます。橋・茨・階段ツタは地形も変えます。',cards,{actions:[action(ctx,plan,'生長を待つ',{action:'wait'})],markers:markers(ctx,ctx.spec.plots,'芽')});
  },
  validate(data,d,s){
    if(!object(s.species)||!Object.keys(s.species).length||!pointsValid(data,d,s.plots)||!floorValid(data,d,s.supply)||!materialsValid(data,s.supplies))return ['植物・植床・育苗箱が不正です'];
    const errors=[];
    for(const [id,p] of Object.entries(s.species))if(!identifier(id)||!object(p)||!p.name||!p.description||!integer(p.growth,1,100)||!integer(p.radius,0,8)||!integer(p.heal,0,100)||!Number.isFinite(p.encounterRate)||p.encounterRate<0||p.encounterRate>5||p.terrain!==null&&!['bridge','barrier','vine'].includes(p.terrain)||!materialsValid(data,p.materials)||!materialsValid(data,p.harvest)||!materialsValid(data,p.immatureHarvest))errors.push('植物の効果・素材・成長が不正です');
    const occupied=new Set();
    for(const p of s.plots){
      if(!object(p.terrain)){errors.push('植床の地形が不正です');continue;}
      for(const [kind,patches] of Object.entries(p.terrain)){
        if(kind==='vine'){if(!floorValid(data,d,patches))errors.push('ツタの移動先が不正です');continue;}
        if(!['bridge','barrier'].includes(kind)||!patchValid(data,d,patches)||patches.some(t=>t.tile!==(kind==='bridge'?'.':'#')||!pointValid(data,d,t)))errors.push('植物の地形変化が不正です');
        if(Array.isArray(patches))for(const t of patches){const key=`${t.map}/${t.x},${t.y}`;if(occupied.has(key))errors.push('植物の地形変化が重複しています');occupied.add(key);}
      }
    }
    return errors;
  },
  validateState(s,p,r){return !exact(p,['plants','supplied'])||typeof p.supplied!=='boolean'||!object(p.plants)||Object.entries(p.plants).some(([id,v])=>!s.plots.some(t=>t.id===id)||!exact(v,['species','age'])||!s.species[v.species]||!integer(v.age,0,s.species[v.species].growth)||s.species[v.species].terrain&&!s.plots.find(t=>t.id===id).terrain[s.species[v.species].terrain])||r&&!empty(r)?['植物の保存が不正です']:[];}
};
