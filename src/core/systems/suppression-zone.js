import {closeTo} from './common.js';
import {empty,exact,cellsValid,floorValid,action,markers,panel,sameCell} from './environment.js';
const inside=ctx=>ctx.spec.cells.some(p=>sameCell(p,ctx.state.location));
export function restrictionText(data,s){
  const names=(ids,defs)=>ids.map(id=>defs[id]?.name??id).join('・');
  return `使用禁止：${names(s.blockedSkills,data.skills)}${s.blockedAbilities.length?'・'+names(s.blockedAbilities,data.fieldAbilities):''}。効果停止：${[names(s.suppressedSkills,data.skills),names(s.statuses,data.statuses),names(s.buffs,data.buffs),names(s.items,data.items)].filter(Boolean).join('・')}。境界外で解除されます。`;
}
function plan(ctx,intent){return intent.action==='lure'&&ctx.spec.threat&&closeTo(ctx.state,ctx.spec.threat.point)&&!ctx.run.pursued?{ok:true}:{ok:false,reason:'境界の誘導地点で、追跡者を引きつけてください。'};}
export const suppressionZone={createPersistent:()=>({}),createRun:()=>({pursued:false}),plan,
  act(ctx){ctx.run.pursued=true;ctx.engine.notify('呪詠みを引きつけました。次に移動した場所で戦闘になります。境界の内外を選んでください。');},
  step(ctx){if(ctx.run.pursued){ctx.run.pursued=false;ctx.engine.startBattle(ctx.spec.threat.encounter,{win:[],escape:[],lose:[]});}},
  abilityReason(ctx,id,api){return inside(ctx)&&(api==='battle.skill'?ctx.spec.blockedSkills:ctx.spec.blockedAbilities).includes(id)?'谷の境界内では、この術を使用できません。':null;},
  effectActive(ctx,kind,id){const key={skill:'suppressedSkills',status:'statuses',buff:'buffs',item:'items'}[kind];return !(inside(ctx)&&key&&ctx.spec[key].includes(id));},
  equipmentStats:(ctx,id,stats)=>inside(ctx)&&ctx.spec.items.includes(id)?{}:stats,
  project(ctx){return panel(ctx,'祈りと呪いの境界',`${inside(ctx)?'境界内：指定した術と効果が停止しています。':'境界外：術と効果は通常どおりです。'} ${restrictionText(ctx.data,ctx.spec)}${ctx.run.pursued?' 呪詠みが追っています。次の移動先で戦闘になります。':''}`,ctx.spec.threat&&closeTo(ctx.state,ctx.spec.threat.point)?[{name:'境界の追跡者',text:'引きつけた後、境界の内側または外側へ移動して迎え撃てます。',actions:[action(ctx,plan,'呪詠みを誘導する',{action:'lure'})]}]:[],{markers:[...ctx.spec.cells.filter(p=>p.map===ctx.state.location.map&&(ctx.state.discovered[p.map]??[]).includes(`${p.x},${p.y}`)).map(p=>({id:`boundary_${p.x}_${p.y}`,name:'術の遮断区域',x:p.x,y:p.y,kind:'boundary',glyph:'静'})),...ctx.spec.threat?markers(ctx,[ctx.spec.threat.point],'誘'):[]]});},
  validate(data,d,s){
    const defs={blockedSkills:data.skills,blockedAbilities:data.fieldAbilities,suppressedSkills:data.skills,statuses:data.statuses,buffs:data.buffs,items:data.items};
    return !cellsValid(data,d,s.cells)||Object.entries(defs).some(([k,defs])=>!Array.isArray(s[k])||new Set(s[k]).size!==s[k].length||s[k].some(id=>!Object.hasOwn(defs,id)))||s.blockedSkills.includes('attack')||s.threat&&(!floorValid(data,d,s.threat.point)||!data.encounters[s.threat.encounter])?['境界または禁止・停止対象の参照が不正です']:[];
  },
  validateState:(s,p,r)=>!empty(p)||r&&(!exact(r,['pursued'])||typeof r.pursued!=='boolean'||r.pursued&&!s.threat)?['境界の保存が不正です']:[]
};
