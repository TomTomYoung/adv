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
   next:'人物を追加せず、録音水晶と日付表示の局所差分を制作候補にする。人物監査の次はq132。'
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
    "next": "指揮者1役の専用画と六人の集団名を接続済み。指揮台・録音の再生元・生歌の停止と練習・役目の案内は局所差分候補。次の人物実装はq131、人物監査はq132。"
  },
  q037:{
  "sourceSha256": "ce11d90d164dd5e4bbaa3335d182458c8366755aa0003f2c4cfcf07e7c30d90f",
  "identityNotes": [
    "依頼人は告解係のオル。現場本文には同席の記述がなく、依頼人欄からcastへ追加しない。q182の魔導砲手オルとは役職が異なり、同名だけで統合しない。",
    "返却先は受付番号の異なる三人で、既存personエンティティowner_first・owner_second・owner_thirdが各家に留まる。三人の専用画とcharacter・castを各家だけへ接続した。外見・年齢感・性別の描画・服装は美術設定として制作記録へ分け、氏名・職業・経歴・告解の内容を本文へ追加しない。",
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
      "status": "connected",
      "need": "既存owner_firstの所在を保持し、firstの1場面だけへ専用透過画・character・castを接続済み。他の返却先や依頼人オルへ統合しない。物語改訂1と保存内容・本文・封を閉じた受渡しを維持する。",
      "entity": "owner_first"
    },
    "q037_owner_second": {
      "label": "二番の写本を受け取る本人（匿名）",
      "status": "connected",
      "need": "既存owner_secondの所在を保持し、secondの1場面だけへ専用透過画・character・castを接続済み。他の返却先や依頼人オルへ統合しない。物語改訂1と保存内容・本文・封を閉じた受渡しを維持する。",
      "entity": "owner_second"
    },
    "q037_owner_third": {
      "label": "三番の写本を受け取る本人（匿名）",
      "status": "connected",
      "need": "既存owner_thirdの所在を保持し、thirdの1場面だけへ専用透過画・character・castを接続済み。他の返却先や依頼人オルへ統合しない。物語改訂1と保存内容・本文・封を閉じた受渡しを維持する。",
      "entity": "owner_third"
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
      "visual": "一番の札の家の戸口または室内と本人。本人の専用画は接続済み。共通家屋背景に番号の差分を加える候補。告解の内容を見せず、受渡し済みの封書は本人の保持に従う。"
    },
    "second": {
      "decision": "person-evidence",
      "people": [
        "q037_owner_second"
      ],
      "evidence": "受付札を本人と照合し、封を開けずに写本を渡した。",
      "reason": "二番の札の家で本人との照合と受領の返事がある。他の返却先や依頼人は同席しない。",
      "visual": "二番の札の家の戸口または室内と本人。本人の専用画は接続済み。共通家屋背景に番号の差分を加える候補。告解の内容を見せず、受渡し済みの封書は本人の保持に従う。"
    },
    "third": {
      "decision": "person-evidence",
      "people": [
        "q037_owner_third"
      ],
      "evidence": "受付札を本人と照合し、封を開けずに写本を渡した。",
      "reason": "三番の札の家で本人との照合と受領の返事がある。他の返却先や依頼人は同席しない。",
      "visual": "三番の札の家の戸口または室内と本人。本人の専用画は接続済み。共通家屋背景に番号の差分を加える候補。告解の内容を見せず、受渡し済みの封書は本人の保持に従う。"
    }
  },
  "next": "三人の各家での人物接続を完了。書記鳥・籠・封書・番号札・控室・各家の局所差分は残る。次の人物実装はq131、人物監査はq132。"
},
  q038:{
  "sourceSha256": "288562662c9e9d7be399e2ea9ceb376a8b1c71c712a2316cb6a9fbee4eccf586",
  "identityNotes": [
    "依頼人は施療人のネイで、q035と同じ役職・名。水質を記す検査人をネイ本人と同定する記述はなく、依頼人欄や結末の清掃当番から現場へ追加しない。q035の配膳係・患者とも統合しない。",
    "waterの検査人は結果を記し、filter_checkでは探索隊と設備の継ぎ目を確かめる。同じ経路の同役として、専用画・inspectorの所在・character・2場面のcastを接続した。検査台から水瓶へのwater_filterでは実際に同行し、lab→transit→entryと移る。",
    "after_testには判定と検査票の受取りがあるが、渡す人物の同席やwaterの検査人との同一性は明記されない。検査結果の存在だけから同じ人物の立ち絵を配置しない。postedへの同行も明記されず、受取所に係員や依頼人を新設しない。",
    "水の飲用判定、浄化材の交換、設備の検査は別の状態。filterChanged・waterTestedと採水前後のsampleAt・afterSampleAtを保ち、炭や沈殿だけで健康上の一般論へ広げない。filter_checkでは交換を確かめる本文に対してfilterChangedの確定はfinish時なので、背景差分は確定前後の境界も調整する。",
    "検査票の携行は本文にあるが現状は独立itemではない。票の所有を実装済みと数えない。瓶・炭・交換札・採水容器・設備継ぎ目・二枚の票と生活用／飲用の区分は非人物素材候補。新しい町や検査施設は追加せず既存3現場を使う。",
    "個別物語改訂1→2。旧定義で保存全体を検証してからinspectorAtだけを補う。water_filterの到着履歴があればentry、同経路の移動中ならtransit、それ以外はlab。待機本文・選択・旅程・採水・交換・報酬を保持し、q032・q036の旧改訂や地理版1とも同時移行する。"
  ],
  "relatedClients": {
    "q035": "施療人のネイ"
  },
  "people": {
    "q038_inspector": {
      "label": "水質と設備を調べる検査人（匿名）",
      "status": "connected",
      "entity": "inspector",
      "need": "waterとfilter_checkの2場面へ専用画・所在・同行・character・castを接続済み。具体的な外見と衣装は美術設定で、氏名・性別・年齢は本文へ追加しない。依頼人ネイとは同定しない。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "交換札は期限を過ぎているが、水は澄んでいる。",
      "reason": "水瓶と札を調べる。特定人物の動作や同席は書かれていない。",
      "visual": "水瓶、黒い沈殿、期限を過ぎた交換札。飲用可の票を先取りしない。"
    },
    "water": {
      "decision": "person-evidence",
      "people": [
        "q038_inspector"
      ],
      "evidence": "清いことと、瓶を交換しなくてよいことは別だと検査人が記す。",
      "reason": "水質検査台で検査人の記す動作が明示される。ネイや患者を加えない。",
      "visual": "検査台、届いた採水容器、検査票。水質と設備の結果を混ぜない。"
    },
    "filter": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "新しい炭を入れたが、飲用可否の検査票はまだない。",
      "reason": "探索隊が水瓶の浄化材を交換した場面。検査人の到着はない。",
      "visual": "新旧の炭と交換済みの状態。飲用可判定の札をまだ出さない。"
    },
    "filter_check": {
      "decision": "person-evidence",
      "people": [
        "q038_inspector"
      ],
      "evidence": "検査人と設備の継ぎ目まで確かめる。",
      "reason": "waterから戻り同じ役と設備を点検する本文。検査台からのjourneyへinspectorを同行させ、実到着後にだけ水瓶の場面へ表示する。",
      "visual": "水瓶と設備の継ぎ目、検査票。finish前後の交換確定を区別する。"
    },
    "after_test": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "二枚の検査票を受け取り、水瓶のある場所へ戻る。",
      "reason": "票の受取りは記されるが、特定の渡し手やwaterの検査人の同席は明示されない。",
      "visual": "交換後の採水容器と二枚の検査票。設備と水質の別を保つ。"
    },
    "posted": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "水瓶の交換札の横に、設備と水質の検査票を並べた。",
      "reason": "票を掲げた場面。検査人の同行・ネイや見物人の同席は書かれていない。",
      "visual": "水瓶、交換札、並べた二枚の票。試験と掲示を別場面として扱う。"
    },
    "supply": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "依頼人の買付票を受取所へ届けた。",
      "reason": "受取所への到着と手配で、特定の窓口担当者の動作・発言は書かれていない。",
      "visual": "水の受取所、買付票と飲用／生活用の区分。新しい施設や係員を加えない。"
    }
  },
  "next": "検査人の接続を完了。瓶・炭・票・検査台・受取所の局所差分は制作候補として残す。次の人物実装はq131、人物監査はq132。"
},
  q039:{
  "sourceSha256": "90784a591e708058f660e54c4976726abe690641c5737ee4f5402af4511cfc83",
  "identityNotes": [
    "依頼人は仮面師のチセ。修理人をチセ本人と同定する記述はないので匿名の役として扱う。結末で仮面を彫り直すチセを会話中の同席へ変換しない。",
    "所有を主張する客は三人。最初の買い手buyerはそのうちの一人であり、三人に加わる四人目として描かない。三人は集団名だけを表示し、氏名・代表者・外見・個人ごとの印は創作しない。buyerの保持者参照は維持し、buyer自身に追加のcastや画像を付けない。",
    "entryで修理人が署名を求め、同じ修理台へ三人を呼び、ownersで実名を伏せた修理印を決め、accountで本人と修理人だけが印の対応を保管する。三場面とも同じ座標の連続した相談で、三人と修理人の出演候補を各場面へ記録する。ownersの修理人はこの連続性からの判断であり、新しい発言や個人名は追加しない。",
    "修理人はperson、三人はgroupとして所在・character・全3場面のcastを接続した。全員同じ修理台に留まる。修理人の専用画1枚と三人の集団名を表示し、集団には意図的に肖像・立ち絵を割り当てない。buyerは集団内の仮面の受取人を区別する既存personとして保持する。",
    "三つの修理印は実名を公開しないための記録。共同管理への同意、輪番の受取役、複製への変更を区別する。jointMarksは印を決めた履歴であり、複製を選んでも消去されない。共同修理帳・対応表・複製は独立itemとして未定義。",
    "仮面の原型、裏の小さな印、修理台、署名用紙、共同修理帳と非公開の対応表、複製は道具・背景差分の候補。対応表の実名や告解の内容は画に書かない。新しい町・施設・旅程は不要で、region_4_f2 (17,3)の局所場面を使う。",
    "個別物語改訂1→2。旧定義で保存全体を検証した後にrepairerAt・claimantsAtをentryとして補う。本文・VM・選択・buyerAt・maskAt・jointMarks・知識・結末・報酬を保持し、旧q032・q036・同行中のq038、地理版1と旧経路のq131とも同時移行する。"
  ],
  "people": {
    "q039_claimants": {
      "label": "仮面の所有を主張する三人",
      "status": "connected",
      "entity": "claimants",
      "need": "同じ修理台の3場面へ所在・character・castと集団名を接続済み。buyerを含む三人で、別の四人目や代表者・個人画を加えない。"
    },
    "q039_repairer": {
      "label": "署名と修理印を扱う修理人（匿名）",
      "status": "connected",
      "entity": "repairer",
      "need": "同じ修理台の3場面へ専用画・所在・character・castを接続済み。チセとは同定しない。外見と衣装は美術設定。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q039_claimants",
        "q039_repairer"
      ],
      "evidence": "同じ仮面を自分の物だという客が三人いる。修理人は一人の署名だけを求めている。",
      "reason": "三人の主張と修理人の要求が明示される。最初の買い手を四人目として追加しない。",
      "visual": "原型の仮面と修理台、署名用紙。三つの修理印はまだ決まっていない。"
    },
    "owners": {
      "decision": "person-evidence",
      "people": [
        "q039_claimants",
        "q039_repairer"
      ],
      "evidence": "三人は顔を共有しているが、実名の公開を約束したことはない。",
      "reason": "同じ修理台で三人の意向を確認する。修理人は前後の署名要求と印の保管を担う連続した相談相手として扱う。",
      "visual": "共有する仮面と修理台。実名・対応表・完成済みの複製を公開しない。"
    },
    "account": {
      "decision": "person-evidence",
      "people": [
        "q039_claimants",
        "q039_repairer"
      ],
      "evidence": "三人は共同名義と輪番の受取役に同意した。印の対応は本人と修理人だけが保管する。",
      "reason": "三人と修理人の合意・保管が明示される。輪番の担当を別の四人目として追加しない。",
      "visual": "共同修理帳と三つの印、閉じた対応表。共同管理を続ける場合と複製へ分ける結末を区別する。"
    }
  },
  "next": "修理人と三人の集団名の接続を完了。仮面・印・修理台・帳面の局所差分は残る。次の人物実装はq131、人物監査はq132。"
},
  q040:{
  "sourceSha256": "2b579178fd8733d6b9fc116e0d338241fca25ff5793f58953111cae6f9a2044e",
  "identityNotes": [
    "依頼人は修復師のサイ。q032と同じ役職・名だが、現場の証人をサイ本人と同定する記述はない。q032の職人や国境の交代員サイとも統合しない。結末の記録係の動作を会話場面へ遡って追加しない。",
    "witnessという場面は大鏡の前のentryにあり、追放された者の声と敵意のある影を聞く。一方、personエンティティwitnessは鏡の外の記録机recordに留まる証人。場面名の一致から、鏡の中の話者と外の受取人を同一人物にしない。",
    "shadowで写しを預かる既存witnessへ、匿名の証人q040_witnessの専用画・character・castを接続済み。witness_copyの実到着時のcopyAt: party→witnessを維持する。外見・年齢感・性別の描画・衣装は美術設定で、氏名や他人物との同一性を本文へ加えない。",
    "collect_mirrorでは写しを受け取って大鏡の前へ戻る。受渡しはrecordからの出発時に行い、証人はrecordに残る。fragmentもrecordを使うが、本文は探索隊が断片を書き留めるだけで特定の同席者を明示しない。同じ場所だけを根拠に証人の立ち絵を追加しない。",
    "鏡の中の助けを求める声・呪う声・追放された者、敵意のある影と鏡の主は、外の生身の証人とは別に扱う。声や影の数・顔・氏名を創作しない。既存boss_4の戦闘を維持し、敵の絵を会話用人物の不足枚数へ自動計上しない。",
    "mirrorAtはentry→party→isolation。copyAtは通常party、写した経路ではwitnessへ渡し、回収経路ではparty→isolationと移る。直接隔離する場合は写しを作成したとは扱わず、isolationに二包みを一律表示しない。testimonyは写しを証人へ渡した履歴で、断片の記録と完全な証言を区別する。",
    "fragment経路は、覚えている日付だけを記録し、鏡を元の場所entryに残す本文・選択・結末へ整理した。名前と言葉の続きは空白とし、完全な証言や鏡の隔離を達成したとは扱わない。既存の所在・移動・戦闘・報酬と物語改訂1は維持する。旧保存の待機本文と選択待ち位置は保持し、選択肢のラベルは訂正後の現行定義から表示する。新たに読む場面と結末から訂正後の本文を使う。",
    "大鏡、声と影の差分、未記入の紙／証言の写し／日付と断片の記録、記録机、別々に包む鏡と写し、閉鎖区画と調査中の札が非人物素材候補。鏡前region_4_f2 (8,13)、記録机(8,7)、閉鎖区画(3,5)の既存3現場を使い、新しい町や証人の家は追加しない。"
  ],
  "relatedClients": {
    "q032": "修復師のサイ"
  },
  "people": {
    "q040_witness": {
      "label": "鏡の外で写しを預かる証人（匿名）",
      "status": "connected",
      "entity": "witness",
      "need": "既存person witnessのrecordの所在を保ち、shadowの1場面へ専用画・character・castを接続済み。鏡の中の追放された者やサイとは同定しない。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "助けを求める声と、こちらを呪う声が交互に来る。",
      "reason": "鏡を通した声で、外の生身の証人の同席ではない。依頼人も追加しない。",
      "visual": "大鏡と異なる声の気配。顔や発話者の人数を新しく確定しない。"
    },
    "witness": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "追放された者が門の閉じた日を語った。続く影はその名を消せと命じる。",
      "reason": "鏡の中の声と影を聞く。recordにいる同名エンティティwitnessは別の役で、この場所へ移動していない。",
      "visual": "鏡内の声と影、まだ外へ写していない証言。完全な写しを先取りしない。"
    },
    "shadow": {
      "decision": "person-evidence",
      "people": [
        "q040_witness"
      ],
      "evidence": "写しを証人へ預けた。",
      "reason": "記録机への実到着時にcopyを預かる既存witnessの動作が根拠。鏡の中の話者と外の受取人を分ける。",
      "visual": "記録机と証人が預かる写し、紙を狙う影。鏡本体の所在はentryのまま。"
    },
    "after": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "影は退いたが、声は一緒に途切れた。日付だけは覚えている。",
      "reason": "戦いの後の鏡前。証人はrecordに残り、声の主を生身で追加しない。",
      "visual": "声が途切れた大鏡。完全な証言の写しや未取得の名前を描かない。"
    },
    "collect_mirror": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "証言の写しを受け取り、大鏡の前へ戻った。",
      "reason": "証人からの受渡しは記録机を離れる前に済む。鏡前へ戻った探索隊に証人は同行しない。",
      "visual": "partyにある写しとentryの大鏡。carryを選ぶ前から隔離済みにはしない。"
    },
    "isolated": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "鏡を閉鎖区画へ据え、入口に調査中の札を掛けた。",
      "reason": "鏡を運び込んだ探索隊の場面。証人・依頼人・監視員の同席は明記されない。",
      "visual": "隔離した鏡と調査中の札。写しを運んだ経路だけcopyAt: isolationを表示する。"
    },
    "fragment": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "記録机で覚えている日付を書き留めた。名前と言葉の続きは空白のまま残す。",
      "reason": "探索隊の記録。証人と同じrecordでも会話や受渡しがなく、結末の記録係をここへ追加しない。",
      "visual": "覚えている日付と空白を残す記録。鏡はentryに残り、完全な証言・名前・隔離済みを示す素材は使わない。"
    }
  },
  "next": "外の証人の表示と断片経路の本文・状態の整合を完了。大鏡・写し・日付の記録・包装・記録机・閉鎖区画と札は制作候補。次の人物実装はq131の三人、人物監査はq132。"
},
  q131:{
  "sourceSha256": "a8d618f60543f1eda9a048409f4bcbfe3ab4ee8b5992ae2a61616b9301cb56b8",
  "identityNotes": [
    "依頼人は考古学者シェル。固定過去に師を探して砂の回廊へ入る本人と、同行する荷担ぎが明記される。sherはシェル、teacherはその師、porterはその荷担ぎで、既存personエンティティ3役を専用画の候補とする。シェルは本文で彼女、荷担ぎは結末で彼と呼ばれるが、具体的な容貌・年齢・衣装は未設定。師と荷担ぎの氏名は創作せず、他依頼の師・荷役人へ統合しない。",
    "シェルと荷担ぎはentryに始まり、entry_test・entry_tracks・lost_testで探索隊と一緒に移動する。足跡を誤読して入口へ戻るlostでも二人は同行中で、別れたことにはしない。師はroomに留まり、entryとlostには出演させない。",
    "roomでは師が誤読を認めたがらず、シェルと荷担ぎも到着済み。縄を消費するroom_both_readyは同じ避難室で準備が済んだ段階で、三人ともまだroomにいる。準備完了を帰還や標本の引渡し完了として描かない。",
    "person_homeとcreditでは師・シェル・荷担ぎがreportへ到着する。sample_homeではシェルと荷担ぎだけがreportへ来て、師はroomに残る。救助班への引継ぎを師の救出完了へ置き換えず、受付係・後続の救助班を新たな固定出演者として追加しない。",
    "標本は初期room。人だけの帰還ではroomに残り、標本だけ・両方の経路では出発時room→party、到着時party→reportとなる。縄1つの消費はroom_bothの準備時だけで、continueや保存再開で重ねて消費しない。師弟だけの発表でも荷担ぎが去る動作はなく、同じcreditで人物を消さない。",
    "旧受注済み経路はpreserveAcceptedRouteで初版の旧命令列を保持する。新経路のcast追加を旧経路の人物表示完了と混同しない。実装時は未受注からの新経路、既存の現場接続済み保存、受注済み旧経路を分けて検証する。",
    "非人物の不足は、砂の凹凸が反転する足跡、釘の目印、連続する引きずり線、綱・縄、標本と運搬具、発見報告書と共同発見者の記載差分。標本の種別や荷担ぎの固有名は未設定。共通人物画へ標本や署名を固定しない。",
    "現場はe2_sand_galleryの釘の目印(3,1)、入口へ戻る足跡(1,1)、避難室(11,7)、巡礼台地の探索組合pilgrim_unionの4地点。回廊の3地点は既存室内描画に砂・目印・避難室の差分、組合は帰還受付と報告机の局所背景を加える候補。新しい町や独立した研究所は不要。"
  ],
  "relatedClients": {},
  "people": {
    "q131_sher": {
      "label": "考古学者シェル",
      "status": "candidate",
      "need": "既存sherは全7場面へ同行・到着する。専用画・character・castは未接続。依頼人名と固定過去から本人を特定する。"
    },
    "q131_teacher": {
      "label": "シェルの師（匿名）",
      "status": "candidate",
      "need": "room・room_both_ready・person_home・creditの4場面が対象。sample_homeでは避難室に残り、入口にも加えない。"
    },
    "q131_porter": {
      "label": "同行する荷担ぎ（匿名）",
      "status": "candidate",
      "need": "既存porterはシェルとともに全7場面へ同行する。専用画・character・castは未接続。氏名や他の荷役人との同一性を追加しない。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q131_sher",
        "q131_porter"
      ],
      "evidence": "荷担ぎが落とした釘は、一区画を越えると砂の下から上へ現れた。",
      "reason": "荷担ぎの実演があり、シェルの同行は固定過去とsherAt: entryが根拠。師はroomで待機する。",
      "visual": "釘、反転した砂の足跡、引きずり線。二人だけが同席し、標本と師を入口へ置かない。"
    },
    "lost": {
      "decision": "person-evidence",
      "people": [
        "q131_sher",
        "q131_porter"
      ],
      "evidence": "入口へ戻ってしまった。釘を落とした場所だけは目印が残る。",
      "reason": "entry_tracksでsher・porterの二人が探索隊とlostへ実到着している。戻るlost_testでも同行を保つ。",
      "visual": "入口の足跡と釘の目印。遭難した師の姿はなく、標本も未回収。"
    },
    "room": {
      "decision": "person-evidence",
      "people": [
        "q131_teacher",
        "q131_sher",
        "q131_porter"
      ],
      "evidence": "避難室の師は生きているが、自分の誤読を認めたがらない。",
      "reason": "師の動作が明記され、sher・porterもentry_testで同じ避難室へ到着済み。三人の所在がroomで一致する。",
      "visual": "避難室の師、標本、荷物を引いた線。運搬方法を選ぶ前で、縄の消費や帰還を先取りしない。"
    },
    "credit": {
      "decision": "person-evidence",
      "people": [
        "q131_teacher",
        "q131_sher",
        "q131_porter"
      ],
      "evidence": "発見報告に誰の名を載せるか、シェルが原稿を広げる。",
      "reason": "三人がroom_both_ready_continueでreportへ到着済み。本文にも師・荷担ぎ・シェルが登場する。",
      "visual": "組合の報告机、到着した標本、提出前の原稿。共同発見者の記載はall／schoolの選択後に分ける。"
    },
    "person_home": {
      "decision": "person-evidence",
      "people": [
        "q131_teacher",
        "q131_sher",
        "q131_porter"
      ],
      "evidence": "師を組合の帰還受付へ引き渡した。標本は避難室に残り、その位置を記録する。",
      "reason": "room_personで師・シェル・荷担ぎがreportへ到着する。新しい受付係の固定出演は本文から追加しない。",
      "visual": "帰還受付と師、未回収標本の位置記録。標本は避難室に残るため受付へ描かない。"
    },
    "sample_home": {
      "decision": "person-evidence",
      "people": [
        "q131_sher",
        "q131_porter"
      ],
      "evidence": "標本を受付へ置き、師の避難室と通った道を救助班へ伝えた。師を救出済みにはしない。",
      "reason": "room_sampleでsher・porterだけが同行し、teacherAtはroomのまま。報告先の救助班を代表者一人として創作しない。",
      "visual": "受付の標本と救援への経路情報。師の姿や帰還済みの印は置かない。"
    },
    "room_both_ready": {
      "decision": "person-evidence",
      "people": [
        "q131_teacher",
        "q131_sher",
        "q131_porter"
      ],
      "evidence": "必要な道具を使って準備を整えた。ここから目的地まで運ぶ。",
      "reason": "room_bothで縄を一つ消費した後の同じ避難室。teacher・sher・porterはroomに留まり、continueを選ぶまで移動を始めない。",
      "visual": "縄の準備と避難室にある標本。運搬中・帰還済みの差分はまだ使わない。"
    }
  },
  "next": "三人の専用画・character・castを実同行と所在へ接続し、旧受注済み経路との互換を確認する。砂・釘・引きずり線・縄・標本・報告書と受付の背景差分は制作候補。次の人物監査はq132。"
}
 }
};
