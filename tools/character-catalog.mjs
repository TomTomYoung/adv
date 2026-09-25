// Links are composed relative to doc/ and relocated by the writer.
export function characterCatalog(data) {
  const characters=Object.values(data.characters),quests=Object.values(data.quests);
  const sprite=c=>data.assets.images[c.sprite??`sprite_${c.id}`];
  const out=['# 登場人物一覧','',
    '配布JSONの人物定義・素材参照から生成します。人物原稿は `authoring/characters.mjs`。q001〜q010の人物は安定したIDで定義し、同じリネを別人として増やさず、関所番と水門番を区別します。名無しの役割に本名を補わず、集団は集団実体として扱います。','',
    '外見・服装・小道具は美術設定です。NPCは探索隊員へ自動加入しません。旧AIPaint PNG・編集原稿・描画コマンドとカード用肖像を保存しています。','',
    '[肖像のプロンプト](../assets/source/characters/imagegen-prompts.json) ／ [肖像のハッシュ](../assets/source/characters/imagegen-manifest.json)','',
    '## 会話用の透過立ち絵','',
    `現在はNPC${characters.length}定義中、${characters.filter(c=>sprite(c)).length}人の会話用画像を参照できます。人物のsprite指定を優先し、省略時はsprite_<ID>、それもなければ肖像へフォールバックします。以下にカード画像と会話画像を分けて示します。`,'',
    '2026-09-24の追加対象は人物30点とくらがり1点で、全31点の適用を完了しました。[回収・適用記録](../assets/source/characters/recovery-2026-09-24.json)に対応とハッシュを保持します。各場面の配置演出や公開画面の通し確認まで完了したという意味ではありません。','',
    'q001では老人とルーキーを左、リネを右へ配置し、発話者を手前へ出します。[人物演出仕様](CHARACTER_STAGING.md)、[初期の立ち絵・ハッシュ](../assets/source/characters/dialogue-sprites-manifest.json)、[使用プロンプト](../assets/source/characters/dialogue-sprites-prompts.json)を参照してください。','',
    '## q001〜q010の実装済み人物',''];
  for (const c of characters) out.push(`### ${c.name} (${c.id})`,'',
    `役割：${c.role}。登場：${c.quests.join('・')}。動機：${c.goal}。`,'',c.detail,'',
    `![${c.name}のカード肖像](../${data.assets.images[c.portrait]})`,'',
    sprite(c)?`[会話用立ち絵](../${sprite(c)})`:'会話用画像は肖像へフォールバックします。','',
    `[旧AIPaint PNG](../assets/images/characters/${c.id}.png) ／ [編集原稿](../assets/source/characters/${c.id}.paint.json) ／ [描画コマンド](../assets/source/characters/${c.id}.commands.json)`,'');
  out.push('## 歴史上・物語内で言及される人物','',
    'ミレの夫：q007、弟の兄。故人であり声の主ではありません。生存NPCの所在を持たせません。','',
    '関所番の兄：q004。故人であり、関所番が使う資格の名義人です。','',
    '棺の故人：q008。遺体を物品bodyとして棺の内室に保持し、生存NPCとして表示しません。','',
    '## 既存の探索隊員','',
    '[編成と能力](COMPANION_CATALOG.md)を参照してください。','');
  for(const [id,c] of Object.entries(data.actors))out.push(`${c.name} (${id})：${c.bio??c.role??c.class}`,'');
  out.push('## q011〜q200の依頼人索引','',
    '原文の依頼人表記を列挙します。同名だけで同一人物とは確定せず、関係者の人物化は今後の対象です。この範囲の新規肖像と所在モデルは未実装です。','');
  for(const q of quests.filter(q=>q.number>10))out.push(`[${q.id} ${q.title}](QUEST_CATALOG.md#${q.id}-${q.title})：${q.client}`,'');
  return out.join('\n').trimEnd()+'\n';
}
