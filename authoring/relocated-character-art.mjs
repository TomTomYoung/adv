// Edition-two regional bundle: relocated-quest roles, separate from border NPCs.
export const RELOCATED_CHARACTER_ART=Object.fromEntries([
 ['q032_prisoner','chapel-q032-2026-10-29'],['q032_craftsperson','chapel-q032-2026-10-29'],['q033_pilgrim','chapel-q033-2026-10-29'],['q034_merchant','chapel-q034-2026-10-29']
].map(([id,batch])=>[id,{
 asset:'npc_'+id,file:`assets/images/characters/relocated/${id}.webp`,source:`assets/source/characters/${batch}/${id}.png`,manifest:`assets/source/characters/${batch}.json`
}]));
export const relocatedCharacterImages=()=>Object.fromEntries(Object.values(RELOCATED_CHARACTER_ART).map(a=>[a.asset,a.file]));
export const relocatedCharacters=Object.fromEntries([
 ['q032_prisoner','地下牢の囚人','礼拝堂の聖像の下の地下牢にいる匿名の人物。'],
 ['q032_craftsperson','石工台の職人','礼拝堂の石工台で修復方法を説明する匿名の人物。修復師サイとの同一性は未確定。'],
 ['q033_pilgrim','鏡に映らない巡礼者','以前は鏡磨きの作業をしていた匿名の巡礼者。外套の粉で鏡が曇る。依頼人の宿坊のウラとは別の役。','2026-10-29の美術設定。具体的な外見・年齢感・服装は今回の美術設定。固有名・他人物との同一性・宗派は追加しない。粉・濡れ・鏡像・椅子・水盤を人物画へ固定しない。'],
 ['q034_merchant','証書を求める商人','赦しの領収書の現場で証書を求め、探索隊と面会室を往復する商人。','2026-10-29の美術設定。依頼人欄は商人のロアだが、現場の呼称は商人を使う。具体的な外見・年齢感・性別・服装は美術設定。他依頼の人物へ統合しない。証書・金銭・謝罪・和解の状態を人物画へ固定しない。']
].map(([id,name,detail,provenance])=>[id,{id,name,role:'礼拝堂の現地の相手',detail,portrait:RELOCATED_CHARACTER_ART[id].asset,sprite:RELOCATED_CHARACTER_ART[id].asset,
 provenance:provenance??'2026-10-29の美術設定。固有名・他人物との同一性は追加しない。具体的な外見・年齢感・服装は今回の美術設定。牢・格子・聖像・宝玉・石を人物画へ固定しない。'}]));
// A collective label is intentional: the prose specifies neither a headcount nor a spokesperson.
relocatedCharacters.q034_victims={id:'q034_victims',name:'被害者たち',role:'礼拝堂の面会相手',detail:'証書を見せる会ではなく、自分たちの話を聞く会への参加を了承する集団。',provenance:'2026-10-29の表示方針。既存victimsの所在を使い、面会室だけに集団名を表示する。人数・氏名・代表者・外見を創作せず、肖像・立ち絵を意図的に割り当てない。人物画の欠落を示す仮画像ではない。'};
