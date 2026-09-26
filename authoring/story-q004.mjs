import {connectWorld} from './world-story-kit.mjs';
import {story,O,move,give,set,see,and,not} from './story-kit.mjs';
 const s=story(4,{outside:'関所の外',desk:'公開窓口',cell:'留置室',office:'地上の審査窓口'},[['outside','desk'],['desk','cell'],['outside','office']]);
 s.entity('ina','outside','ina').entity('sister','cell','sister').entity('keeper','desk','passkeeper').entity('reviewer','office','reviewer').entity('original','keeper').entity('copy','ina').entity('register','keeper');
 for(const k of ['windowOpen','truthKnown','sistersConsent','keeperConsent','filed','released','copyInvalid','numberRevoked','provisional'])s.bool(k);
 s.fact('shared','イナが姉の写しで先に入場し、後から同じ番号の原本を提示した姉が拘束された').fact('duty','勤務簿には関所番が申告した勤務名義がある').fact('resident','別管理の住民登録簿では、その名義人は死亡している').fact('brother','関所番は死んだ兄の名義を使っている');
 s.brief="地下関所で姉が拘束されました。姉とイナが持つ通行証には、同じ番号が記されています。";
 s.past=["地下通行資格を持つのは姉だけだった。資格取得前のイナは姉の通行証を写し、姉妹は同じ番号の証を別々に使用した。イナが写しで入場した後、姉が原本を提示したため、同じ番号が同時に使われたと判定され、姉が拘束された。関所番もまた、住民登録上は死亡している兄の就業資格を使って勤務している。"];
 s.authoringNotes={"notice":"以下の事実はq004を成立させる世界設定上の制約です。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はありません。ただし、生成・改稿時に矛盾させてはいけません。","factsHeading":"世界設定上の事実","facts":["地下通行証は一つの資格と一人の名義に対応し、関所では番号ごとに入退場を記録します。同じ番号の人物が地下にいる間、その番号を使った二人目は通過できません。","イナの持つ証は姉の原本を写した複製です。イナが先に通過したため、後から原本を提示した姉がその場で拘束されました。","関所の通行記録、勤務簿、住民登録簿は別々に管理されています。そのため、関所番が死亡した兄の名義で勤務している事実は、勤務簿だけを見ても発覚しません。"]};
 s.revealText=s.past.join(' ');s.progression="二枚の通行証と入退場記録から姉の拘束理由を確かめる。番人の勤務名義を住民登録簿まで照合した場合だけ、三人の資格問題を同じ審査へ戻せる。";

 s.node('entry','outside',['ina'],'イナは姉の通行証を写した紙を見せた。「先に入ったのは私です。後から来た姉が捕まったと聞いて、引き返してきました」。水路脇の戸口が詰所だ。原本は番人に押収され、姉は奥の留置室にいる。',[
  O('window','イナと詰所へ入り、二枚の通行証を照合する','duplicate'),
  O('force','詰所へ入り、奥の留置室へ向かう','force_entry')
 ]);
 const fine=[give('copy','ina','keeper'),move('sister','cell','desk'),give('original','keeper','sister'),set('released'),set('copyInvalid')];
 const sisterRemote={entity:'sister',mode:'remote',requires:s.is('windowOpen')};
 s.node('duplicate','desk',['ina','keeper',sisterRemote],'受付の入退場記録には、イナが写しで入場した時刻と、姉の原本が止められた時刻が続いていた。番人は同じ番号を指した。「一人が中にいる間、二人目は通せない」。面会窓の姉も複製を認める。勤務簿はここにあるが、住民登録簿は地上の通行資格審査所で別に管理されている。',[
  O('fine','複製を認め、窓口で罰金を納めて姉を引き取る','fine_release',fine,{cost:{gold:20}}),
  O('inspect','番人の勤務名義を控え、地上の通行資格審査所へ向かう','registry')
 ]);
 s.node('registry','office',['reviewer'],'地上の審査窓口で、勤務簿から控えた名義を住民登録簿と照合した。記録上、その名義人はすでに死亡している。これだけでは、地下で働いている番人との関係までは分からない。本人に確かめる必要がある。',[
  O('return','死亡記録の写しを携え、地下の詰所へ戻る','consent')
 ]);
 s.node('consent','desk',['ina','keeper',sisterRemote],'詰所へ戻り、住民登録簿の死亡記録を示すと、番人は兄の名で働いていると認めた。イナが面会窓の姉を見る。「私たちのことも、この人のことも、全部話すの？」。申告すれば、三人の資格と勤務が審査の対象になる。',[
  O('file','三人に不利益を説明して同意を取り、地上へ申告に行く','filing',[],{when:s.is('truthKnown')}),
  O('fine','姉妹の違反だけを処理し、窓口で罰金を納める','fine_release',fine,{cost:{gold:20}})
 ]);
 s.node('filing','office',['reviewer'],'審査窓口へ戻った。姉妹と番人の同意を得てきたが、申告はまだ提出していない。三人の名義と、地下に残る原本・写し・通行記録の所在を申告書に記す。',[
  O('submit','申告書を提出し、地下関所での現場確認を依頼する','escort',[set('filed')])
 ]);
 s.node('escort','office',['reviewer'],'審査官が申告を受理し、住民登録の記録を鞄に収めた。「現物と本人を、地下の窓口で確かめます」。姉妹と番人はまだ詰所にいる。',[
  O('accompany','審査官と地下水道を歩き、詰所へ戻る','review')
 ]);
 s.node('review','desk',['ina','keeper','reviewer',sisterRemote],'審査官と詰所へ着いた。受付に通行記録、勤務簿、原本と写し、持参した住民登録の記録を並べる。姉は自分の資格を使い、イナはその写しを使った。番人の勤務名義は亡兄のものだった。',[
  O('issue','証書を提出し、別々の仮証の発行と姉の釈放を見届ける','issued',[give('copy','ina','reviewer'),give('original','keeper','reviewer'),set('provisional'),set('copyInvalid'),move('sister','cell','desk'),set('released')])
 ]);
 s.node('issued','desk',['ina','sister','keeper','reviewer'],'留置室の錠が開き、姉が受付へ出てきた。姉妹は別々の仮証を受け取り、元の証と写しは審査官が預かる。番人は勤務を止められ、審査官と詰所に残る。',[
  O('leave','姉妹と詰所を出て、関所の外へ戻る','issued_outside')
 ]);
 s.node('issued_outside','outside',['ina','sister'],'姉妹と関所の外へ戻った。二人の手には、それぞれ別の仮証がある。正式資格の審査はこれから続く。',[
  O('finish','二人の帰路を確かめ、依頼を終える','@informed')
 ]);
 s.node('fine_release','desk',['ina','sister','keeper'],'罰金を納め、イナの写しを渡した。番人が留置室を開け、受付へ来た姉に原本を返す。有効な通行資格は、姉のもの一つだけだ。',[
  O('leave','姉妹と詰所を出て、関所の外へ戻る','fine_outside')
 ]);
 s.node('fine_outside','outside',['ina','sister'],'姉妹を連れて関所の外へ出た。イナの写しは窓口で回収された。二人が別々に地下へ通えるようになったわけではない。',[
  O('finish','姉の原本と二人の帰路を確かめ、依頼を終える','@compromise')
 ]);
 s.node('force_entry','cell',['sister'],'受付の奥、留置室の前まで来た。姉は鉄格子の向こうにいる。錠を破れば番人が駆けつける。押収された通行証の原本は、受付に残ったままだ。',[
  O('break','錠を破り、駆けつけた番人を退ける','force_freed',[set('released'),set('numberRevoked')],{combat:true})
 ]);
 s.node('force_freed','cell',['sister'],'錠が壊れ、姉が留置室から出た。イナは関所の外で待っている。原本を取り返す余裕はなく、この番号は関所破りに使われたものとして記録された。',[
  O('escort','姉を連れて受付を抜け、関所の外へ戻る','force_outside')
 ]);
 s.node('force_outside','outside',['ina','sister'],'姉を連れて関所の外へ戻ると、イナが駆け寄った。原本は番人の手元にあり、その番号も写しも、もう通行には使えない。',[
  O('finish','姉妹の安全を確かめ、依頼を終える','@contract')
 ]);
 s.sceneAliases={window:'duplicate'};
 const route=connectWorld(s,{
  outside:{kind:'dungeon',dungeon:'region_1',map:'region_1_landing',x:13,y:5,event:'q004_decision'},
  desk:{kind:'town',location:'waterway_checkpoint'},
  cell:{kind:'town',location:'waterway_checkpoint_holding'},
  office:{kind:'town',location:'hikarigaeri_pass_registry'}
 },2);
 route('entry_window','desk',{companions:['ina'],arrive:[set('windowOpen'),see('shared','register')]});
 route('entry_force','cell');
 route('duplicate_inspect','office',{depart:[see('duty','keeper')],arrive:[see('resident','reviewer')]});
 route('registry_return','desk',{arrive:[see('brother','keeper',and(s.known('duty'),s.known('resident'))),set('truthKnown')]});
 route('consent_file','office',{depart:[set('sistersConsent'),set('keeperConsent')]});
 route('escort_accompany','desk',{companions:['reviewer']});
 route('issued_leave','outside',{companions:['ina','sister']});
 route('fine_release_leave','outside',{companions:['ina','sister']});
 route('force_freed_escort','outside',{companions:['sister']});
 s.end('informed',"三人の名義を審査へ戻す","通行記録、勤務簿、住民登録簿を照合し、姉妹による通行証の複製・共用と、番人による兄名義の使用を審査へ戻した。現場確認の間、姉妹には別々の仮証が発行され、姉は釈放された。番人は勤務を止められ、兄の名を使った経緯の審査を受ける。三人とも正式資格の結論はまだ先にある。",and(s.is('released'),s.is('provisional'),s.is('filed'),s.is('sistersConsent'),s.is('keeperConsent'),s.is('partyAt','outside'),s.is('sisterAt','outside'),s.is('inaAt','outside')));
 s.end('contract',"錠を破って姉を連れ出す","姉を関所の外へ連れ出した。押収された原本は番人の手元に残り、関所破りに使われた番号として取消扱いになった。イナの写しも通行には使えない。姉妹は自由になったが、資格を得たわけではない。",and(s.is('released'),s.is('numberRevoked'),s.is('sisterAt','outside'),s.is('partyAt','outside')));
 s.end('compromise',"罰金で留置を解く","姉妹は通行証を複製した事実を認め、罰金を納めた。姉は釈放されて原本を返され、イナの写しは回収・失効した。有効な資格は姉の一つだけで、二人が別々に通行できる状態にはならなかった。番人の名義については審査へ申し立てなかった。",and(s.is('released'),s.is('copyInvalid'),s.is('originalAt','sister'),not(s.is('provisional')),s.is('partyAt','outside'),s.is('sisterAt','outside'),s.is('inaAt','outside')));

export default s.done();
