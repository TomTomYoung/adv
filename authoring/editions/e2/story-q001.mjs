import firstEdition from '../../story-q001.mjs';
import {set} from '../../story-kit.mjs';

// The first edition remains the source of the shipped physical route. Only the
// fields listed here are inherited; this module authors the second-edition text
// and its one additional, persistent conversation choice.
const inherited=['id','number','story','nodes','outcomes','past','progression','sceneCommands','sceneFlow','sceneDialogue'];
const s=Object.fromEntries(inherited.map(key=>[key,structuredClone(firstEdition[key])]));
for(const n of s.nodes)delete n.text; // sceneDialogue below is the e2 prose source.
s.edition='e2';
s.story.revision=1;
// This is the existing executable state adapter, not the design model version.
s.story.modelVersion='1.1';
s.standard={id:'game-scenario-model',version:'1.2b',source:'https://github.com/TomTomYoung/GAMEBOOK/blob/main/doc/SCENARIO_MODEL_V1_2B.md',adapter:'adv-story-state/1',revision:'2026-10-25',scope:'quest-episode'};
s.brief='巡灯から戻る時刻を過ぎても、老灯番と見習いの二人が詰所へ戻らない。篝火の迷宮の巡灯路で二人を捜し、灯番詰所まで連れ帰ってほしい。';
s.progression='入口に残った新人へ、灯を守るか呼び声へ応じるかを頼む。消えた壁灯と空の瓶をたどり、老人を介助する。帰路の戦闘で新人が救助に踏み出し、約束への返事を聞く。一行で詰所へ戻り、修繕班への申し送りと二人への付き添いのどちらを先に引き受けるか選ぶ。';
s.revealText='老人が渡した油瓶と、新人が運んできた火が同じ場面にそろう。新人の怖さは消えないが、老人は今度、新人の示す明かりへ足を出す。';
s.authoringNotes={
 notice:'以下は作者用の採用設定と実装範囲であり、そのまま会話へ挿入しない。',
 facts:[
  '初版の固定過去、当直と見習いの関係、油の収支、救助と実移動を継承する。',
  '入口の追加選択は小さな役割の約束。救助の成否や報酬の優劣を約束しない。',
  '呼び声への返事を頼んだ場合だけ、帰路と救助後にその約束へ言及する。',
  '修繕の申し送りと付き添いは、今どちらを先に引き受けるかの選択。救助と修繕が両立不能とは扱わない。',
  'リネが組合側の手配を担う。結末は申し送り・準備までで、修繕工事の完了や将来の無事故を断定しない。',
  '初版から引き継ぐ固定の消灯・救援イベントは継続する。燃料値の強制変更を、プレイヤーの補充操作から自然に導かれた結果とは説明しない。'
 ]
};
s.story.registry.signalAgreed={type:'boolean',initial:false,meaning:'入口で呼び声への返事を新人に頼み、引き受けてもらった'};
const signal={op:'eq',left:{ref:'stories.q001.values.signalAgreed'},right:true};
const narrate=text=>({op:'narrate',text});
const say=(character,text)=>({op:'say',character,text});
const branch=(then,otherwise)=>({op:'if',condition:signal,then,else:otherwise});
const node=id=>s.nodes.find(n=>n.id===id);

