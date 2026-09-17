import {move} from './story-kit.mjs';

export function connectWorld(s, places, revision) {
  s.story.places.transit='移動中（現在地はワールド状態）';
  for (const place of Object.keys(places)) s.story.connections.push(['transit',place]);
  s.story.worldPlaces=places;
  s.story.revision=revision;
  s.resetScripts=true;
  return (key, to, {depart=[], arrive=[], companions=[]}={}) => {
    const action=s.story.actions[key];
    if (!action || action.ending || s.story.scenes[action.to]?.place!==to)
      throw new Error(`${s.id}/${key}: journey target must match its destination scene`);
    if (action.cost) throw new Error(`${s.id}/${key}: split local payment from travel`);
    action.journey={to,companions};
    action.depart=depart;
    action.effects=[move(['party',...companions].join(' '),'transit',to),...arrive];
  };
}

// Scene-entry environmental effects run once, even when a conversation is resumed.
export function onceAtScene(quest,scene,commands) {
  const key=`worldSceneEffects.${quest}.${scene}`;
  return [{op:'if',condition:{op:'ne',left:{ref:`flags.${key}`},right:true},
    then:[...commands,{op:'set',target:`flags.${key}`,value:true}],else:[]}];
}
