import {O,give,set,see,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(201,'消された休み印','油蔵の記帳係ナヴィア',{desk:'油蔵の記帳台',bench:'交差路の休憩ベンチ'},{desk:point('kagaribi_oilstore',5,1),bench:point('kagaribi_crossroads',5,1)},'働かなかった時間を正しく書くことで、働いた人の生活を削ってしまうとき、誰が訂正の責任を負うか。');
person(s,'clerk','desk','ナヴィア','油蔵の記帳係','休憩の記録を確かめ、運搬人の給金を止めない','休み印が残れば欠勤扱いにされる','他人のためだったという言い訳で改竄を認めること','休憩を命じた本人。給金規則を読んだが、例外の申請をしていない。');
person(s,'porter','bench','エン','油の運搬人','休んだことも働いたことも自分の名で残す','記帳係は自分を怠け者だと思っている','署名を断れば次の仕事がなくなること','休憩を命じられたことは知るが、休み印が消された理由は知らない。');
s.entity('ledger','clerk').entity('note','porter').bool('heard').bool('signed').bool('advance').enum('record','open',['open','corrected','pending','private']);
s.fact('rest','エンは油漏れの手当ての後、ナヴィアに命じられて休んだ。').fact('erased','ナヴィアは休憩を欠勤と扱う支払規則を恐れ、自分の休憩命令の印を消した。');
s.brief='油蔵の勤務帳から休み印が一つ消えている。記帳係は、交差路で待つ運搬人にその日のことを聞いてほしいという。';
s.past=['エンは油を運び終えた後、手の皮が剥け、ナヴィアの指示で休憩した。','ナヴィアは休憩分の減額を恐れ、帳面の休み印を消した。支払いはまだ確定していない。'];
s.revealText=s.past.join(' ');s.progression='運搬人の話を聞き、本人が書いた休憩の覚え書きを運ぶ。消した理由を聞いた後、訂正・立替え・私的保管の責任を選ぶ。';
s.node('entry','desk',['clerk'],'ナヴィアは帳面の一行だけに乾いた布を当てていた。「数字は合っています。休み印だけ、確かめてきてください」。交差路で待つエンには、まだ給金を渡していない。',[
 O('ask','交差路へ行き、エン本人から話を聞く','witness')]);
s.node('witness','bench',['porter'],'エンは指に巻いた布をほどいた。「休めと言ったのは向こうです。怠けたことにするなら、せめて自分でそう書いてくれ」。彼は休憩時刻と理由を書いた紙を差し出す。「渡していい。ただ、俺の署名を勝手に足すな」',[
 O('take','覚え書きを預かり、油蔵へ戻る','reason')]);
s.node('reason','desk',['clerk'],'覚え書きを見たナヴィアは、帳面を隠さなかった。「休みを載せると欠勤分が引かれる。だから消しました。命じたのは私です」。善意で消した印は、エンには怠慢を疑われた跡に見えていた。訂正しても減額の判断は別に残る。',[
 O('correct','命令者の署名付きで訂正し、減額の扱いを保留して提出する','@corrected',[give('note','party','clerk'),set('signed'),set('record','corrected')]),
 O('advance','20Gを立て替え、記録を訂正して減額審査を待つ','@advanced',[give('note','party','clerk'),set('signed'),set('advance'),set('record','pending')],{cost:{gold:20}}),
 O('private','公簿の訂正を保留し、覚え書きをエンへ返しに行く','return')]);
s.node('return','bench',['porter'],'エンの前へ戻った。公簿を直さずにおくなら、仕事の証拠は本人の手に残す必要がある。ナヴィアが印を消した理由も、彼にはまだ伝わっていない。',[
 O('explain','理由を伝え、未訂正のままだと説明して覚え書きを返す','@private',[give('note','party','porter'),set('heard'),set('record','private')])]);
s.end('corrected','消した人の名で訂正する','ナヴィアは休憩を命じ、印を消した二つの行為に署名した。給金の結論は保留された。エンの休憩は、本人の怠慢と決めつけられない記録になった。',and(s.is('record','corrected'),s.is('signed'),s.is('noteAt','clerk')));
s.end('advanced','前渡し金を用意する責任を負う','ナヴィアは訂正に署名し、探索隊の20Gをエンへの前渡し金として預かった。返済の約束は取っていない。記録も審査も残り、支払いの遅れだけを探索隊が引き受けた。',and(s.is('record','pending'),s.is('advance'),s.is('noteAt','clerk')));
s.end('private','本人の手元に証言を残す','エンは覚え書きを折ってしまった。「助けるつもりなら、先に言えばよかったのに」。公簿は直らず、給金も未確定だ。少なくとも彼は、印を消した理由と、後で申し立てるための紙を持っている。',and(s.is('record','private'),s.is('heard'),s.is('noteAt','porter'),s.is('partyAt','bench')));
s.routeNotes=[['油蔵の記帳台','消された休み印について依頼を受ける。'],['交差路の休憩ベンチ','エンの証言と覚え書きを受け取り、油蔵へ運ぶ。'],['油蔵／交差路','署名訂正、20Gの前渡し、本人への覚え書き返却を選ぶ。返却の場合は交差路まで歩く。']];
export default worldRoutes(s,[['entry_ask','bench',{arrive:[see('rest','porter')]}],['witness_take','desk',{depart:[give('note','porter','party')],arrive:[see('erased','clerk')]}],['reason_private','bench']]);