s.sceneDialogue={
 entry:[
  narrate('入口の篝火のそばに、油瓶を抱えた若い灯番がいた。松明を握る指が白い。こちらに気づくと、膝に引きつけていた瓶を持ち上げた。'),
  say('rookie','先生が、これを。『入口で火を絶やすな』って。僕の瓶に、残りを全部。'),
  narrate('明かりの外で、何かが石をこすった。新人が炎を差し出すと、その音が一つ遠のいた。'),
  say('rookie','この火なら、あれは寄ってきません。壁の灯もあったのに、奥の二つが消えて……。先生は支道の灯の下です。足を痛めてます。'),
  narrate('入口から一歩出かけた靴が、同じ石の上へ戻る。'),
  say('rookie','一緒に行かなきゃ。でも、脚が……。ここからでも、何かできませんか。')
 ],
 dark:[
  narrate('通路に、黒い壁松明が二つ見えた。手元の火が揺れると、奥から聞こえる音も動く。近づきはしない。'),
  narrate('油受けの縁に、乾いた筋が一本垂れていた。')
 ],
 empty:[
  narrate('芯へ火を近づける。先だけが赤くなり、すぐに暗くなった。油受けの乾いた底には、黒い輪が幾重も残っている。もう一つの壁灯も同じだった。'),
  narrate('奥で、杖が石を打った。間を置いて、もう一度。火を掲げると、支道の壁に小さな明かりが見えた。')
 ],
 old:[
  narrate('老人は壁灯の真下に腰を下ろしていた。そばの油瓶を傾けても、何も落ちない。'),
  say('elder','来たか。……あの子は、入口におるな。'),
  narrate('待っていると答えると、老人は瓶に栓を戻した。空の瓶が、軽い音を立てた。'),
  say('elder','あれまで暗くなったら、あの子の足が止まる。油は持たせた。'),
  narrate('靴の縁から、腫れた足首がのぞいている。立ちかけた老人の膝が折れ、杖先が滑った。携行松明の炎も短くなっている。'),
  say('elder','この足では手間をかける。肩を借りてもいいか。')
 ],
 outage:[
  narrate('老人の歩幅に合わせて進むうち、手元の炎が細くなった。芯の赤も消える。老人を支える腕に重さがかかり、足音だけが通路へ残った。'),
  branch(
   [narrate('入口へ呼びかけると、返事が来た。細い声は途中で途切れ、靴音に変わった。')],
   [narrate('入口の明かりは、曲がり角の向こうだ。老人の杖が石を打つ。暗い通路で、別の音がそれに重なった。')]
  ),
  narrate('さっきまで火の外にいたものが、すぐ前まで来ている。老人を壁へ寄せ、武器を抜いた。')
 ],
 rescue:[
  narrate('通路の先で火が跳ねた。くらがりが身をよじり、明かりの外へ退く。新人は足を踏ん張り、松明をこちらへ差し出していた。腰には、入口で見た油瓶が揺れている。'),
  branch(
   [say('rookie','声が聞こえたから。返事だけして、待っていられませんでした。')],
   [say('rookie','戦う音が聞こえて。帰り道を照らすなら、ここまで行かなきゃって。')]
  ),
  say('rookie','怖いです。まだ。だから、早く一緒に帰ってください。'),
  say('elder','松明を、少し下げてくれ。足元が見える。'),
  narrate('新人が灯を下げると、老人はその明かりへ足を出した。空の油瓶が、新人の瓶へこつんと当たった。')
 ],
 gate:[
  narrate('入口の篝火が、一行の影を階段へ伸ばした。老人が手すりをつかむ。新人は、その足先へ松明を寄せた。'),
  say('elder','そこだ。一段、上げるぞ。'),
  say('rookie','詰所まで、僕が灯を持ちます。'),
  narrate('階段の上から、町の話し声が聞こえてきた。老人の腕を支え直し、灯番詰所へ向かう。')
 ],
 post:[
  narrate('リネが扉を開け、老人へ椅子を引いた。新人は松明を壁の受け金具へ掛けようとして、二度、外した。'),
  say('rine','二人とも、座って。巡灯路は今夜、閉めます。'),
  narrate('老人が立ちかけると、リネがその杖を椅子へ立てかけた。'),
  say('rine','修繕班は私が手配します。見た場所を伝えてもらえると助かる。二人には、少し誰かがついていてほしいけれど。'),
  say('elder','灯の位置なら、わしが……。'),
  say('rookie','今日は、ここにいてください。先生。'),
  narrate('老人は口を閉じ、靴の紐をほどき始めた。机の上には経路図と、湯の入った椀が並んでいる。'),
  say('rine','付き添いを頼むなら、申し送りは私から。修繕班へ直接話してくれるなら、手当を足します。どちらでも、この二人は休ませましょう。')
 ]
};

