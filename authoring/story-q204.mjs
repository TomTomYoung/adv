import {O,give,set,see,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(204,'削れない帰還日','納骨所の書記エイン',{shelf:'納骨所の記録机',bench:'交差路の荷待ち場'},{shelf:point('kagaribi_ossuary',5,1),bench:point('kagaribi_crossroads',9,1)},'助かった人が名乗れないとき、記録の正しさと本人の安全をどう両立させるか。');
person(s,'scribe','shelf','エイン','帰還記録の書記','死者の名簿へ生存者を残さない','誤記を削れば正しい帳面に戻せる','自分の記帳が生きた人を消したこと','二年前に未帰還の報告を受けてリュカの名を追悼欄へ写した。遺体を確認した記録ではない。');
person(s,'survivor','bench','リュカ','追悼欄に名のある運搬人','生きていることを伝えつつ、身を寄せる場所を守る','名乗れば逃げた家へ連れ戻される','所在が家族へ広がること','事故後に別の出口から帰還し、暴力のある家へ戻らず働き始めた。現在地の公開を拒む。');
s.entity('copy','scribe').entity('statement','survivor').enum('consent','none',['none','named','sealed']).enum('record','open',['open','addendum','sealed','pending']).bool('explained');
s.fact('alive','リュカ本人が生存を認め、事故後に帰還を届けなかった事情を話した。');
s.brief='納骨所の追悼欄にある名を、交差路で働く人が名乗っている。書記は名前を削る前に本人を訪ねてほしいという。';
s.past=['リュカは二年前の事故を生き延びたが、家へ戻ることを恐れて帰還を届けなかった。','エインは未帰還者の報告を追悼欄へ写した。遺体や死亡を確認した記録はない。既存の石棚の名札とは別の記録である。'];
s.revealText=s.past.join(' ');s.progression='追悼欄の写しを本人へ見せ、所在を伏せる条件を聞く。公開名の追記、封緘証言、未確認への訂正を選び、納骨所へ持ち帰る。';
s.node('entry','shelf',['scribe'],'エインは削り刀を帳面の脇へ置いた。「この名の人が荷を運んでいるそうです。間違いなら、消さないと」。追悼欄の元になった紙には「未帰還」とあり、死亡を確かめた者の名はない。',[
 O('visit','欄の写しを持ち、交差路の本人を訪ねる','meeting')]);
s.node('meeting','bench',['survivor'],'写しを見たリュカは、自分の名を指した。「生きてる。でも、居場所は書かないで」。事故の後、暴力を振るう家族のもとへ戻らず、別の仕事を始めたという。「名前を直すのと、迎えを呼ぶのは、同じじゃないよね」',[
 O('named','所在は載せず、生存した名だけ追記する同意と署名をもらう','report',[give('statement','survivor','party'),set('consent','named')]),
 O('sealed','氏名入り証言を封じ、閲覧を担当書記に限る条件で預かる','report',[give('statement','survivor','party'),set('consent','sealed')]),
 O('pending','署名は求めず、元の報告が未帰還だった点だけ訂正しに戻る','pending')]);
s.node('report','bench',['survivor'],'リュカは自分で署名し、証言を渡した。働いている区画は本文に書かない。「帳面を直したら、私はここで仕事を続ける。それまで約束してとは言わない」。未来の安全を保証したことにはしない。',[
 O('carry','証言と写しを納骨所へ運ぶ','filing')]);
s.node('filing','shelf',['scribe'],'エインの前に戻った。削り刀はまだ机の上にある。元の未帰還報告を残し、何が後から確かめられたかを追記する方法を説明できる。本人の所在を知らせる必要はない。',[
 O('add','公開に同意した名と生存確認を追記し、元の記録を残す','@addendum',[give('statement','party','scribe'),give('copy','party','scribe'),set('explained'),set('record','addendum')],{when:s.is('consent','named')}),
 O('seal','証言を封緘保管し、公開欄を「死亡未確認」へ訂正する','@sealed',[give('statement','party','scribe'),give('copy','party','scribe'),set('explained'),set('record','sealed')],{when:s.is('consent','sealed')})]);
s.node('pending','shelf',['scribe'],'署名を求めず、写しを持って戻った。元の報告に死亡確認がないことは、この机の書類だけでも確かめられる。本人の事情を公簿の材料にする同意は取っていない。',[
 O('correct','本人の事情を伏せ、未帰還と死亡確認を分けて記す','@pending',[give('copy','party','scribe'),set('record','pending')])]);
s.end('addendum','消さずに、生きている名を足す','エインは古い欄を削らず、本人の同意を得た生存確認を追記した。所在は載せなかった。帰還を数え落とした履歴も、いま生きている名も、同じ帳面に残った。',and(s.is('record','addendum'),s.is('consent','named'),s.is('statementAt','scribe')));
s.end('sealed','公開する訂正と封じる証言を分ける','証言は担当書記だけが開ける封に収められ、公開欄は死亡未確認へ訂正された。生存確認を誰もが読める形にはしなかった。書記には、封を守り、必要な訂正を続ける責任が残る。',and(s.is('record','sealed'),s.is('consent','sealed'),s.is('statementAt','scribe')));
s.end('pending','分からないことを死亡にしない','追悼欄には、元の報告が未帰還であり、死亡確認をしていないと追記された。リュカの生存証言を提出したことにはしなかった。削り刀を使わずに、帳面が断定しすぎた部分を直した。',and(s.is('record','pending'),s.is('consent','none'),s.is('statementAt','survivor'),s.is('copyAt','scribe')));
s.routeNotes=[['納骨所の記録机','未帰還報告から追悼欄へ写された名の照会を受ける。'],['交差路の荷待ち場','リュカに写しを見せ、所在の非公開と証言の扱いを確認する。'],['納骨所の記録机','公開同意付きの生存追記、封緘証言と死亡未確認への訂正、元資料だけによる訂正のいずれかを行う。']];
// 探索隊への依頼報酬。物語内の給金・立替金・私物とは別に精算する。
Object.assign(s.outcomes.addendum,{gold:60,xp:300,gems:18});
Object.assign(s.outcomes.sealed,{gold:60,xp:300,gems:18});
Object.assign(s.outcomes.pending,{gold:60,xp:300,gems:18});
export default worldRoutes(s,[['entry_visit','bench',{depart:[give('copy','scribe','party')],arrive:[see('alive','survivor')]}],['report_carry','shelf'],['meeting_pending','shelf']]);
