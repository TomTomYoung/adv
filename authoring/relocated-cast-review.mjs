// Editorial audit: candidate IDs are local; connected roles cite their game entity.
// Update a fingerprint only after rereading the changed quest and its evidence.
export const RELOCATED_CAST_REVIEW={
 reviewedAt:'2026-10-30',
 quests:{
  q031:{
   sourceSha256:'ab2cb40f75d0a430e00077b936b338b23736b74b01034aeaeb9333cda16cecf7',
   identityNotes:[
    '依頼人は聖歌隊のキリ。q036にも同じ役職・名の依頼人がいるが、q031の現場本文に本人の同席は書かれていない。依頼人欄からcastへ自動追加しない。',
    '夜に聞く声は探索隊が吹き込んだ録音。録音した本人の立ち絵や、亡き家族の肖像を新規NPCとして配置しない。結末の参拝者は場面の固定出演と区別する。'
   ],
   relatedClients:{q036:'聖歌隊のキリ'},
   people:{},
   scenes:{
    entry:{decision:'no-person-evidence',people:[],evidence:'水晶の横には録音用の小さな窪みがある。',reason:'録音水晶を調べる場面。探索隊以外の特定人物が同席する記述はない。',visual:'録音水晶・吹込み用の窪み・日付の機構。人物画の追加は不要。'},
    night:{decision:'no-person-evidence',people:[],evidence:'自分の言った日付が流れた。',reason:'声は再生された録音。キリや別の話者が現場へ来たと解釈しない。',visual:'同じ足元で夜の礼拝と録音再生を示す差分。場面内の時間経過として扱う。'}
   },
   next:'人物を追加せず、録音水晶と日付表示の局所差分を制作候補にする。人物監査の次はq038。'
  },
  q032:{
   sourceSha256:'8ea3083df1503f6511263214481d9045c5c9565b430c97fedb00018cc25d95f1',
   identityNotes:[
    '依頼人は修復師のサイ。q040にも同じ役職・名の依頼人がいる。q032の石工台の「職人」をサイ本人と同定する記述はなく、匿名の役として保留する。',
    '国境q298の交代員サイ（od_relief）や既存人物の絵へ名前だけで統合しない。囚人と職人の固有名・他依頼との同一性は未設定。具体的な外見・年齢感・服装は今回の美術設定として制作記録へ分ける。',
    '囚人は地下牢、職人は石工台でのみ出演根拠がある。聖像前への同行は原稿にない。依頼完了文の修復師・囚人を帰還場面の同席へ変換しない。',
    '石工台では不透明な石を示し、棚にある宝玉と比較する説明へ本文を整えた。jewelAtはentryのまま、stoneAtはworkshop→party→entryと受け渡す。宝玉の運搬は追加しない。既存セーブの表示待ちの旧本文は保存した一節を読み終えてから新しい本文へ進む。'
   ],
   relatedClients:{q040:'修復師のサイ'},
   people:{
    q032_prisoner:{label:'地下牢の囚人（匿名）',status:'connected',entity:'prisoner',need:'人物定義・cellの所在とcast・専用透過画を接続済み。口元へ手を上げる姿。牢や格子は人物画へ固定しない。'},
    q032_craftsperson:{label:'石工台の職人（匿名）',status:'connected',entity:'craftsperson',need:'人物定義・workshopの所在とcast・専用透過画を接続済み。修復師サイとの同一性は未確定。宝玉と石は人物画へ固定しない。'}
   },
   scenes:{
    entry:{decision:'no-person-evidence',people:[],evidence:'宝玉は元の棚へ戻っている。',reason:'聖像と宝玉を調べる場面。依頼人や職人の同席は書かれていない。',visual:'片目の聖像・棚の透明な宝玉・覗き管。'},
    cell:{decision:'person-evidence',people:['q032_prisoner'],evidence:'囚人が「誰が見ている」と顔を隠す。',reason:'囚人の発言と動作が明示される。職人・依頼人は加えない。',visual:'地下牢側から見える覗き窓と囚人。聖像前とは実座標が異なる。'},
    workshop:{decision:'person-evidence',people:['q032_craftsperson'],evidence:'職人が不透明な石を台に置いた。',reason:'石工台の職人の動作が明示される。地下牢の囚人は加えない。',visual:'石工台と不透明な石。宝玉の現物は聖像前の棚に残る。'},
    fit_stone:{decision:'no-person-evidence',people:[],evidence:'石工台から不透明な目を持ち帰った。',reason:'探索隊だけが聖像へ戻る。職人が同行したとは扱わない。',visual:'未取付の石と塞ぐ覗き管。finish前に修復完了の状態を描かない。'},
    fit_original:{decision:'no-person-evidence',people:[],evidence:'透明な宝玉のある棚へ戻った。',reason:'探索隊が棚へ戻る。囚人・職人・依頼人を同席させない。',visual:'棚の宝玉と監視につながる穴。finish前に宝玉の取付完了を描かない。'},
    plate:{decision:'no-person-evidence',people:[],evidence:'片目を塞がず保存する方針',reason:'聖像前で由来を記す。地下牢の囚人は遠隔地のまま。',visual:'片目を残した像と由来の銘板。'}
   },
   next:'匿名2役の接続を完了。聖像・地下牢・石工台の背景と道具の状態差分は残る。'
  },
  q033:{
   sourceSha256:'b378b07d2e8854238223484b790da20e08e6da9ba830ababc2fc6a8120919e4a',
   identityNotes:[
    '依頼人は宿坊のウラ。現場で話し、客室・水盤・鏡へ同行する巡礼者とは別の役。ウラの同席を本文からは確認できない。',
    '巡礼者は既存personエンティティpilgrimとして所在を持ち、character・5場面のcast・専用透過画を接続済み。固有名・性別・年齢・宗派・狂火との関係を本文へ付与しない。',
    '外套は全経路でcloakAt: pilgrimを維持する。guestは外套を握ったまま話し始める本文へ整理し、椅子への移動・脱衣を追加しない。粉・洗浄・濡れを共通の人物画へ固定しない。旧保存の待機本文は保持する。'
   ],
   relatedClients:{},
   people:{q033_pilgrim:{label:'鏡に映らない巡礼者（匿名）',status:'connected',entity:'pilgrim',need:'既存pilgrimの所在と同行を保持し、character・5場面のcast・専用透過画を接続済み。依頼人ウラの画を流用しない。'}},
   scenes:{
    entry:{decision:'person-evidence',people:['q033_pilgrim'],evidence:'巡礼者が鏡へ触れると白く曇った。',reason:'巡礼者の動作と発言がある。ウラは同席の根拠なし。',visual:'曇る鏡と外套。鏡像を別の人物として表示しない。'},
    powder:{decision:'person-evidence',people:['q033_pilgrim'],evidence:'巡礼者は以前、鏡磨きの作業をしていた。',reason:'直前の調査を同じ場所で続ける。pilgrimAtはentryにあり、退場・移動はない。',visual:'拭いた布と銀磨き粉、曇りを拭いた鏡。'},
    guest:{decision:'person-evidence',people:['q033_pilgrim'],evidence:'巡礼者と鏡のない客室まで来た。',reason:'同行して到着した本人から話を聞く。ウラは加えない。',visual:'鏡のない客室。外套は巡礼者の手元に残す。室内の会話と本人の同意を保つ。'},
    wash:{decision:'person-evidence',people:['q033_pilgrim'],evidence:'巡礼者は濡れた袖を絞り、鏡へ戻ろうと言う。',reason:'水盤へ実際に同行した本人の動作と発言がある。',visual:'水盤、洗い落ちた粉、濡れた外套。'},
    clean:{decision:'person-evidence',people:['q033_pilgrim'],evidence:'巡礼者と残る曇りを拭き取った。',reason:'水盤から一緒に戻り、同じ巡礼者と作業する。',visual:'拭いた鏡と映る手。新しい人物を増やさない。'}
   },
   next:'巡礼者1役・5場面の接続を完了。鏡前・水盤・鏡のない客室と、粉・洗浄の局所差分は残る。'
  },
  q034:{
   sourceSha256:'0d18641cef9315b3354470f0d5254c9a46382da6870ddd5448cf53959d8b5059',
   identityNotes:[
    '依頼人は商人のロア。現場本文では商人とだけ呼ばれる。既存merchantの同じ役を3場面で追い、同名だけで他の依頼の人物へ統合しない。',
    '被害者は自分たちと語る集団だが、人数・氏名・外見・代表者は記されていない。既存personエンティティvictimsを制作1人分とは数えない。集団名「被害者たち」だけを表示し、群像・代表者の画像は意図的に割り当てない。',
    '商人はentryと面会室を探索隊と同行して往復する。被害者はmeetingに留まる。証書は祭壇から探索隊へ預け、返却時だけ商人へ移る。面会を取り持つ結末ではdocumentAt: partyを維持し、返したことにしない。',
    'consentは面会の内容への同意を得る場面。本文の返答と商人の了承を根拠に両者を表示する。公開の謝罪会や和解の成立を絵だけで先取りしない。結末の祈祷師は場面castへ追加しない。本文・行動・状態項目・物語改訂1は変更せず、旧保存の内容もそのまま再開する。'
   ],
   relatedClients:{},
   people:{
    q034_merchant:{label:'証書を求める商人',status:'connected',entity:'merchant',need:'既存merchantの所在・同行を使い、専用画と3場面のcastを接続済み。現場の呼称を使い、他の商人の画を流用しない。'},
    q034_victims:{label:'被害者たち（集団名のみ）',status:'connected',entity:'victims',need:'meetingの1場面に集団名を表示。肖像・立ち絵は意図的に割り当てず、人数・代表者・具体的な被害内容を創作しない。'}
   },
   scenes:{
    entry:{decision:'person-evidence',people:['q034_merchant'],evidence:'商人はそれを今夜の謝罪の代わりに掲げたいと言う。',reason:'商人の発言があり、merchantAtはentry。被害者は面会室に留まる。',visual:'祭壇の証書。日付・支払欄はUIの文章で確認し、完了済みの謝罪を描かない。'},
    reserved:{decision:'person-evidence',people:['q034_merchant'],evidence:'「支払済」は別の墨で書き足されていた。',reason:'商人と同じ現場で原本を調べる。面会室から戻る経路も本人が同行し、被害者は同行しない。',visual:'寄進予約票と異なる墨の書き足し。保持者はentryまたはpartyで、未返却の紙を商人へ固定しない。'},
    consent:{decision:'person-evidence',people:['q034_merchant','q034_victims'],evidence:'商人も了承した。',reason:'被害者の返答と商人の了承があり、meetingに両者がいる。集団の人数は本文から確定しない。',visual:'被害者との面会室。書類を見せる会と話を聞く会を区別し、無断の公開や和解の演出を足さない。'}
   },
   next:'商人の専用画と集団名の出演接続を完了。祭壇の原本・異なる墨と面会室の局所差分は残る。'
  },
  q035:{
   sourceSha256:'50df38a65b95ff0af17ad798b501776bfd5bb17ed27e050d6a53a9eff9561f03',
   identityNotes:[
    '依頼人は施療人のネイ。現場の配膳係・患者をネイ本人と同定する記述はない。匿名の2役として整理し、氏名・性別・病名を追加しない。',
    '配膳係serverは鏡前から患者側へ探索隊と同行し、patient・consentでも同じ場所に留まる。患者patientは患者側だけにいる。修理人は入室への同意に言及されるが、現場へ到着したcastとして追加しない。',
    '患者は顔を隠したまま礼を言い、見学者に病室を見せる案は断る。専用画も顔全体を不透明な布で覆い、許可のない公開や病室の見学として演出しない。外見・年齢感・服装と配膳係の女性としての描画は美術設定であり、本文には追加しない。',
    '皿はserver→party→patientと実到着で受け渡す。追加の糧食1つはmeal結末だけの費用で、通常の皿と混同しない。repairConsentと公開範囲の違いを維持する。'
   ],
   relatedClients:{},
   people:{
    q035_server:{label:'配膳係（匿名）',status:'connected',entity:'server',need:'既存serverの所在・同行を使い、専用透過画と全3場面のcastを接続済み。共通人物画へ皿を固定しない。'},
    q035_patient:{label:'顔を隠す患者（匿名）',status:'connected',entity:'patient',need:'既存patientの所在を使い、患者側の2場面に顔を覆った専用透過画を接続済み。病名・氏名・性別を本文の確定事項として追加しない。'}
   },
   scenes:{
    entry:{decision:'person-evidence',people:['q035_server'],evidence:'配膳係は次の皿を運ぶところだ。',reason:'配膳係の所在と動作が明示される。患者は壁の奥の別座標にいる。',visual:'鏡前の皿と配膳表。鏡の破壊・数量公開を選択前に描かない。'},
    patient:{decision:'person-evidence',people:['q035_server','q035_patient'],evidence:'患者は顔を隠したまま礼を言う。',reason:'患者の発言があり、配膳係は実際に探索隊と患者側へ到着する。',visual:'壁内の配膳口、届いた皿、顔を隠す患者。患者の顔や病室を見世物にしない。'},
    consent:{decision:'person-evidence',people:['q035_server','q035_patient'],evidence:'患者は修理人の入室に同意し、見学者へ病室を見せる案は断った。',reason:'同じ患者と配膳係が患者側に留まる。修理人の到着や見学者の同席は書かれていない。',visual:'修理の範囲を示す配膳口と案内の境界。修理や公開が完了した状態を先取りしない。'}
   },
   next:'配膳係・顔を隠す患者の接続を完了。皿・配膳口・数量表・公開範囲の局所差分は残る。本文・行動・物語改訂1・旧保存は維持する。'
  },
  q036:{
    "sourceSha256": "7db85bfe25c4b88cf6996cf02c7eca1e7dcbfcb35e34472e239fc585bcfc3ede",
    "identityNotes": [
      "依頼人は聖歌隊のキリで、q031と同じ役職・名。指揮台の元団員や六人の歌い手の誰かをキリ本人と同定する記述はない。依頼人欄からcastへ自動追加しない。",
      "声を失った元団員・退団した歌手・指揮者は本文で同じ本人を指す。七番目の声は本人の過去の録音で、別人や幽霊の出演として増やさない。具体的な病名・性別・氏名や伝達手段を追加しない。",
      "六人の生歌の歌い手は集団として明示される。録音だけを聞く間も退出の記述はなく、同じ現場に留まる。人数は六人だが個々の名・顔・代表者は未確定で、集団の役と人物画の制作枚数を区別する。",
      "全3場面はregion_4_f2 (15,5)。livePausedとrehearsedで、生歌の停止・録音への指揮・共演の練習を区別する。指揮者personと聖歌隊groupの所在・castを接続した。個別物語改訂1→2では旧保存を検証した後にconductorAt・choirAtだけをentryで補う。公演・追悼は選択後で、録音を生歌の復活としない。"
    ],
    "relatedClients": {
      "q031": "聖歌隊のキリ"
    },
    "people": {
      "q036_conductor": {
        "label": "声を失った元団員の指揮者（匿名）",
        "status": "connected",
        "entity": "conductor",
        "need": "全3場面に専用透過画を接続済み。録音の歌手と同じ本人で、口を閉じ空の手で拍を送る。キリとの同一性・声を失った原因は追加しない。"
      },
      "q036_choir": {
        "label": "六人の歌い手（集団名のみ）",
        "status": "connected",
        "entity": "choir",
        "need": "全3場面に六人の歌い手という集団名を接続済み。kind: groupを使い、個々の顔・氏名・代表者を創作せず、人物画は意図的に割り当てない。歌を止めても同じ場所に留まる。"
      }
    },
    "scenes": {
      "entry": {
        "decision": "person-evidence",
        "people": [
          "q036_conductor",
          "q036_choir"
        ],
        "evidence": "指揮台には声を失った元団員がいる。",
        "reason": "六人の口と指揮台の元団員が明示される。キリや七番目の声を別人として加えない。",
        "visual": "指揮台、六人分の生歌の位置、録音の再生元。見えている口の数と聞こえる声の数を区別する。"
      },
      "recording": {
        "decision": "person-evidence",
        "people": [
          "q036_conductor",
          "q036_choir"
        ],
        "evidence": "残った一声へ、指揮者が拍を送った。",
        "reason": "同じ指揮者が録音へ拍を送り、生歌の六人は一度歌うのを止める。退出や別室への移動はない。",
        "visual": "生歌を止めた六人と録音に拍を送る指揮者。過去の歌手を別の立ち絵へ実体化しない。"
      },
      "credit": {
        "decision": "person-evidence",
        "people": [
          "q036_conductor",
          "q036_choir"
        ],
        "evidence": "録音時期と現在の役目を並べたいと言う。",
        "reason": "同じ現場で録音と六人の生歌を合わせて練習した後の相談。別の歌手や観客の到着は記されない。",
        "visual": "録音時期・生歌・編曲／指揮の役を区別する案内。公演と追悼の採用前に結末を固定しない。"
      }
    },
    "next": "指揮者1役の専用画と六人の集団名を接続済み。指揮台・録音の再生元・生歌の停止と練習・役目の案内は局所差分候補。次の人物実装はq037、人物監査はq038。"
  },
  q037:{
    "sourceSha256": "ff27ac821cce78062b261e7334d36706868b98e1c8354460a4971046f8753ff2",
    "identityNotes": [
      "依頼人は告解係のオル。現場本文には同席の記述がなく、依頼人欄からcastへ追加しない。q182の魔導砲手オルとは役職が異なり、同名だけで統合しない。",
      "返却先は受付番号の異なる三人で、既存personエンティティowner_first・owner_second・owner_thirdが各家に留まる。固有名・性別・年齢・外見・告解の内容は未設定。三人を一人の代表者へまとめず、各家に本人だけを表示する候補とする。",
      "entryの声は籠の書記鳥による昼の言葉の再現。returnは告解の声が届かない控室で、移した籠が残る。探索隊以外の特定人物の同席根拠はなく、書記鳥を人間の話者やオルの立ち絵で代用しない。鳥と籠は非人物の素材候補として別に整理する。",
      "籠はentry→party→quiet、三通の写本はentry→party→各ownerへ実到着で受け渡す。三人は同行しない。受付番号だけで照合し、封を開けたり告解の本文・氏名を画像へ書き込んだりしない。",
      "封印庫へ預ける選択の既存処理は未返却の写本だけをparty→quietへ移す。独立した封印庫locationや係員の同席は未実装で、文言だけから新しい部屋・人物を追加しない。鳥を放す結末や献立を覚える仕事への変更も選択前の共通素材へ固定しない。"
    ],
    "relatedClients": {
      "q182": "魔導砲手オル"
    },
    "people": {
      "q037_owner_first": {
        "label": "一番の写本を受け取る本人（匿名）",
        "status": "candidate",
        "need": "既存owner_firstの所在を使い、firstの1場面へcharacter・castを接続する候補。専用画の要否と外見は未確定。他の二人や依頼人オルへ統合せず、番号と封を閉じた受渡しを保つ。"
      },
      "q037_owner_second": {
        "label": "二番の写本を受け取る本人（匿名）",
        "status": "candidate",
        "need": "既存owner_secondの所在を使い、secondの1場面へcharacter・castを接続する候補。専用画の要否と外見は未確定。他の二人や依頼人オルへ統合せず、番号と封を閉じた受渡しを保つ。"
      },
      "q037_owner_third": {
        "label": "三番の写本を受け取る本人（匿名）",
        "status": "candidate",
        "need": "既存owner_thirdの所在を使い、thirdの1場面へcharacter・castを接続する候補。専用画の要否と外見は未確定。他の二人や依頼人オルへ統合せず、番号と封を閉じた受渡しを保つ。"
      }
    },
    "scenes": {
      "entry": {
        "decision": "no-person-evidence",
        "people": [],
        "evidence": "籠の鳥が昼の言葉を聞いた順に繰り返している。",
        "reason": "動作と声は書記鳥のもの。告解係や三人の返却先が同席する記述はない。",
        "visual": "夜の机、籠の書記鳥、封を開けない三通の写本。鳴き声を別の人物の出演へ変換しない。"
      },
      "return": {
        "decision": "no-person-evidence",
        "people": [],
        "evidence": "表紙の受付番号で本人へ返せる。内容を読む必要はない。",
        "reason": "声の届かない控室で返却先を選ぶ。三人は各家に留まり、受領後も控室へ同行しない。",
        "visual": "移設済みの籠と受付番号。手元に残る封書だけをletter_*Atに従って表示し、既に渡した写本を再び机へ出さない。"
      },
      "first": {
        "decision": "person-evidence",
        "people": [
          "q037_owner_first"
        ],
        "evidence": "受付札を本人と照合し、封を開けずに写本を渡した。",
        "reason": "一番の札の家で本人との照合と受領の返事がある。他の返却先や依頼人は同席しない。",
        "visual": "一番の札の家の戸口または室内と本人。共通家屋背景に番号の差分を加える候補。告解の内容を見せず、受渡し済みの封書は本人の保持に従う。"
      },
      "second": {
        "decision": "person-evidence",
        "people": [
          "q037_owner_second"
        ],
        "evidence": "受付札を本人と照合し、封を開けずに写本を渡した。",
        "reason": "二番の札の家で本人との照合と受領の返事がある。他の返却先や依頼人は同席しない。",
        "visual": "二番の札の家の戸口または室内と本人。共通家屋背景に番号の差分を加える候補。告解の内容を見せず、受渡し済みの封書は本人の保持に従う。"
      },
      "third": {
        "decision": "person-evidence",
        "people": [
          "q037_owner_third"
        ],
        "evidence": "受付札を本人と照合し、封を開けずに写本を渡した。",
        "reason": "三番の札の家で本人との照合と受領の返事がある。他の返却先や依頼人は同席しない。",
        "visual": "三番の札の家の戸口または室内と本人。共通家屋背景に番号の差分を加える候補。告解の内容を見せず、受渡し済みの封書は本人の保持に従う。"
      }
    },
    "next": "三人の返却先の人物接続と、書記鳥・籠・封書・番号札・控室・各家の局所差分を候補にする。人物実装の次はq037、人物監査の次はq038。"
  }
 }
};