node('entry').options[0].text='入口の火を守り、戻るこちらの足元を照らしてほしい';
node('entry').options[0].commands=[say('rookie','はい。帰ってくる方を、ちゃんと見てます。')];
node('entry').options.push({id:'signal',text:'呼びかけたら答えてほしい。入口の位置が分かるように',to:'dark',effects:[],action:'entry_signal',commands:[say('rookie','声なら、出せます。呼んでください。必ず、返事をします。')]});
s.story.actions.entry_signal=structuredClone(s.story.actions.entry_talk);
s.story.actions.entry_signal.depart.push(set('signalAgreed'));
node('dark').options[0].text='消えた壁松明へ火を寄せ、油受けを確かめる';
node('empty').options[0].text='松明を掲げ、杖の音のする支道へ進む';
node('old').options[0].text='肩を貸し、入口の灯へ一緒に戻る';
node('outage').options[0].text='新人が運んできた火を受け、老人を支える';
node('rescue').options[0].text='新人の灯で足元を確かめ、二人を連れて入口へ戻る';
node('gate').options[0].text='老人を支えて階段を上り、灯番詰所へ連れ帰る';
node('post').options[0].text='修繕班へ、見た壁灯の位置を申し送る';
node('post').options[1].text='二人のそばに残り、温かいものを渡す';

// Dialogue belongs to the battle event, so its saved VM position is respected.
const rescueEvent=s.sceneFlow.outage[0].events[0];
rescueEvent.commands[1]=branch(
 [say('rookie','聞こえました！ こっちへ……いえ、僕がそっちへ行きます。灯を、受け取って！')],
 [say('rookie','争う音がして……入口だけ照らしていても、だめだと思って。そこにいてください、今、行きます！')]
);

s.endingDialogue={
 informed:[
  say('rine','ここは私が。二人とも、もう立たないこと。'),
  narrate('詰所へ来た修繕班に、消えた二つの壁灯と、老人のいた支道を伝える。班長は経路図の印をなぞり、油を積んだ台車を戸口へ寄せた。巡灯再開の札は、まだ裏返しのままだ。'),
  narrate('振り返ると、新人は椀を両手で抱えていた。松明を握っていた指の白さが、少しずつ引いていった。')
 ],
 compromise:[
  say('rine','では、図は私が預かります。何かあったら、すぐ呼んで。'),
  narrate('リネは戸口で修繕班への申し送りを始めた。巡灯再開の札は裏返されたまま、戸に掛かっている。椀を受け取った新人は、ひと口飲む前に老人の方へ傾けた。'),
  say('elder','お前の分だ。わしには、もう来てくれたろう。'),
  narrate('新人は小さく頷き、今度は自分の口へ椀を運んだ。机の端で、空の瓶が二つ、肩を寄せていた。')
 ]
};
s.outcomes.informed={label:'経路図と、ほどけた指',text:'一行は灯番詰所へ戻った。探索隊は油切れの壁灯と支道の位置を修繕班へ申し送り、リネが二人の休養を引き受けた。修繕の準備が始まる傍ら、新人は温かい椀を両手で包んでいた。'};
s.outcomes.compromise={label:'並んだ二つの空瓶',text:'一行は灯番詰所へ戻った。修繕班への申し送りをリネに任せ、探索隊は二人のそばに残った。新人は老人へ椀を差し出し、今度は自分も温かいものを飲んだ。机の端には、空の油瓶が二つ並んでいた。'};

// Optional inspections use the same adopted facts without the old author's
// correction language. The underlying fixture state machine is unchanged.
s.inspectionText={
 empty:'油受けの底は乾き、古い油の輪だけが残っている。芯へ火を寄せると、先が赤くなって消えた。',
 low:'油受けの底に、小さな炎が映っている。壁を背にすれば、火の届く範囲に身体を寄せられそうだ。',
 extinguished:'芯は黒く、油受けの底まで見えている。火は消えている。',
 lit:'壁松明が石の床を照らしている。'
};
s.dungeonPreparation=[
 narrate('入口の篝火が、通路の石を赤く照らしている。明かりの縁より奥で、何かが石をこすった。'),
 {op:'if',condition:{op:'eq',left:{ref:'dungeons.active.systems.fires.portable.lit'},right:true},then:[
  narrate('携帯松明にも火がある。柄を持ち直すと、明かりが手元と一緒に動いた。'),
  {op:'choice',options:[
   {id:'record',text:'入口の火と、持ち歩く灯を手帳に記す',condition:{op:'ne',left:{ref:'flags.dungeonNotes.kagaribi'},right:true},commands:[{op:'set',target:'flags.dungeonNotes.kagaribi',value:true},narrate('篝火の位置と、携帯松明の残量を手帳に記した。')]},
   {id:'leave',text:'探索へ戻る',commands:[]}
  ]}
 ],else:[narrate('携帯松明は消えている。入口の篝火を調べれば、火を移せる。')]}
];

