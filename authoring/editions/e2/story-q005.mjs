import rows from '../../stories-v11-1.mjs';
import {O,set,give,and,eq,ref} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export function drainageSource(){
  const s=structuredClone(JSON.parse(JSON.stringify(rows.find(s=>s.id==='q005'))));
  const node=id=>s.nodes.find(n=>n.id===id);
  const action=(scene,id)=>s.story.actions[`${scene}_${id}`];
  const add=(id,place,cast,text,options)=>{
    s.story.scenes[id]={title:s.story.places[place],place,cast:cast.map(entity=>({entity})),requires:true};
    s.nodes.push({id,text,options});
    for(const o of options){o.action=`${id}_${o.id}`;s.story.actions[o.action]={from:[id],...(o.to.startsWith('@')?{ending:o.to.slice(1)}:{to:o.to}),requires:true,effects:o.effects,once:true,...(o.cost?{cost:o.cost}:{})};}
  };
  const burn=node('entry').options.find(o=>o.id==='burn');
  burn.text='菌床と濾材を取り出し、焼却場へ運ぶ（焼却に松明1本）';burn.to='furnace';
  burn.when={op:'has_item',item:'torch',count:1};
  delete action('entry','burn').ending;delete action('entry','burn').cost;
  action('entry','burn').to='furnace';action('entry','burn').requires=burn.when;
  const carry=node('cold').options.find(o=>o.id==='move');
  carry.text='トトと菌床を濾材ごと隣の空き溜めへ運ぶ';carry.to='unpacked';action('cold','move').to='unpacked';
  add('unpacked','sump',['toto'],'空き溜めの縁へ菌床と濾材を下ろした。冷水の管は、まだ本管から分かれていない。トトが分岐の位置へ印をつけた。',[
    O('pipes','冷水管を分岐し、菌床へ冷水を流す','test',[set('pipes')])
  ]);
  add('furnace','disposal',[],'焼却場へ着き、菌床と濾材を炉へ下ろした。まだ火は入っていない。トトは旧排水溜めに残り、本管の流れを見ている。',[
    O('burn','松明1本で菌床と古い濾材を焼却する','burned',[set('fungus','burned')],{cost:{torch:1}})
  ]);
  add('burned','disposal',[],'炉の中には焼けた濾材と灰が残った。菌床は焼却できた。旧排水溜めへ戻り、トトと本管の流れを確かめる。',[
    O('return','旧排水溜めのトトのところへ戻る','burn_report')
  ]);
  add('burn_report','drain',['toto'],'旧排水溜めへ戻ると、トトが本管を指した。滞っていた排水が流れている。菌床と濾材の焼却を伝え、作業を終える。',[
    O('finish','本管の流れを確認し、焼却を報告する','@contract')
  ]);
  const point=(name,x,y)=>({kind:'dungeon',dungeon:'region_1',map:'region_1_inspection',x,y,event:`q005_drainage_${name}`});
  const route=connectWorld(s,{drain:point('drain',7,3),sump:point('sump',9,3),disposal:point('disposal',1,7)},2);
  route('entry_burn','disposal',{depart:[give('bed','drain','party')],arrive:[give('bed','party','disposal')]});
  route('cold_move','sump',{companions:['toto'],depart:[give('bed','drain','party')],arrive:[give('bed','party','sump')]});
  route('burned_return','drain');
  for(const [key,e] of Object.entries(s.story.entities))s.story.registry[e.holder].values=[...Object.keys(s.story.places),...(e.kind==='item'?Object.keys(s.story.entities).filter(id=>id!==key):[])];
  s.story.endings.contract=and(s.story.endings.contract,eq(ref('stories.q005.values.partyAt'),'drain'),eq(ref('stories.q005.values.bedAt'),'disposal'));
  return s;
}
