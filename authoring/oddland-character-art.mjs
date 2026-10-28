// Edition-two residents keep their original names, roles and scene membership.
// Specific appearance is art direction, independent of travel and story state.
export const ODDLAND_CHARACTER_ART=Object.freeze(Object.fromEntries(
  ['od_marta','od_teo','od_rad','od_nurse'].map(id=>[id,Object.freeze({asset:`npc_${id}`,file:`assets/images/characters/oddland/${id}.webp`,source:`assets/source/characters/oddland-q291-2026-10-28/${id}.png`,manifest:'assets/source/characters/oddland-q291-2026-10-28.json'})])
));
export const oddlandCharacterImages=()=>Object.fromEntries(Object.values(ODDLAND_CHARACTER_ART).map(a=>[a.asset,a.file]));
export function oddlandCharacterArt(id){
  const art=ODDLAND_CHARACTER_ART[id];
  return art?{portrait:art.asset,sprite:art.asset,detail:'オッドランド第一群の人物。専用透過画を肖像と立ち絵で共用。',provenance:'2026-10-28の美術設定。人物・呼称・所在を固定。テオが少年、ラドが父であることは原文の設定。具体的な年齢・外見・服装、マルタとユナの性別は今回の美術設定。'}:{};
}

// Keep all three faces visible when the parent and child reunite at the clinic.
export const ODDLAND_SCENE_BLOCKING={q291:{protected:{
  nurse:{x:20,y:8,scale:.78,layer:0},
  rad:{x:80,y:8,scale:.78,layer:1},
  teo:{x:50,y:6,scale:.65,layer:2}
}}};