s.design={
 experienceIntent:'足の止まった新人にできる役割を頼み、助けに来た本人の返事を受け取る。救助後に、現場の申し送りか二人への付き添いを引き受ける。',
 dramaticKernel:'老人を捜し、介助して帰す共同救助。入口で支えられる側だった新人の火が、帰路では老人の足元を示す。最後に残るのは今夜どの仕事を引き受けるかであり、修繕と休養の二者択一ではない。',
 agency:'徒歩経路、入口で新人へ頼む役割、帰還後に先に引き受ける仕事を選ぶ。固定の帰路戦闘と新人の救援は共通。入口の約束は関係・会話の差であり、戦術的有利さや新結末を約束しない。',
 choices:[
  {id:'entry_talk',visibleMotive:'新人の「ここからでも、何かできませんか」に応じ、入口の火と帰る方向を任せる。',payoff:['entryの返事','戦闘中の「入口だけ照らしていても」','rescueの「帰り道を照らすなら、ここまで行かなきゃ」']},
  {id:'entry_signal',visibleMotive:'新人は足を出せないが、声を出す役割なら引き受ける。入口の方向を知る助けとして頼む。',payoff:['entryの「必ず、返事をします」','outageの返事と靴音','戦闘中の「聞こえました」','rescueの「返事だけして、待っていられませんでした」']},
  {id:'post_repair',visibleMotive:'油切れの二箇所を実際に見た探索隊が直接伝える。リネが付き添いを引き受け、追加手当の申し出がある。',payoff:['修繕班が図の印を受け取る','リネが二人を座らせる','椀を持つ指']},
  {id:'post_rest',visibleMotive:'新人は松明を掛けられず、老人も休もうとしない。二人のそばへ残り、申し送りをリネへ任せる。',payoff:['リネが修繕班へ申し送る','新人が老人へ椀を差し出す','空瓶が並ぶ']}
 ],
 counterfactuals:[
  {id:'wait',result:'会話を読む現実時間で老人の死亡を判定しない。支道の灯の消灯は帰路イベントで確定し、残り何秒という期限を本文に置かない。'},
  {id:'delegate',result:'帰還後の修繕班の手配と申し送りはリネへ委任できる。付き添いを選んでも修繕を放置する結末にしない。'},
  {id:'both',result:'修繕の準備と二人の休養はどちらの結末でも進む。選ぶのは探索隊が先に担う役割であり、偽の両立不能を提示しない。'},
  {id:'refuel',result:'初版から継承する固定消灯イベントは、途中の燃料補充にかかわらず発生する。操作で回避できる自由な燃料シミュレーションとしては未対応。本文は消灯を観測し、補充量からの自然枯渇という原因を断定しない。'},
  {id:'defeat',result:'救助前の敗北は既存checkpointで老人の場面へ戻す。実際に受けた戦闘損失は共有エンジンの規則に従い、新人の油は消費しない。'}
 ],
 additions:[
  '入口で新人へ呼び声の返事を頼む会話と、それへの承諾。',
  'リネは帰還時に椅子と温かい椀を用意し、探索隊が担当しない方の仕事を引き受ける。',
  '既存の修繕結末の追加報酬は直接申し送りの手当として選択前に示す。'
 ],
 openIssues:[{id:'q001-fixed-outage',checks:['V12-MECHANISM','V12B-ALTERNATIVE-RETURN'],status:'needs_review',text:'既存の固定消灯・救援演出を保持した。老人場面の燃料8、帰路の0、救援の25への代入は、補充を含む自由な火の運用と統合した物語規則として未再設計。新たな風や呪いを後付けして矛盾を覆わない。第2版をv1.2b全項目準拠とは表示しない。'}]
};

export default s;
