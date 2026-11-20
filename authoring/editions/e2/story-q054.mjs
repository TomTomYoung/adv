import {O,set,give,and,when} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const pawn=marketQuest(54,{
  counter:['地下質屋の返却窓口',17,3],shelf:['夢の瓶の保管棚',17,4],waiting:['質屋の待合',15,3]
},{
  yuno:['counter','質屋のユノ','返済と実物の引き渡しを別々に確かめる'],
  client:['waiting','夢を預けた客','自分が預けた夢を受け取る',['shelf','counter']]
});
export const dreamCharacters=pawn.characters;
export function dreamSource(){
  const {s,scene,implies,finish}=pawn.create(),is=s.is;
  s.entity('own','shelf').entity('bright','shelf').entity('slip','client').entity('vault','shelf')
    .bool('matched').bool('repaid').bool('signed').bool('sealed').bool('called').bool('examined');
  scene('entry','counter','返済を済ませた客が、待合で眠れずにいる。ユノが棚から外した名札を並べた。帳簿には返却済みの印があるのに、窓口からは夢の瓶が一つも出ていない。',[
    O('bright','光の強い瓶を選ぶ','bright'),O('all','全瓶を保全','seal'),O('customer','客を呼ぶ','invite')
  ]);
  scene('bright','shelf','暗い棚の奥で一番明るく輝く瓶を選んだ。瓶の口に合言葉の留め具がある。誰の言葉に応じるかは確かめていない。',[
    O('take','瓶を預かる','bright_load',[give('bright','shelf','party')])
  ]);
  scene('bright_load','shelf','瓶を包んでも、布の継ぎ目から見覚えのない山影が透けてくる。待合の客に運ぶ。',[O('bring','待合へ','bright_hand')]);
  scene('bright_hand','waiting','「こんな山、見たことがあったかな」。客は首をかしげながら、一番明るい瓶に手を伸ばした。',[
    O('hand','客に渡す','@contract',[give('bright','party','client')])
  ]);
  scene('invite','waiting','客は乾いた返済印の紙を握っていた。「預けたのは、家の井戸で弟と声を出した時の夢です」。一緒に棚へ来て、瓶にその言葉をかけてくれるという。',[O('lead','保管棚へ同行','voice')]);
  scene('voice','shelf','「底まで届いたか」。客の囁きに、一本だけが「届いた」と返した。光が一番強い瓶は黙ったままだ。',[
    O('listen','返事を確かめる','response',[set('matched')])
  ]);
  scene('response','shelf','客が返済印を広げた。返事をした瓶をこの印と合わせて窓口へ運ぶか、ここで全員の照会に切り替えるか。',[
    O('receipt','返済印と照合','picked',[give('own','shelf','party')]),O('collective','一括照会へ','seal')
  ]);
  scene('picked','shelf','一行は返事をした瓶を包んだ。印のある紙は客が自分で持ち、窓口でユノに見せる。',[O('bring','窓口へ同行','check')]);
  scene('check','counter','ユノが紙と帳簿の番号を照合した。「返済は済んでいます。棚から名札を外した時に、引き渡しの欄まで埋めてしまった」。客が瓶を手に取って中を確かめる。',[
    O('inspect','客に確かめてもらう','counter',[set('repaid'),give('own','party','client'),set('examined')])
  ]);
  scene('counter','counter','客の掌の中で、弟の声がもう一度した。ユノは引き渡し欄に訂正線を引く。「今、受け取りますか。それとも全員の照会が済むまで預け直しますか」',[
    O('return','受領を確定','@informed',[set('signed')]),O('hold','いったん預け直す','held',[give('own','client','party')])
  ]);
  scene('held','counter','客は受領欄を空けたまま瓶を一行に戻した。元の棚へ運び、ほかの預かり瓶と一緒に封じる。',[O('carry','保管棚へ','restore')]);
  scene('restore','shelf','客が確かめた瓶を元の列に戻す。返済印の控えには照会待ちと書いた。',[
    O('replace','元の棚に戻す','seal',[give('own','party','shelf')])
  ]);
  scene('seal','shelf',when(is('matched'),'返事をした瓶もほかの瓶も、一人ずつ照会が済むまで保管する。','名札を失った瓶を一点ずつ数えた。勝手に売り渡さぬよう、棚の扉に封を通す。'),[
    O('close','全瓶を封じる','sealed',[give('own','shelf','vault'),give('bright','shelf','vault'),set('sealed')])
  ]);
  scene('sealed','shelf','封紙に本数を記した。次は窓口でユノに顧客名簿を開いてもらう。',[O('report','返却窓口へ','inquiry')]);
  scene('inquiry','counter','ユノが返済した人を一人ずつ名簿から拾う。店先に貼る呼び出しには、受領した人まで含めて現物を確かめたい、と添えた。',[
    O('call','一斉に照会','@compromise',[set('called')])
  ]);
  implies('receipt',is('signed'),and(is('repaid'),is('matched'),is('ownAt','client')),'本人確認と返済記録を合わせて受領する');
  implies('sealed',is('sealed'),and(is('ownAt','vault'),is('brightAt','vault')),'全瓶が棚に戻ってから封じる');
  return finish([['entry_bright','shelf'],['entry_all','shelf'],['entry_customer','waiting'],['bright_load_bring','waiting'],['invite_lead','shelf',['client']],['picked_bring','counter',['client']],['held_carry','shelf'],['sealed_report','counter']],{
    informed:is('signed'),contract:and(is('brightAt','client'),is('ownAt','shelf')),compromise:and(is('sealed'),is('called'))
  });
}
