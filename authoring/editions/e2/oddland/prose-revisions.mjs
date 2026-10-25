// Keep the first wording and exact replacements so review is reproducible.
export const revisions=[
 [291,'帰りはマルタの車を頼もうと話すと、二人とも頷いた。','探索隊が帰りの車をマルタに頼もうと提案すると、父と子は頷いた。','提案した人物と、返答した二人をその文の中で確定する。'],
 [292,'同僚が火の番を代わり、オレンは椅子へ腰を下ろした。','同僚がオレンに代わって火の番を引き受け、オレンは椅子へ腰を下ろした。','代わった対象を明示し、仕事と人物の関係を補わせない。'],
 [293,'ネルが指した濡れた区間は、交易回廊の中央にある。','ネルが場所を教えた濡れた区間は、交易回廊の中央にある。','町の作業場から現地の床を直接指しているように読ませない。'],
 [294,'ミレは二つの綴りを同じ欄へ写し、本人がヴェルと名乗ったことを添えた。','ミレは二つの綴りを同じ欄へ写した。探索隊が伝えた本人の名乗りも、照合の記録へ添える。','窓口にいない本人から直接聞いたという解釈を避け、情報の経路を示す。'],
 [296,'交換品が探索隊の携行油へ混ざることはない。','交換の樽は、店から旅籠の納品口へ直接届けるという。','保存処理の説明を語りに出さず、実際の配達先を描く。'],
 [298,'以前、探索隊と決めた手信号を新人へ引き継いでから、ペラは窓口へ向かう支度をした。','ペラは、探索隊と作った合図板の予備を新人へ渡した。手の動きを一通り確かめてから、窓口へ向かう支度をする。','持ち出す板と、残る新人の使う板を区別し、引継ぎの実行を見せる。'],
 [299,'同意と部屋代を確かめ、休んでもらう','相部屋の支度を確かめ、ヘルに休んでもらう','選択肢でも休む人物を明示する。'],
 [300,'国境の決まりはそのままだ。それでも、ここへ戻れば声を掛ける顔が増えた。','入口で荷役が手を振った。次にこの机へ座る時には、名前を聞く前に挨拶できる。','作者向けの国交の範囲説明を、場面にいる人物の応答へ置き換える。']
];
export function revise(sources){return sources.map(source=>{
 let raw=JSON.stringify(source);const changes=[];
 for(const [number,before,after,reason] of revisions)if(source.number===number){const from=JSON.stringify(before).slice(1,-1),to=JSON.stringify(after).slice(1,-1);if(raw.split(from).length!==2)throw Error(`q${number}: 改稿対象が一意ではありません`);raw=raw.replace(from,to);changes.push({before,after,reason});}
 return {...JSON.parse(raw),review:{method:'作者による提示順・所在・条件・因果の読み直し。実読者の試読ではない。',scope:source.nodes.map(n=>n.id),changes,focus:source.counterfactual}};
});}
