// Explicit references only: prose, metadata and arbitrary strings are never IDs.
const direct={anticipation:'effects',map:'maps',dungeon:'dungeons',quest:'quests',actor:'actors',character:'characters',item:'items',fuelItem:'items',emberItem:'items',protectionItem:'items',skill:'skills',battleSkill:'skills',ability:'fieldAbilities',job:'jobs',enemy:'enemies',encounter:'encounters',guardEncounter:'encounters',status:'statuses',buff:'buffs',sprite:'images',portrait:'images',image:'images',background:'images',music:'audio',sound:'sounds',script:'scripts',event:'events',cue:'cues'};
const lists={maps:'maps',dungeons:'dungeons',enemies:'enemies',skills:'skills',abilities:'fieldAbilities',items:'items',blockedSkills:'skills',blockedAbilities:'fieldAbilities',suppressedSkills:'skills',commonSkills:'skills'};
export function collectReferences(value,file,path=[],out=[]){
 if(!value||typeof value!=='object')return out;
 if(file==='presentation.json'&&path[0]==='bindings'){for(const [key,child] of Object.entries(value)){if(typeof child==='string')out.push({file,path:[...path,key],kind:'cues',id:child});else collectReferences(child,file,[...path,key],out);}return out;}
 for(const [key,child] of Object.entries(value)){
  const p=[...path,Array.isArray(value)?Number(key):key];let kind=direct[key];
  if(file==='locations.json'&&(key==='parent'||key==='links'))kind='locations';
  if(key==='cue'&&path[0]==='fieldAbilities')kind='eventCues';
  if(key==='skill'&&value.api&&value.api!=='battle.skill')kind='fieldAbilities';
  if(key==='asset')kind=value.op?.startsWith('audio.')?'audio':'images';
  if(key==='effect'&&value.op==='effect.play')kind='effects';
  if(key==='formula'&&typeof child==='string')kind='formulas';
  if(typeof child==='string'&&child&&kind)out.push({file,path:p,kind,id:child});
  if(Array.isArray(child)&&child.every(x=>typeof x==='string')){
   kind=(key==='events'&&file==='cell-layers.json'?'cellEvents':null)??lists[key]??(key==='effects'&&file==='presentation.json'?'effects':key==='links'&&file==='locations.json'?'locations':undefined);
   if(kind)child.forEach((id,i)=>out.push({file,path:[...p,i],kind,id}));
  }
  if(['materials','harvest','immatureHarvest','supplies','output'].includes(key)&&child&&typeof child==='object'&&!Array.isArray(child))for(const id of Object.keys(child))out.push({file,path:[...p,id],kind:'items',id});
  collectReferences(child,file,p,out);
 }return out;
}
