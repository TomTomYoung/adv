// One transparent, waist-up illustration per person is shared by cards and stage.
// Appearance is new art direction; story identity, knowledge and location stay intact.
export const KAGARIBI_CHARACTER_ART=Object.freeze(Object.fromEntries([
  {batch:'kagaribi-2026-10-27',ids:['q201_clerk','q201_porter','q202_trainee','q202_trainer']},
  {batch:'kagaribi-q203-2026-10-27',ids:['q203_seller','q203_tester']},
  {batch:'kagaribi-q204-2026-10-27',ids:['q204_scribe','q204_survivor']},
  {batch:'kagaribi-q205-2026-10-27',ids:['q205_pupil','q205_master']},
  {batch:'kagaribi-q206-2026-10-27',ids:['q206_sister','q206_worker']},
  {batch:'kagaribi-q207-2026-10-27',ids:['q207_surveyor','q207_assistant']},
  {batch:'kagaribi-q208-2026-10-28',ids:['q208_keeper','q208_daughter']},
  {batch:'kagaribi-q209-2026-10-28',ids:['q209_guard','q209_pupil']}
].flatMap(({batch,ids})=>ids.map(id=>[id,Object.freeze({asset:`npc_${id}`,file:`assets/images/characters/kagaribi/${id}.webp`,source:`assets/source/characters/${batch}/${id}.png`,manifest:`assets/source/characters/${batch}.json`})]))));
export const kagaribiCharacterImages=()=>Object.fromEntries(Object.values(KAGARIBI_CHARACTER_ART).map(a=>[a.asset,a.file]));
export function kagaribiCharacterArt(id){
  const art=KAGARIBI_CHARACTER_ART[id];
  return art?{portrait:art.asset,sprite:art.asset,provenance:'篝火迷宮の追加10編。人物・呼称を固定。2026-10-27の美術設定で専用透過画を制作し、肖像と立ち絵で共用。外見・年代は原文の既定情報ではない。'}:{};
}
