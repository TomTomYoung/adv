import {connectWorld,onceAtScene} from './world-story-kit.mjs';
import {story,O,move,set,see,and,or,ref,eq} from './story-kit.mjs';
const s=story(1,{entry:'篝火の迷宮・入口の灯',dark:'油の尽きた巡灯路',branch:'支道の最後の壁灯',post:'灯番詰所'},[['entry','dark'],['dark','branch'],['entry','post']]);
s.story.revision=4;s.resetScripts=true;
s.entity('elder','branch','elder',{mobility:'elderMobility'}).entity('rookie','entry','rookie').entity('rine','post','rine').entity('oldBottle','elder').entity('newBottle','rookie');
s.enum('elderMobility','assisted',['assisted','mobile'],'老人の帰還には介助が必要');
s.bool('afraid',true,'新人は暗闇を恐れたまま').bool('steppedForward',false,'新人が自分の意思で救助に踏み出した').bool('reported').bool('routeClosed').bool('repairsRequested').bool('restRequested');
s.enum('darkness','watching',['watching','attacking','repelled'],'くらがりの行動');
s.enum('partyTorch','lit',['lit','low','extinguished'],'探索隊の携行松明').enum('rookieTorch','lit',['lit'],'老人の油で灯した新人の松明');
s.int('oldOil',0,0,2,'老人の瓶は空','oldBottle').int('newOil',1,0,2,'新人の瓶に残る老人の油','newBottle').int('oilUsed',1,0,2,'入口への帰還と救助の火に使った油');
s.fact('rule','壁灯かくらがり除けの携行松明の火がある間、くらがりは寄れない').fact('gift','老人は自分の油を新人に渡し、入口へ帰した').fact('empty','巡灯路の壁松明は油切れで、点火だけでは灯らない').fact('position','老人は油の少ない壁灯の下で待つ').fact('returningFire','老人が渡した油の火で、新人が二人を救った');
s.invariant('oil_total',eq({op:'add',args:[s.v('oldOil'),s.v('newOil'),s.v('oilUsed')]},2),'老人が渡した油は増えない');
s.invariant('fear_remains',s.is('afraid'),'救助の行動は恐怖の消滅を意味しない');
s.brief='篝火の迷宮の巡灯路から、当直の老灯番が戻らない。実地教育に同行した新人の帰還も確かめる。';
s.past=['巡灯路の壁松明が油切れで消えた。老灯番は自分の残りの油を新人へ渡して入口に帰し、自分は最後に灯る壁松明の下に残った。新人は老人の油で灯した松明を持って入口へ戻ったが、暗闇への恐怖で引き返せずにいる。'];
s.revealText='入口に残った新人は、恐怖を失わないまま老人と探索隊を助けに踏み込む。老人が先に渡した油の火が、新人から老人へ返される。';
s.progression='火のルールを入口で聞く。油切れの壁松明を実地に確かめ、最後の灯の下から老人を介助する。帰路の消灯とくらがりの襲来に対して、新人が自ら戻る。救助後に巡灯路の修繕と二人の休養のどちらを先に引き受けるかを決める。';
s.authoringNotes={notice:'火と恐怖と所在を一貫して扱うための作者向け制約です。',facts:['灯番は原則一経路一人。本件のみ実地教育の新人が同行した。','老人は正式な当直、新人は見習い。リネは同行を把握している。','新人はクライマックスまで入口から動かず、恐怖を抱えたまま救助を選ぶ。','油切れの壁灯は点火だけでは灯らない。壁灯の現在状態はstate.objectsだけに保存する。','全ての結末は新人による救助の後に選ぶ。老人の油が二人を救う往復を省略しない。']};
const wall=(id,state)=>({op:'object.state.set',map:'kagaribi_f1',object:id,state});
const returnSeal={dungeon:'kagaribi',action:'return',source:'q001.elder_rescue'};
const portable=(fuel)=>({op:'fire.portable.set',fuel,effect:fuel?'ward':null});
s.sceneCommands={
 entry:onceAtScene('q001','entry',[portable(25)]),
 old:[{op:'event.checkpoint.begin',id:'q001.elder_rescue',quest:'q001',scene:'old',dungeon:'kagaribi',
  flags:['worldSceneEffects.q001.old','worldSceneEffects.q001.outage'],
  objects:['kagaribi_f1/q001_last_lamp'],eventKeys:['kagaribi_f1/q001_elder','kagaribi_f1/q001_return'],restrictionSources:[returnSeal.source]},
  ...onceAtScene('q001','old',[portable(8),{op:'dungeon.restriction.set',...returnSeal,reason:'帰還印が封印されている。老人と帰路の巡灯路へ向かおう。'}])],
 outage:onceAtScene('q001','outage',[wall('q001_last_lamp','extinguished'),portable(0)]),
 rescue:[]
};
s.noPauseScenes=['outage','rescue'];
s.sceneFlow={outage:[{
 op:'battle.start',id:'q001-F-kuragari',encounter:'kuragari_hunt',
 events:[{id:'q001-B-rookie',triggers:['round_start','before_end'],
  condition:or({op:'gte',left:ref('battle.round'),right:2},{op:'in',left:ref('battle.pendingResult'),right:['win','escape','repel']}),
  commands:[
   {op:'scene.cast',cast:[{character:'elder',display:{position:'left'}},{character:'rookie',display:{position:'right',flip:true}}]},
   {op:'say',character:'rookie',text:'怖いです。今も。でも、二人とも、ここにいるから。……その人を、離して！'},
   {op:'story.action',quest:'q001',action:'outage_call'},
   portable(25),{op:'battle.end'}
  ]}],
 on_interrupt:[{op:'dungeon.restriction.clear',...returnSeal},{op:'event.checkpoint.commit',id:'q001.elder_rescue'},{op:'jump',script:'q001.v11.rescue'}],on_win:[],on_escape:[],
 on_lose:[]
}]};
s.node('entry','entry',['rookie'],'入口の篝火の下で、新人が松明を両手で握っていた。「壁の松明か、くらがり除けの火を持っていれば、あれは寄れません。でも、巡灯路の火が消えて……あの人が、自分の油を僕にくれたんです」。奥で石をこする音がする。新人は一歩を出そうとし、足を引いた。「戻らなきゃいけないのに、怖くて」。',[
 O('talk','火を確かめ、老人を探しに行く。新人には入口の灯を守ってもらう','dark',[see('rule','rookie'),see('gift','rookie'),move('party','entry','dark')])
]);
s.node('dark','dark',[],'二つの壁松明は黒いままだ。手元の火が揺れるたび、通路の奥で何かが同じ距離だけ退く。まだ、その姿は火の内側に入ってこない。',[
 O('inspect','消えた壁松明を調べ、火を移せるか確かめる','empty',[see('empty','dark')])
]);
s.node('empty','dark',[],'火を芯へ寄せると、一瞬だけ先端が赤くなり、すぐ消えた。油受けは底まで乾いている。芯の向きや点火の仕方ではなく、壁松明の油そのものが尽きていた。二つ目も同じだ。手元の松明を掲げ、杖の音へ進む。',[
 O('follow','携行松明を頼りに、杖の音がする支道へ進む','old',[move('party','dark','branch'),see('position','elder'),set('partyTorch','low')])
]);
s.node('old','branch',['elder'],'老人は小さく燃える壁松明の真下にいた。油受けの底が見える。「あの子は入口まで行けたか」。頷くと、空の油瓶を伏せた。「あれは新人に持たせた。わしは、ここの火が消えるまでに誰か来てくれればと思ってな」。老人の足は腫れ、立つには肩が要る。携行松明にも油は残り少ない。',[
 O('support','老人に肩を貸し、最後の壁灯があるうちに入口へ戻る','outage',[move('party elder','branch','dark'),set('partyTorch','extinguished'),set('darkness','attacking')])
]);
s.node('outage','dark',['elder'],'曲がり角で、携行松明の炎が縮んだ。油はもう出ない。最後の赤い芯が暗くなると、往路で火の外にいたものが、一息で距離を詰めてきた。老人の腕が肩に食い込む。後ろの壁灯も消えている。老人を壁際へ支え、迫るくらがりに武器を構えた。',[
 O('call','戦闘中に新人が火を掲げ、二人を救う','rescue',[{op:'consume',key:'newOil',amount:1,sink:'oilUsed'},move('rookie','entry','dark'),set('steppedForward'),set('darkness','repelled'),see('returningFire','rookie')])
]);
s.node('rescue','dark',['elder','rookie'],'入口の方から来た火に、くらがりが身をよじり、明かりの外へ退いた。新人の膝は震え、松明を差し出す手も定まらない。老人にもらった油で灯した火を、二人の足元へ近づける。老人は空の瓶を見て、新人の火を見た。「返しに来たか」。',[
 O('home','新人の火を頼りに、三人で迷宮の入口へ戻る','gate')
]);
s.node('gate','entry',['elder','rookie'],'入口の篝火が見えた。老人を支えたまま階段を上がれば町へ出られる。リネへの帰還報告は、灯番組合の詰所に着いてからだ。',[
 O('report','入口の階段から町へ出て、灯番詰所へ向かう','post')
]);
const rescued=and(s.is('elderAt','post'),s.is('rookieAt','post'),s.is('steppedForward'),s.is('afraid'),s.is('darkness','repelled'),s.is('reported'));
s.node('post','post',['elder','rookie','rine'],'リネは二人の名前に帰還の印を付け、油切れの巡灯路を閉鎖した。新人はまだ火のそばを離れられない。老人は「今夜、戻ってきた。それはもう済んだ仕事だ」と言う。リネが空になった油瓶を並べる。「次の仕事は、こちらで選び直せます」。',[
 O('repair','二人を休ませ、油切れの箇所を修繕班へ伝える役目を引き受ける','@informed',[set('repairsRequested')]),
 O('rest','今夜は二人の付き添いを優先し、巡灯路を閉鎖したまま引き継ぐ','@compromise',[set('restRequested')])
]);
s.end('informed','返された火と巡灯路の修繕','老人が新人へ渡した油の火で、二人は生きて帰った。探索隊は油切れの二箇所と最後の壁灯を修繕班へ伝え、点検が済むまで巡灯路を閉鎖した。新人の恐怖は残っている。それでも、助けに戻ったという一度の行動は消えない。',and(rescued,s.is('repairsRequested')));
s.end('compromise','返された火を囲む夜','二人は帰還し、探索隊は詰所に残って老人の介抱と新人の付き添いを続けた。巡灯路は閉鎖され、修繕の立ち会いは翌番へ渡された。新人は怖かったと繰り返し、老人はそのたび、来てくれたと答えた。',and(rescued,s.is('restRequested')));
const route=connectWorld(s,{
 entry:{kind:'dungeon',dungeon:'kagaribi',map:'kagaribi_f1',x:2,y:1,event:'q001_decision'},
 dark:{kind:'dungeon',dungeon:'kagaribi',map:'kagaribi_f1',x:9,y:1,event:'q001_return'},
 branch:{kind:'dungeon',dungeon:'kagaribi',map:'kagaribi_f1',x:13,y:3,event:'q001_elder'},
 post:{kind:'town',location:'hikarigaeri_lamplighter_post'}
},4);
route('entry_talk','dark',{depart:[see('rule','rookie'),see('gift','rookie')]});
route('empty_follow','branch',{arrive:[see('position','elder'),set('partyTorch','low')]});
route('old_support','dark',{companions:['elder'],arrive:[set('partyTorch','extinguished'),set('darkness','attacking')]});
route('rescue_home','entry',{companions:['elder','rookie']});
route('gate_report','post',{companions:['elder','rookie'],arrive:[set('reported'),set('routeClosed')]});
// Blocking and speaking belong to the authored scene, never to the UI's heuristics.
const blocking={
 entry:{rookie:{position:'center'}},old:{elder:{position:'left'}},outage:{elder:{position:'left'}},
 rescue:{elder:{x:30,layer:1},rookie:{x:67,flip:true,layer:2}},
 gate:{elder:{x:30,layer:1},rookie:{x:67,flip:true,layer:2}},
 post:{elder:{x:23,layer:1},rookie:{x:40,flip:true,layer:2},rine:{x:76,layer:3}}
};
for(const [id,positions] of Object.entries(blocking))for(const c of s.story.scenes[id].cast)c.display=positions[c.entity];
s.sceneDialogue={
 entry:[
  {op:'narrate',text:'入口の篝火の下で、新人が松明を両手で握っていた。'},
  {op:'say',character:'rookie',text:'壁の松明か、くらがり除けの火を持っていれば、あれは寄れません。でも、巡灯路の火が消えて……あの人が、自分の油を僕にくれたんです。'},
  {op:'narrate',text:'奥で石をこする音がする。新人は一歩を出そうとし、足を引いた。'},
  {op:'say',character:'rookie',text:'戻らなきゃいけないのに、怖くて。'}
 ],
 old:[
  {op:'narrate',text:'老人は小さく燃える壁松明の真下にいた。油受けの底が見える。'},
  {op:'say',character:'elder',text:'あの子は入口まで行けたか。'},
  {op:'narrate',text:'頷くと、空の油瓶を伏せた。'},
  {op:'say',character:'elder',text:'あれは新人に持たせた。わしは、ここの火が消えるまでに誰か来てくれればと思ってな。'},
  {op:'narrate',text:'老人の足は腫れ、立つには肩が要る。携行松明にも油は残り少ない。'}
 ],
 rescue:[
  {op:'narrate',text:'入口の方から来た火に、くらがりが身をよじり、明かりの外へ退いた。新人の膝は震え、松明を差し出す手も定まらない。老人にもらった油で灯した火を、二人の足元へ近づける。老人は空の瓶を見て、新人の火を見た。'},
  {op:'say',character:'elder',text:'返しに来たか。'}
 ],
 post:[
  {op:'narrate',text:'リネは二人の名前に帰還の印を付け、油切れの巡灯路を閉鎖した。新人はまだ火のそばを離れられない。'},
  {op:'say',character:'elder',text:'今夜、戻ってきた。それはもう済んだ仕事だ。'},
  {op:'narrate',text:'リネが空になった油瓶を並べる。'},
  {op:'say',character:'rine',text:'次の仕事は、こちらで選び直せます。'}
 ]
};
export default s.done();
