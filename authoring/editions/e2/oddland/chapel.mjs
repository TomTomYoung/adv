import {set,give,ref,eq,and,not} from '../../../story-kit.mjs';

// Keep the existing request, truth, choices and endings. Add concrete arrivals
// where the old prose used to finish a trip at the decision event's single cell.
export function chapelSource(q,{cast=true}={}){
 const x={nodes:structuredClone(q.model.graph),places:{},flags:{},entities:{}};
 const scene=id=>x.nodes.find(n=>n.id===id),option=(id,key)=>scene(id).options.find(o=>o.id===key);
 const cell=(key,name,role)=>{const p=q.locations.find(p=>p.role===role);x.places[key]={name,world:{kind:'dungeon',dungeon:'region_4',map:p.map,x:p.x,y:p.y}};};
 const town=(key,name,location)=>x.places[key]={name,world:{kind:'town',location}};
 const entity=(key,holder,kind='item')=>x.entities[key]={holder,kind};
 const at=(...ids)=>ids.forEach(id=>scene(id).place='entry');
 const is=(key,value=true)=>eq(ref(`stories.${q.id}.values.${key}`),value);
 const held=(key,holder)=>is(key+'At',holder);
 const transfer=(key,from,to)=>({...give(key,from,to),when:held(key,from)});
 const add=(id,place,text,options)=>{const n={id,place,text,options};x.nodes.push(n);return n;};
 const end=(id,place,text,outcome,effects=[])=>add(id,place,text,[{id:'finish',text:'現場の結果を確かめ、依頼を終える',to:'@'+outcome,effects}]);
 const route=(id,key,to,extra={})=>Object.assign(option(id,key),{to,...extra});
 cell('entry',q.title+'の現場','decision');for(const n of x.nodes)n.place='entry';
 if(q.number===31){x.flags.recorded=false;option('entry','record').effects=[set('recorded')];}
 if(q.number===32){
  cell('cell','聖像の下の地下牢','clue_a');cell('workshop','礼拝堂の石工台','clue_b');scene('cell').place='cell';scene('workshop').place='workshop';
  option('entry','look').text='覗き窓の行先を確かめ、地下牢へ回る';
  entity('stone','workshop');entity('jewel','entry');
  // The original jewel stays on the statue shelf. Describe the stone here;
  // do not silently invent a journey or transfer for the jewel.
  scene('workshop').text='職人が不透明な石を台に置いた。「この石でも、棚にある元の宝玉でも、像の輪郭は戻せます」。';
  if(cast){
   x.entities.prisoner={holder:'cell',kind:'person',character:'q032_prisoner'};
   x.entities.craftsperson={holder:'workshop',kind:'person',character:'q032_craftsperson'};
   scene('cell').cast=['prisoner'];scene('workshop').cast=['craftsperson'];
  }
  route('workshop','stone','fit_stone',{depart:[give('stone','workshop','party')]});
  end('fit_stone','entry','石工台から不透明な目を持ち帰った。覗き管を塞ぐ位置と、像の輪郭をもう一度確かめる。','informed',[give('stone','party','entry')]);
  route('workshop','original','fit_original');end('fit_original','entry','透明な宝玉のある棚へ戻った。元の目を戻すと、地下牢を見張る穴も再び通る。','contract');
  route('cell','leave','plate');end('plate','entry','聖像へ戻り、片目を塞がず保存する方針と、穴が地下牢へ通じる由来を銘板に記す。','compromise');
 }
 if(q.number===33){
  cell('wash','外套を洗う水盤','clue_b');town('guest','鏡のない客室','pilgrim_guesthouse');entity('pilgrim','entry','person');entity('cloak','pilgrim');
  route('entry','guest','guest',{companions:['pilgrim']});route('powder','room','guest',{companions:['pilgrim']});
  // Keep the cloak with its existing holder; the portrait does not imply a transfer.
  end('guest','guest','巡礼者と鏡のない客室まで来た。戸を閉じると、巡礼者は外套を握ったまま話し始めた。','compromise');
  route('powder','wash','wash',{companions:['pilgrim']});
  add('wash','wash','水盤で外套を洗うと、磨き粉が水に落ちた。巡礼者は濡れた袖を絞り、鏡へ戻ろうと言う。',[{id:'return',text:'巡礼者と鏡へ戻り、曇りを磨き直す',to:'clean',companions:['pilgrim']}]);
  end('clean','entry','戻った鏡に二人の手が映る。巡礼者と残る曇りを拭き取った。','informed');
  if(cast){x.entities.pilgrim.character='q033_pilgrim';for(const n of x.nodes)n.cast=['pilgrim'];}
 }
 if(q.number===34){
  town('meeting','被害者との面会室','pilgrim_meeting');scene('consent').place='meeting';entity('merchant','entry','person');entity('victims','meeting','person');entity('document','entry');
  for(const [from,key] of [['entry','meeting'],['reserved','face']])Object.assign(option(from,key),{companions:['merchant'],depart:[transfer('document','entry','party')]});
  Object.assign(option('consent','document'),{companions:['merchant']});
  option('entry','recover').effects=[give('document','entry','merchant')];
  option('reserved','separate').effects=[transfer('document','entry','merchant'),transfer('document','party','merchant')];
  x.flags.consent=false;option('consent','arrange').effects=[set('consent')];
  if(cast){x.entities.merchant.character='q034_merchant';x.entities.victims.character='q034_victims';for(const n of x.nodes)n.cast=n.id==='consent'?['merchant','victims']:['merchant'];}
 }
 if(q.number===35){
  cell('patient','配膳口の患者側','clue_a');scene('patient').place=scene('consent').place='patient';
  entity('server','entry','person');entity('patient','patient','person');entity('meal','server');
  Object.assign(option('entry','deliver'),{companions:['server'],depart:[give('meal','server','party')],effects:[give('meal','party','patient')]});
  x.flags.repairConsent=false;option('patient','ask').effects=[set('repairConsent')];option('consent','repair').when=is('repairConsent');
  if(cast){x.entities.server.character='q035_server';x.entities.patient.character='q035_patient';for(const n of x.nodes)n.cast=n.id==='entry'?['server']:['server','patient'];}
 }
 if(q.number===36){
  at('entry','recording','credit');x.flags.livePaused=false;x.flags.rehearsed=false;
  option('entry','solo').effects=[set('livePaused')];option('recording','rehearse').effects=[set('livePaused',false),set('rehearsed')];
 }
 if(q.number===37){
  cell('quiet','告解の声が届かない控室','clue_a');scene('return').place='quiet';entity('cage','entry');
  option('entry','move').depart=[give('cage','entry','party')];option('entry','move').effects=[give('cage','party','quiet')];
  for(const key of ['first','second','third']){
   town(key,{first:'一番の札の家',second:'二番の札の家',third:'三番の札の家'}[key],'pilgrim_'+key);
   entity('owner_'+key,key,'person');entity('letter_'+key,'entry');
   option('entry','move').depart.push(give('letter_'+key,'entry','party'));
   route('return',key,key,{effects:[give('letter_'+key,'party','owner_'+key)]});
   add(key,key,'受付札を本人と照合し、封を開けずに写本を渡した。受領の返事を聞いてから控室へ戻る。',[{id:'back',text:'控室へ戻る',to:'return'}]);
  }
  option('return','deposit').effects=['first','second','third'].map(key=>transfer('letter_'+key,'party','quiet'));
 }
 if(q.number===38){
  cell('lab','礼拝堂の水質検査台','clue_a');scene('water').place='lab';
  town('supply','巡礼台地の水の受取所','oddland_plateau_supply');
  entity('sample','entry');entity('afterSample','entry');x.flags.filterChanged=false;x.flags.waterTested=false;
  Object.assign(option('entry','sample'),{depart:[give('sample','entry','party')],effects:[give('sample','party','lab'),set('waterTested')]});
  option('entry','replace').effects=[set('filterChanged')];
  route('water','filter','filter_check');end('filter_check','entry','検査票を持って水瓶へ戻った。古い炭を交換し、検査人と設備の継ぎ目まで確かめる。','informed',[set('filterChanged')]);
  route('filter','test','after_test',{depart:[give('afterSample','entry','party')],effects:[give('afterSample','party','lab'),set('waterTested')]});
  add('after_test','lab','交換後の水にも飲用可の判定が出た。二枚の検査票を受け取り、水瓶のある場所へ戻る。',[{id:'post',text:'水瓶へ戻り、設備と水質の検査票を掲げる',to:'posted'}]);
  end('posted','entry','水瓶の交換札の横に、設備と水質の検査票を並べた。','informed');
  for(const [from,key] of [['entry','buy'],['water','separate']])route(from,key,'supply');
  end('supply','supply','依頼人の買付票を受取所へ届けた。飲用水の便を手配し、検査中の瓶は生活用だけに分ける。','compromise');
 }
 if(q.number===39){
  at('entry','owners','account');entity('mask','entry');entity('buyer','entry','person');x.flags.jointMarks=false;
  option('entry','buyer').effects=[give('mask','entry','buyer')];option('owners','marks').effects=[set('jointMarks')];
 }
 if(q.number===40){
  cell('record','大鏡の外の記録机','clue_b');cell('isolation','鏡を保管する閉鎖区画','clue_a');scene('shadow').place='record';
  entity('mirror','entry');entity('copy','party');entity('witness','record','person');
  option('witness','copy').effects=[give('copy','party','witness')];
  for(const [from,key] of [['entry','isolate'],['witness','move']])route(from,key,'isolated',{depart:[give('mirror','entry','party')],effects:[give('mirror','party','isolation')]});
  route('shadow','remove','collect_mirror',{depart:[give('copy','witness','party')]});
  add('collect_mirror','entry','証言の写しを受け取り、大鏡の前へ戻った。鏡と写しを別々に包み、閉鎖区画へ運ぶ。',[{id:'carry',text:'鏡と写しを閉鎖区画へ運ぶ',to:'isolated',depart:[give('mirror','entry','party')],effects:[give('mirror','party','isolation'),give('copy','party','isolation')]}]);
  end('isolated','isolation','鏡を閉鎖区画へ据え、入口に調査中の札を掛けた。調べられた範囲と、まだ聞き取れていない声を区別して残す。','compromise');
  route('after','fragment','fragment');end('fragment','record','記録机で日付と聞き取れた言葉だけを書いた。分からない箇所は空白のまま残す。','fragment');
 }
 // The legacy conditions now refer to typed, persisted story state.
 const rewrite=value=>{if(Array.isArray(value))return value.map(rewrite);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='ref'&&v.startsWith(`flags.flow.${q.id}.`)?v.replace(`flags.flow.${q.id}.`,`stories.${q.id}.values.`):rewrite(v)]));return value;};
 for(const n of x.nodes){n.text=n.text.replaceAll('$truth',q.model.reveal.newInformation);for(const a of n.options){
  for(const [key,value] of Object.entries(a.set??{})){x.flags[key]??=false;(a.effects??=[]).push(set(key,value));}delete a.set;
  if(a.need)a.when=and(a.when??true,...a.need.map(key=>is(key)));a.when=rewrite(a.when);delete a.need;
 }}
 return x;
}
