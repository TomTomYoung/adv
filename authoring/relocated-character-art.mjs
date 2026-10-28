// Edition-two regional bundle: relocated-quest roles, separate from border NPCs.
export const RELOCATED_CHARACTER_ART=Object.fromEntries(['q032_prisoner','q032_craftsperson'].map(id=>[id,{
 asset:'npc_'+id,file:`assets/images/characters/relocated/${id}.webp`,source:`assets/source/characters/chapel-q032-2026-10-29/${id}.png`,manifest:'assets/source/characters/chapel-q032-2026-10-29.json'
}]));
export const relocatedCharacterImages=()=>Object.fromEntries(Object.values(RELOCATED_CHARACTER_ART).map(a=>[a.asset,a.file]));
export const relocatedCharacters=Object.fromEntries([
 ['q032_prisoner','地下牢の囚人','礼拝堂の聖像の下の地下牢にいる匿名の人物。'],
 ['q032_craftsperson','石工台の職人','礼拝堂の石工台で修復方法を説明する匿名の人物。修復師サイとの同一性は未確定。']
].map(([id,name,detail])=>[id,{id,name,role:'礼拝堂の現地の相手',detail,portrait:RELOCATED_CHARACTER_ART[id].asset,sprite:RELOCATED_CHARACTER_ART[id].asset,
 provenance:'2026-10-29の美術設定。固有名・他人物との同一性は追加しない。具体的な外見・年齢感・服装は今回の美術設定。牢・格子・聖像・宝玉・石を人物画へ固定しない。'}]));
