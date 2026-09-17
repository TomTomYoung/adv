import {story,O,move,give,set,see,and} from './story-kit.mjs';
 const s=story(2,{landing:'引き揚げ場',water:'浅瀬の荷崩れ',school:'医学校の標本室',office:'保険審査所',transit:'移動中（現在地はワールド状態）'},[['landing','water'],['landing','school'],['landing','office'],['transit','landing'],['transit','school'],['transit','office']]);
 s.entity('belt','landing','belt').entity('porter','school','porter').entity('curator','school','curator').entity('examiner','office','examiner').entity('box','water').entity('bones','water').entity('tags','box').entity('ledger','curator');
 for(const k of ['opened','schoolKnown','witnessConsent','fraudChecked','returned','tagDelivered'])s.bool(k);
 s.fact('number','骨には医学校の管理番号が刻まれている').fact('loan','管理番号と貸出台帳が一致し、持出し許可のない医学校の貸出標本だと確認した');
 s.fact('alteredTag','荷札の宛名には別人の名前へ書き直された跡がある').fact('missingReport','荷札の宛名は審査所にある失踪届の名前と一致する').fact('claim','保険請求書は同じ失踪者の遺体として標本箱を提出するとしている').fact('testimony','運搬人は、失踪者として届けられた保険加入者の生存と、一味がベルトへ標本の偽装を頼んだ経緯を証言した').fact('fraud','標本番号・書き換えられた荷札・失踪届・保険請求書・運搬人の証言を照合し、生存する保険加入者の遺体偽装を立証した');
 s.brief='地下水路へ落ちた骨箱から人骨が流れ出ています。運送人のベルトは、箱に付いていた荷札だけを回収してほしいと依頼しました。';
 s.past=['ベルトは、生存している保険加入者を失踪者として届け出た一味から依頼を受け、医学校の貸出標本を遺体に見せかけようとした。標本を入れた箱には失踪者の名前へ書き換えた荷札が付き、骨には医学校の管理番号が残っている。ベルトは箱を地下水路へ落としたため、偽装の証拠となる荷札だけを先に回収しようとしている。運搬人は事情を知っているが、仕事を失うのを恐れて黙っている。'];
 s.revealText='医学校の貸出標本に失踪者名の荷札を付け、生存する保険加入者の遺体として提出する偽装だった。運搬人は保険加入者本人ではなく、事情を知る証人である。';
 s.progression='荷札だけの回収、骨箱の引き揚げ、標本番号の照会を分ける。保険不正の立証には、標本番号、書き換えられた荷札、失踪届、保険請求書、事情を知る運搬人の証言が必要。';
 const collectBones={...give('bones','water','box'),when:s.is('bonesAt','water')};
 s.node('entry','landing',['belt'],'地下水路の曲がり角で、口の開いた骨箱が浅瀬に引っ掛かっている。流れ出た骨がその周囲に散っていた。ベルトは箱の縁を指した。「荷札だけ戻してくれ。骨は拾わなくていい」。',[
  O('lift','縄を使って骨箱ごと引き揚げる','box',[move('party','landing','water'),collectBones,give('box','water','party'),move('party','water','landing'),set('opened'),see('number','bones')],{cost:{rope:1}}),
  O('tags','浅瀬の魔物を退け、荷札だけ回収する','tags',[move('party','landing','water'),give('tags','box','party'),move('party','water','landing')],{combat:true}),
  O('school','浅瀬の骨に刻まれた管理番号を写し、医学校へ照会する','school',[move('party','landing','water'),see('number','bones'),move('party','water','landing','school'),see('loan','ledger'),set('schoolKnown')])
 ]);
 s.node('box','landing',['belt'],'流れ出た骨を箱へ集め、縄で岸へ引き揚げた。骨には医学校の管理番号があり、荷札の宛名には書き直された跡がある。ベルトが手を出した。「荷札だけくれ。箱は俺が浅瀬へ戻す」。',[
  O('school','骨の管理番号と荷札の宛名を控え、医学校へ照会する','school',[see('alteredTag','tags'),move('party','landing','school'),see('loan','ledger'),set('schoolKnown')]),
  O('tags','荷札を外してベルトへ渡す','@contract',[give('tags','box','belt'),give('box','party','belt'),move('belt','landing','water'),give('box','belt','water'),move('belt','water','landing'),set('tagDelivered')])
 ]);
 s.node('tags','landing',['belt'],'荷札を箱から外して岸へ戻った。骨箱は浅瀬に残っている。ベルトは濡れた札へ手を伸ばした。「それでいい。渡してくれ」。',[
  O('deliver','荷札だけをベルトへ渡して依頼を終える','@contract',[give('tags','party','belt'),set('tagDelivered')]),
  O('inspect','荷札の書き直された跡を調べ、骨の管理番号を確かめる','school',[see('alteredTag','tags'),move('party','landing','water'),see('number','bones'),move('party','water','landing','school'),see('loan','ledger'),set('schoolKnown')])
 ]);
 const recover=[{...move('party porter','school','landing','water'),when:s.is('boxAt','water')},collectBones,{...give('box','water','party'),when:s.is('boxAt','water')},{...move('party porter','water','landing','school'),when:s.is('partyAt','water')},give('box','party','curator'),{...give('tags','box','curator'),when:s.is('tagsAt','box')},{...give('tags','party','curator'),when:s.is('tagsAt','party')},set('returned')];
 s.node('school','school',['porter','curator'],'標本係は骨の管理番号を貸出台帳と照合した。「貸出用の標本です。この持ち出しは許可していません」。呼ばれた運搬人は、ベルトに頼まれて箱を運んだと認め、回収を手伝うと答えた。',[
  O('recover','管理番号から貸出標本だと確認し、箱と骨を医学校へ返す','returned',recover)
 ]);
 s.node('returned','school',['porter','curator'],'箱と骨を医学校へ返し、荷札も一緒に預けた。標本係が番号を確かめて返却を記帳する。運搬人は荷札を見て声を落とした。「名前を書き換えた理由は知っています。でも、証言したらベルトからの仕事はなくなる」。',[
  O('finish','標本の返却だけで報告を終える','@compromise'),
  O('consent','運搬人へ不利益を説明し、本人の同意を得て審査所へ同行する','hearing',[set('witnessConsent'),give('ledger','curator','party'),{...give('tags','box','party'),when:s.is('tagsAt','box')},{...give('tags','curator','party'),when:s.is('tagsAt','curator')},move('party porter','school','landing','office')])
 ]);
 const documents=and(s.known('number'),s.known('loan'),s.known('alteredTag'),s.known('missingReport'),s.known('claim'),s.known('testimony'));
 s.node('hearing','office',['porter','examiner'],'審査員は持参した標本の台帳と荷札を机に並べた。失踪届と保険請求書は審査所に保管されている。運搬人は「失踪したという人は生きています。その人の遺体に見せる箱を、一味がベルトに用意させたんです」と話し始めた。',[
  O('file','標本番号、荷札、失踪届、保険請求書を照合し、運搬人の証言を受理してもらう','@informed',[
   see('alteredTag','tags'),give('tags','party','examiner'),give('ledger','party','examiner'),
   see('missingReport','examiner',s.is('tagsAt','examiner')),see('claim','examiner',s.known('missingReport')),see('testimony','porter',s.is('witnessConsent')),see('fraud','examiner',documents),set('fraudChecked')
  ],{when:and(s.is('returned'),s.is('witnessConsent'),s.is('ledgerAt','party'),s.known('number'),s.known('loan'))})
 ]);
 s.end('informed','証言を伴う不正請求の審査','標本番号、書き換えられた荷札、失踪届、保険請求書が一つの偽装として審査所へ提出された。不正請求は止まり、標本は医学校へ返却された。運搬人は同意して証言したが、ベルトからの仕事を失った。',and(s.is('returned'),s.is('witnessConsent'),s.is('fraudChecked'),s.known('fraud')));
 s.end('contract','荷札だけの納品','ベルトは荷札を受け取り、浅瀬の骨箱は回収されなかった。後日、荷札は別の標本箱に付け直され、失踪者の遺体として保険審査へ提出された。',and(s.is('tagDelivered'),s.is('tagsAt','belt'),s.is('boxAt','water')));
 s.end('compromise','学校へ標本を返却','箱と骨は医学校へ戻り、盗まれた標本の管理番号も確認された。しかし荷札と失踪届の関係、保険請求への関与までは立証されず、不正の追及は別の仕事として残った。',s.is('returned'));
 

