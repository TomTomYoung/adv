const collection=(key,title,kind=key,mode='dict')=>({key,title,kind,mode,path:key?[key]:[]});
const single=(key,title,kind=key)=>collection(key,title,kind,'single');
export function collections(entry,value){
 switch(entry.family){
 case 'quest':return [collection('events','配置イベント','event','array'),collection('scripts','会話・選択肢・処理','script')];
 case 'dungeon':return [single(null,'迷宮の基本設定','dungeon'),collection('systems','仕掛け・接続','system'),collection('fieldEvents','条件付きイベント','fieldEvent','array')];
 case 'maps':case 'voxel':return [collection('maps',entry.family==='voxel'?'旧3Dマップ（通常配信外）':'マップと配置物','map'),...(value.scripts?[collection('scripts','処理','script')]:[])];
 case 'cells':return [collection('maps','セルの配置図','cellmap'),collection('presets','セル種','cell'),collection('edgePresets','エッジ種','edge'),collection('events','セル進入イベント','cellEvent'),collection('scripts','セルの処理','script')];
 case 'locations':return [collection(null,'町の場所・施設','location')];
 case 'entities':return [collection('monsters','魔物の比較・編集','monster','array'),collection('actors','仲間の比較・編集','actor')];
 case 'jobs':return [collection('jobs','職業の比較・編集','job'),collection('skills','戦闘技能','skill'),collection('fieldAbilities','探索特技','ability'),collection('items','道具・装備','item'),collection('buffs','強化・弱体','buff'),collection('equipmentPatches','既存装備の調整','equipment'),collection('formulas','計算式','expression'),single('initialJobs','仲間の初期職業','assignments'),collection('shopGoods','店の商品','stock','array'),single('profile','共通の職業設定','profile'),single('skillCues','技能と演出の対応','bindings')];
 case 'presentation':return [collection('effects','効果の編集・再生','effect'),collection('sounds','音符の編集・試聴','sound'),collection('cues','効果と音の組み合わせ','cue'),single('bindings','操作と演出の対応','bindings'),single('ambient','常時表示','ambient')];
 case 'art':return [collection('entries','迷宮ごとの素材','art','array'),single('floor','床の切り出し','floorArt'),single('assets','素材画像の指定','artAssets')];
 case 'catalog':return [collection(null,'シナリオの本文・分岐','story','array')];
 case 'bundle':return ['items','enemies','encounters','statuses','maps','scripts','shopGoods'].filter(k=>value[k]!==undefined).map(k=>collection(k,({items:'道具',enemies:'魔物',encounters:'遭遇編成',statuses:'状態異常',maps:'マップと配置物',scripts:'処理',shopGoods:'店の商品'})[k],({items:'item',enemies:'monster',encounters:'encounter',statuses:'status',maps:'map',scripts:'script',shopGoods:'stock'})[k],Array.isArray(value[k])?'array':'dict'));
 case 'terrain':return [collection('items','道具','item'),collection('shopGoods','店の商品','stock','array'),collection('mapOpenings','旧形式の開口地点','oldPoint','array')];
 default:throw Error('編集画面が未登録です: '+entry.family);
 }
}
export const groups={
 event:[['基本',['title','kind','trigger','once','blocking','safe','initialState','role']],['配置',['points','fire']],['条件',['visibleWhen','condition','requirement','note']],['実行内容',['script']]],
 fieldEvent:[['基本',['id','title','watch','repeat','message']],['配置',['points']],['条件・処理',['condition','action']]],
 cellEvent:[['基本',['trigger','once']],['条件・処理',['condition','script']]],
 dungeon:[['基本',['name','description','region','recommendedLevel']],['所属マップ・入口',['maps','entries']]],
 monster:[['基本',['name','description','region','sprite']],['能力値',['stats','resist','rewards']],['戦闘',['skill','skills','ai','statusImmune']],['設定メモ',['ideas','source','description']]],
 actor:[['基本',['name','description','portrait']],['能力値',['stats','growth']],['技能・装備',['skills','equipment','statusImmune']]],
 job:[['基本',['name','role','limitation']],['成長・能力',['growth','stats']],['習得・装備',['grants','equipment']],['常時効果',['passives']]],
 item:[['基本',['name','description','type']],['使用',['field','battleSkill','script','consumed']],['装備',['slot','equipmentType','stats','resist']]],
 skill:[['基本',['name','description','target']],['消費・条件',['mp','hp','materials','requiresWeapon','requiresAnalyzed','maxTargets']],['効果',['effects','selfEffects','fireEffect','priority']]],
 ability:[['基本',['name','description','api','target','modes']],['消費',['mp','hp','materials']],['効果',['output','radius','effect','cue']]],
 map:[['基本',['name','region','floor','dungeon','background','music']],['入口・遭遇',['entrance','encounter','encounterRate','encounterPool']],['配置物',['objects']],['旧3Dの面と経路',['voxels']]],
 location:[['基本',['name','description','background']],['接続',['parent','links','dungeons']],['施設・人物',['shop','party','quests','services','cast']]],
 edge:[['名前・用途',['name','description']],['通行',['passage']],['外観・遮光',['visual']],['性質',['parameters']]],
 cell:[['名前・用途',['name','description']],['通行',['passage']],['外観・遮光',['visual']],['性質・イベント',['parameters','events']]],
 story:[['本文',['title','brief','past','progression']],['分岐',['nodes']],['結末',['outcomes']],['制約・メモ',['authoringNotes']]],
 sound:[['基本',['name','use','instrument','gain']],['音符',['notes']]],
 effect:[['基本',['name','category','duration','palette']],['効果の構成',['tracks']]],
 cue:[['効果・音',['effects','sound','target','gap']]],
};
export const editableScope={
 quest:'このクエストの配置・起動条件・調査用の会話と処理。本筋がJavaScript原稿にある場合、その本文は参照専用です。',
 dungeon:'この迷宮の入口・所属マップ・仕掛け・接続・条件付きイベント。セルと配置イベントはそれぞれの正本へ出力します。',
 maps:'マップの基本情報と配置物。通行・外観はcell-layers.jsonへ出力します。',
 cells:'セル種・エッジ種とそれぞれの配置、地点ごとの上書き、セル進入イベントと処理。',
 jobs:'職業、成長、装備条件、習得技能、消費と効果、道具、初期職業、店の商品。',
 entities:'追加魔物と仲間の名前・能力・技能・表示画像。JavaScript原稿由来の魔物は参照専用です。',
 locations:'町の場所、親子と接続、背景、施設サービス、登場人物。',
 presentation:'効果の動き、音符、効果と音の組合せ、行動との対応。音声ファイルそのものの生成は別工程です。',
 art:'迷宮ごとの壁・装置素材、床の切り出し、素材画像の参照。',
 catalog:'q011〜q020の本文・選択肢・場面の接続・結末・制約。',
 bundle:'この原稿の道具・魔物・遭遇・状態・処理と、優先される別原稿がないマップ。',
 terrain:'道具・店の商品。開口地点は旧形式の互換設定です。',
 voxel:'退避中の3Dマップの層・面・経路・処理。通常の2Dゲームへは配信されません。',
};
