// One transparent, waist-up illustration per person is shared by cards and stage.
// Appearance is new art direction; story identity, knowledge and location stay intact.
export const KAGARIBI_CHARACTER_ART=Object.freeze(Object.fromEntries([
  'q201_clerk','q201_porter','q202_trainee','q202_trainer'
].map(id=>[id,Object.freeze({asset:`npc_${id}`,file:`assets/images/characters/kagaribi/${id}.webp`})])));
export const kagaribiCharacterImages=()=>Object.fromEntries(Object.values(KAGARIBI_CHARACTER_ART).map(a=>[a.asset,a.file]));
export function kagaribiCharacterArt(id){
  const art=KAGARIBI_CHARACTER_ART[id];
  return art?{portrait:art.asset,sprite:art.asset,provenance:'篝火迷宮の追加10編。人物・呼称を固定。2026-10-27の美術設定で専用透過画を制作し、肖像と立ち絵で共用。外見・年代は原文の既定情報ではない。'}:{};
}
