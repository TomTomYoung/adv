// A shipped story and its VM frames remain one definition for accepted saves.
// Keep the source catalog so loading a fresh save after an old save is reversible.
const sources=new WeakMap();
export const acceptedRouteSource=data=>sources.get(data)??data;
export function acceptedStoryRouteData(data,state){
  const source=acceptedRouteSource(data);let quests;
  for(const [id,preserved] of Object.entries(state?.flags?.preservedStoryRoutes??{})){
    const current=source.quests[id];
    if(!current?.model?.preserveAcceptedStory||preserved!==true)continue;
    const previous=source.previousQuestRoutes?.[id];if(!previous)continue;
    quests??={...source.quests};
    quests[id]={...previous,model:{...previous.model,preserveAcceptedRoute:true,preserveAcceptedStory:true,currentStoryScriptPrefix:current.model.currentStoryScriptPrefix}};
  }
  if(!quests)return source;
  const selected={...source,quests};sources.set(selected,source);return selected;
}
