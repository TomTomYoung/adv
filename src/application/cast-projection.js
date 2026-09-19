import {clone} from '../core/expression.js';

export function projectCast(engine,dialog){
  const {data:d,state:s}=engine;
  const qid=s.vm.findLast(f=>d.scripts[f.script]?.storyQuest)?.script;
  const quest=d.quests[d.scripts[qid]?.storyQuest],story=s.stories[quest?.id];
  const scene=s.quests[quest?.id]?.stage==='active'?quest?.story.scenes[story?.scene]:null;
  const override=s.presentation.cast;
  if(!override&&!scene)return null;
  const members=override?.cast??scene.cast.filter(c=>c.when===undefined||engine.value(c.when)).map(c=>({character:quest.story.entities[c.entity].character,remote:c.mode==='remote',display:c.display}));
  const cast=members.map(c=>{
    const def=d.characters[c.character];
    return {id:def.id,name:def.name,role:def.role,portrait:d.assets.images[def.portrait],sprite:d.assets.images[c.display?.asset??def.sprite??`sprite_${def.id}`]??d.assets.images[def.portrait],remote:Boolean(c.remote),display:clone(c.display??{})};
  });
  const speakerId=dialog.speakerId??cast.find(c=>c.name===dialog.speaker)?.id??null;
  return {title:scene?.title??'',mode:override?.mode??scene?.castMode??'stage',speakerId,cast};
}
