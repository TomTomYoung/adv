import {clone} from '../core/expression.js';
import {castDefinition,storyCast,transitionDuration} from '../core/cast.js';

export function projectCastDefinition(d,definition){
  const cast=definition.cast.map(c=>{
    const def=d.characters[c.character];
    return {id:def.id,name:def.name,role:def.role,portrait:d.assets.images[c.display?.asset??def.portrait],sprite:d.assets.images[c.display?.asset??def.sprite??`sprite_${def.id}`]??d.assets.images[def.portrait],remote:Boolean(c.remote),display:clone(c.display??{})};
  });
  return {mode:definition.mode,cast};
}
export function projectCast(engine,dialog){
  const {scene}=storyCast(engine);
  if(!engine.state.presentation.cast&&!scene){
    const cue=engine.state.presentation.castCue;
    return cue&&transitionDuration(cue.transition)>0?{title:'',mode:cue.from.mode,speakerId:null,cast:[]}:null;
  }
  const result=projectCastDefinition(engine.data,castDefinition(engine)),cast=result.cast;
  const speakerId=dialog.speakerId??cast.find(c=>c.name===dialog.speaker)?.id??null;
  return {title:scene?.title??'',...result,speakerId};
}