s.resetScripts=true;s.story.revision=2;
s.story.worldPlaces={
 landing:{kind:'dungeon',dungeon:'region_1',map:'region_1_f1',x:11,y:9,event:'q002_decision'},
 water:{kind:'dungeon',dungeon:'region_1',map:'region_1_f1',x:11,y:9,event:'q002_decision'},
 school:{kind:'town',location:'hikarigaeri_medical_specimens'},
 office:{kind:'town',location:'hikarigaeri_insurance'}
};
const route=(key,to,depart,effects,companions=[])=>Object.assign(s.story.actions[key],{journey:{to,companions},depart,effects});
route('entry_school','school',[move('party','landing','water'),see('number','bones'),move('party','water','landing')],[move('party','transit','school'),see('loan','ledger'),set('schoolKnown')]);
route('box_school','school',[see('alteredTag','tags')],[move('party','transit','school'),see('loan','ledger'),set('schoolKnown')]);
route('tags_inspect','school',[see('alteredTag','tags'),move('party','landing','water'),see('number','bones'),move('party','water','landing')],[move('party','transit','school'),see('loan','ledger'),set('schoolKnown')]);
const school=s.nodes.find(n=>n.id==='school');
school.options[0].text='運搬人と地下水道の引き揚げ場へ戻り、骨箱を回収する';school.options[0].to='recovery';school.options[0].when=s.is('boxAt','water');
s.story.actions.school_recover.to='recovery';s.story.actions.school_recover.requires=s.is('boxAt','water');
route('school_recover','landing',[],[move('party porter','transit','landing')],['porter']);
const handover=[give('box','party','curator'),{...give('tags','box','curator'),when:s.is('tagsAt','box')},{...give('tags','party','curator'),when:s.is('tagsAt','party')},set('returned')];
school.options.push({...O('return','運んできた箱と骨を標本係へ返す','returned',handover,{when:s.is('boxAt','party')}),action:'school_return'});
s.story.actions.school_return={from:['school'],to:'returned',requires:s.is('boxAt','party'),effects:handover,once:true};
s.node('recovery','landing',['porter'],'運搬人と地下水道の引き揚げ場へ戻った。骨箱は浅瀬に引っ掛かったままだ。足元を固め、散った骨を箱へ集める。',[
 O('lift','運搬人と骨を集め、骨箱を岸へ引き揚げる','recovered',[move('party porter','landing','water'),collectBones,give('box','water','party'),move('party porter','water','landing')])
]);
s.node('recovered','landing',['porter'],'骨を収めた箱を岸へ上げた。運搬人が取っ手を支える。「これを標本室へ返しましょう」。',[
 O('return','骨箱を運んで医学校の標本室へ戻る','returned')
]);
route('recovered_return','school',[],[move('party porter','transit','school'),...handover],['porter']);
route('returned_consent','office',[set('witnessConsent'),give('ledger','curator','party'),{...give('tags','curator','party'),when:s.is('tagsAt','curator')}],[move('party porter','transit','office')],['porter']);
s.nodes.find(n=>n.id==='hearing').text='保険審査所の窓口へ着いた。審査員は持参した台帳と荷札を机に並べ、保管していた失踪届と保険請求書を取り出した。運搬人は「失踪したという人は生きています。その人の遺体に見せる箱を、一味がベルトに用意させたんです」と話し始めた。';
s.story.actions.hearing_file.requires=and(s.story.actions.hearing_file.requires,s.is('tagsAt','party'));
s.nodes.find(n=>n.id==='hearing').options[0].when=s.story.actions.hearing_file.requires;
export default s.done();
