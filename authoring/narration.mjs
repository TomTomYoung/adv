// Build-time editing of narration only. The VM never rewrites displayed text.
// Dialogue in Japanese quotation marks, and named say commands, stays verbatim.
export const proseKeys=new Set(['text','brief','unlockHint','truth','newInformation','event',
 'initialHypothesis','goal','fixedPast','beliefsAndGoals','request','design','observation',
 'belief','notice','facts','requirement','description','progression']);
const endings=/(ませんでした|ません|ました|ましょう|ます)(?=$|[\s。、，！？!?…）)\]」』]|が|から|ので|けれど|けど|し[、。])/gu;
const ichidan=/(?:でき|出来|過ぎ|すぎ|足り|借り|降り|浴び|伸び|延び|試み|顧み|生き|起き|落ち|満ち|用い|率い|老い)$/u;
const godanS=/(?<![\p{Script=Han}々])(?:話し|冷まし|覚まし|醒まし|澄まし|済まし|励まし|さまし|すまし|だまし|伸ばし|延ばし|戻し|見直し|見渡し|見通し|見越し|過ごし|こなし|捜し|残し|返し|直し|渡し|外し|下ろし|降ろし|映し|示し|記し|探し|隠し|移し|出し|足し|貸し|越し|起こし|起し|壊し|殺し|流し|写し|指し|消し|明かし|脅し|脅かし|鳴らし|照らし|暮らし|揺らし|放し|減らし|動かし|回し|満たし|通し|尽くし|託し|果たし|許し|試し|増し|冷やし|濡らし|汚し|押し|繰り返し|見逃し|見過ごし|避難させ直し|呼び戻し|ほどこし|施し|目指し|生かし|活かし|聞き直し|買い戻し|覚まし|燃やし|潰し|崩し|落とし|落し|伏し|騙し|騙かし|蒸し|余し|癒し|晒し|さらし)$/u;
const rows={い:['う','った','わない','わなかった','おう'],き:['く','いた','かない','かなかった','こう'],ぎ:['ぐ','いだ','がない','がなかった','ごう'],し:['す','した','さない','さなかった','そう'],ち:['つ','った','たない','たなかった','とう'],に:['ぬ','んだ','なない','ななかった','のう'],び:['ぶ','んだ','ばない','ばなかった','ぼう'],み:['む','んだ','まない','まなかった','もう'],り:['る','った','らない','らなかった','ろう']};
const formIndex={ます:0,ました:1,ません:2,ませんでした:3,ましょう:4};
const regular=['る','た','ない','なかった','よう'];
function verb(stem,form){
 const i=formIndex[form];
 if(/(?:あり|有り)$/u.test(stem))return stem.slice(0,-2)+['ある','あった','ない','なかった','あろう'][i];
 if(stem.endsWith('来'))return stem+regular[i];
 if(/(?:てき|でこ|で来)$/u.test(stem))return stem.slice(0,-1)+['くる','きた','こない','こなかった','こよう'][i];
 if(/(?:てい|でい)$/u.test(stem)||ichidan.test(stem)||/[えけげせぜてでねへべめれじ見得出居]$/u.test(stem))return stem+regular[i];
 if(/(?:ており|でおり)$/u.test(stem))return stem.slice(0,-2)+['いる','いた','いない','いなかった','いよう'][i];
 if(stem.endsWith('し')&&!godanS.test(stem))return stem.slice(0,-1)+['する','した','しない','しなかった','しよう'][i];
 if(stem.endsWith('行き'))return stem.slice(0,-1)+['く','った','かない','かなかった','こう'][i];
 if(stem.endsWith('い')&&/(?:に|が|は|も|で|へ|と)い$/u.test(stem))return stem+regular[i];
 const row=rows[stem.at(-1)];
 if(row)return stem.slice(0,-1)+row[i];
 throw new Error(`Unreviewed polite narration verb: ${stem}${form}`);
}
export function outsideQuotes(text,edit){
 let out='',segment='',depth=[];
 const flush=()=>{out+=depth.length?segment:edit(segment);segment='';};
 for(const ch of text){
  if(ch==='「'||ch==='『'){flush();depth.push(ch==='「'?'」':'』');segment+=ch;}
  else if(depth.length&&ch===depth.at(-1)){segment+=ch;flush();depth.pop();}
  else segment+=ch;
 }
 // A split quotation is left intact until its closing part in the source.
 flush();return out;
}
export function plainNarration(text){
 return outsideQuotes(text,segment=>{
  let out='',start=0;
  for(const m of segment.matchAll(endings)){
   const prefix=segment.slice(start,m.index),match=prefix.match(/[\p{Script=Han}々ぁ-ゖァ-ヶー]+$/u);
   if(!match)throw new Error(`Missing verb before ${m[0]} in ${segment}`);
   // 覚ます／覚ました are already plain forms, not the polite auxiliary.
   const lexical=/^(?:ます|ました)$/.test(m[0])&&/(?:覚|醒|冷|澄|済|励|さ|す|だ)$/.test(match[0]);
   out+=lexical?prefix+m[0]:prefix.slice(0,match.index)+verb(match[0],m[0]);start=m.index+m[0].length;
  }
  out+=segment.slice(start);
  return out.replace(/ありません/g,'ない').replace(/でしょう/g,'だろう').replace(/でした/g,'だった')
   .replace(/(い|かった)です(?=$|[\s。、！？!?…]|が|から|ので)/gu,'$1')
   .replace(/です(?=$|[\s。、！？!?…]|が|から|ので)/gu,'だ');
 });
}
export function editNarration(value,key=''){
 if(typeof value==='string')return proseKeys.has(key)?plainNarration(value):value;
 if(Array.isArray(value))return value.map(v=>editNarration(v,key));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>
  [k,value.op==='say'&&(value.name||value.speaker||value.character)&&k==='text'?v:editNarration(v,k)]));
 return value;
}
