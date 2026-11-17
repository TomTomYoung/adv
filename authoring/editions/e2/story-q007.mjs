import rows from '../../stories-v11-2.mjs';
import {story,O,give,set,see,and} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export const voiceWallLocations={
  e2_voice_port:{id:'e2_voice_port',name:'帰り火亭・地下室の伝声口',parent:'hikarigaeri_tavern',description:'酒場の地下室。壁の伝声口の横に、廃番所へ続く保守通路の戸がある。',background:'location_tavern',links:[]},
  e2_voice_corridor:{id:'e2_voice_corridor',name:'廃番所への保守通路',parent:'e2_voice_port',description:'酒場の地下室と廃番所を結ぶ、人の通る保守通路。壁に沿う細い伝声管は音だけを運ぶ。',background:'corridor',links:[]},
  e2_voice_booth:{id:'e2_voice_booth',name:'廃番所の伝声室',parent:'e2_voice_corridor',description:'使われなくなった地下警備の番所。伝声管の口と古い机があり、保守通路から酒場の地下室へ戻れる。',background:'location_checkpoint',links:[]}
};
export function voiceWallSource(){
  const old=rows.find(s=>s.id==='q007'),s=story(7,{port:'地下室の伝声口',corridor:'保守通路',booth:'廃番所の伝声室'},[['port','corridor'],['corridor','booth']]);
  for(const key of ['brief','past','authoringNotes','revealText','progression'])s[key]=structuredClone(old[key]);
  const prose=id=>old.nodes.find(n=>n.id===id).text;
  s.entity('mire','port','mire').entity('brother','booth','brother').entity('letters','brother').entity('pipe','port');
  for(const k of ['voiceKnown','mireConsent','brotherConsent','lettersConsent','sealed','met','delivered'])s.bool(k);
  s.bool('pipeOpen',true);s.story.propositions=structuredClone(old.story.propositions);
  const remote=['mire',{entity:'brother',mode:'remote',requires:s.is('pipeOpen')}];
  s.node('entry','port',['mire'],prose('entry'),[
    O('reply','故人だけが知る出来事をミレに尋ね、その問いを壁へ返す','voice',[see('unanswered','pipe',s.is('pipeOpen'))]),
    O('trace','ミレにここで待ってもらい、保守通路をたどる','booth'),
    O('seal','声を聞き続けるかミレへ尋ね、本人の同意を得て伝声口を塞ぐ','@contract',[set('mireConsent'),set('pipeOpen',false),set('sealed')])
  ]);
  s.node('voice','port',['mire'],prose('voice'),[
    O('walk','問いへの返答を手掛かりに、保守通路から声の主を訪ねる','booth'),
    O('seal','ミレの意思を確かめ、この声のやり取りを終える','@contract',[set('mireConsent'),set('pipeOpen',false),set('sealed')])
  ]);
  s.node('booth','booth',['brother'],'伝声室で夫の弟が手紙を握っていた。「遺品から見つけたんです。僕が届けても、受け取ってもらえないと思って」。兄に似た声で原本を読んでいたと認めた。手紙はまだ弟の手にある。',[
    O('letters','弟に手紙を届ける意思を確かめ、夫の書いた原本を預かる','carrying',[set('lettersConsent'),give('letters','brother','party')])
  ]);
  s.node('carrying','booth',['brother'],'弟の同意を得て手紙の原本を預かった。ミレは酒場の地下室で待っている。弟は伝声室に残り、隊が手紙を届ける。',[
    O('return','原本を持ち、保守通路を通ってミレへ戻る','delivery')
  ]);
  s.node('delivery','port',['mire'],'手紙を持ってミレの待つ伝声口へ戻った。原本はまだ隊が持っている。壁の声が夫の弟だったことを説明し、夫の書いた手紙を渡す。',[
    O('deliver','声の主と差出人を伝え、ミレへ原本を渡して読んでもらう','letters',[give('letters','party','mire'),set('delivered')])
  ]);
  s.node('letters','port',remote,prose('letters'),[
    O('meet','弟と直接会う意思があるか、ミレに確かめる','mire_consent',[set('mireConsent')]),
    O('finish','手紙の受け渡しで区切り、面会は強いない','@compromise')
  ]);
  s.node('mire_consent','port',remote,'ミレは直接会うことに同意した。弟の返事はまだ確かめていない。壁の伝声口へ、ミレの意思を伝える。',[
    O('ask','伝声管越しに弟の意思を尋ね、面会への同意を確かめる','agreed',[set('brotherConsent')])
  ]);
  s.node('agreed','port',remote,'弟も自分の言葉で会って話すと答えた。二人とも面会を望んでいるが、弟はまだ廃番所にいる。隊が保守通路から迎えに行く。',[
    O('fetch','ミレに待ってもらい、廃番所へ弟を迎えに行く','collect')
  ]);
  s.node('collect','booth',['brother'],'廃番所で弟と合流した。ミレは伝声口で待っている。弟を伴って保守通路を歩き、彼女の前へ戻る。',[
    O('escort','弟を伴い、保守通路からミレのいる伝声口へ戻る','meeting')
  ]);
  s.node('meeting','port',['mire','brother'],prose('meeting'),[O('finish','二人の面会を見届け、その場を離れる','@informed')]);
  s.outcomes=structuredClone(old.outcomes);s.story.endings=structuredClone(old.story.endings);
  const town=location=>({kind:'town',location}),route=connectWorld(s,{port:town('e2_voice_port'),corridor:town('e2_voice_corridor'),booth:town('e2_voice_booth')},2);
  for(const key of ['entry_trace','voice_walk'])route(key,'booth',{arrive:[see('voice','brother'),see('letters','letters'),set('voiceKnown')]});
  route('carrying_return','port');route('agreed_fetch','booth');route('collect_escort','port',{companions:['brother'],arrive:[set('met')]});
  for(const key of Object.keys(s.story.endings))s.story.endings[key]=and(s.story.endings[key],s.is('partyAt','port'));
  return s.done();
}
