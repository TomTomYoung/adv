// Editorial audit: candidate IDs are local; connected roles cite their game entity.
// Update a fingerprint only after rereading the changed quest and its evidence.
export const RELOCATED_CAST_REVIEW={
 reviewedAt:'2026-11-01',
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
  "next": "外の証人の表示と断片経路の本文・状態の整合を完了。大鏡・写し・日付の記録・包装・記録机・閉鎖区画と札は制作候補。q131の三人も接続済み。q132の管理人も接続済み。q133のドマと石工も接続済み。q134の4役も接続済み。q135のアネと給仕人形の表示・工房本文と魔石受渡しの整合も完了。次はq136のトゥリと傭兵の表示・所在・同行の整理、扉と録音と守護者の描き分け。人物監査はq137。"
},
  q131:{
  "sourceSha256": "f7c8a0eb19abc670167b173dcbd61880dab440790f92b5c64b91ce85f14c2494",
  "identityNotes": [
    "依頼人は考古学者シェル。固定過去に師を探して砂の回廊へ入る本人と、同行する荷担ぎが明記される。sherはシェル、teacherはその師、porterはその荷担ぎで、既存personエンティティ3役へ専用画を接続済み。シェルは本文で彼女、荷担ぎは結末で彼と呼ばれるが、具体的な容貌・年齢・衣装は未設定。師と荷担ぎの氏名は創作せず、他依頼の師・荷役人へ統合しない。",
    "シェルと荷担ぎはentryに始まり、entry_test・entry_tracks・lost_testで探索隊と一緒に移動する。足跡を誤読して入口へ戻るlostでも二人は同行中で、別れたことにはしない。師はroomに留まり、entryとlostには出演させない。",
    "roomでは師が誤読を認めたがらず、シェルと荷担ぎも到着済み。縄を消費するroom_both_readyは同じ避難室で準備が済んだ段階で、三人ともまだroomにいる。準備完了を帰還や標本の引渡し完了として描かない。",
    "person_homeとcreditでは師・シェル・荷担ぎがreportへ到着する。sample_homeではシェルと荷担ぎだけがreportへ来て、師はroomに残る。救助班への引継ぎを師の救出完了へ置き換えず、受付係・後続の救助班を新たな固定出演者として追加しない。",
    "標本は初期room。人だけの帰還ではroomに残り、標本だけ・両方の経路では出発時room→party、到着時party→reportとなる。縄1つの消費はroom_bothの準備時だけで、continueや保存再開で重ねて消費しない。師弟だけの発表でも荷担ぎが去る動作はなく、同じcreditで人物を消さない。",
    "旧受注済み経路はpreserveAcceptedRouteで初版の旧命令列を保持する。新経路のcast追加を旧経路の人物表示完了と混同しない。未受注からの新経路、既存の現場接続済み保存、受注済み旧経路を分けて検証済み。",
    "非人物の不足は、砂の凹凸が反転する足跡、釘の目印、連続する引きずり線、綱・縄、標本と運搬具、発見報告書と共同発見者の記載差分。標本の種別や荷担ぎの固有名は未設定。共通人物画へ標本や署名を固定しない。",
    "現場はe2_sand_galleryの釘の目印(3,1)、入口へ戻る足跡(1,1)、避難室(11,7)、巡礼台地の探索組合pilgrim_unionの4地点。回廊の3地点は既存室内描画に砂・目印・避難室の差分、組合は帰還受付と報告机の局所背景を加える候補。新しい町や独立した研究所は不要。",
    "三人の既存所在・同行・本文・物語改訂1を維持して出演を接続した。現場接続済み旧保存は無変換で再開し、現場接続前に受注した旧経路には人物表示を追加しない。師の性別・三人の衣装など本文で指定されない外見は美術設定として区別する。"
  ],
  "relatedClients": {},
  "people": {
    "q131_sher": {
      "label": "考古学者シェル",
      "status": "connected",
      "need": "既存sherは全7場面へ同行・到着する。専用透過画・character・castを接続済み。依頼人名と固定過去から本人を特定する。",
      "entity": "sher"
    },
    "q131_teacher": {
      "label": "シェルの師（匿名）",
      "status": "connected",
      "need": "room・room_both_ready・person_home・creditの4場面が対象。sample_homeでは避難室に残り、入口にも加えない。専用透過画・character・castを接続済み。",
      "entity": "teacher"
    },
    "q131_porter": {
      "label": "同行する荷担ぎ（匿名）",
      "status": "connected",
      "need": "既存porterはシェルとともに全7場面へ同行する。専用透過画・character・castを接続済み。氏名や他の荷役人との同一性を追加しない。",
      "entity": "porter"
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
  "next": "三人の人物接続と旧保存の互換検証は完了。砂・釘・引きずり線・縄・標本・報告書と受付の背景差分は制作候補。q132の管理人も接続済み。q133のドマと石工も接続済み。q134の4役も接続済み。q135のアネと給仕人形の表示・工房本文と魔石受渡しの整合も完了。次はq136のトゥリと傭兵の表示・所在・同行の整理、扉と録音と守護者の描き分け。人物監査はq137。"
},
  q132:{
  "sourceSha256": "4b50934f4c067aafda770d54496d9ffcb1bc4e64bf1ade2d09b81881127f91db",
  "identityNotes": [
    "依頼人は匿名の財宝庫の管理人。testで父の座り方と合図を教え、isolateで見張りの費用を引き受ける。両場面の同席根拠はあるが、entryの依頼人欄だけから同席を追加しない。父は過去の警備員であり、現在の人物画を新設しない。",
    "fightの詰所の人は安全側へ退避する対象で、人数・氏名・代表者を創作しない。危険な箱の前に固定castを追加せず、管理人との同一性も断定しない。管理人のperson・所在・station→sealの同行を接続済み。討伐への帰路には同行せず、詰所からの討伐ならstation、囮試験後ならsealに留まる。",
    "boxAtはentryに留まり、囮はstationからpartyを経由してsealへ実到着する。本文の箱の口が開く描写を、箱そのものの移送や囮を箱内へ格納した保持者状態に読み替えない。縄1つで隔離を確定するまで、封鎖済みには描かない。",
    "既存region_4_f1の宝箱前(5,1)、古い詰所(7,3)、外側の封鎖地点(7,1)を局所背景・状態差分で分ける。新しい町や独立した財宝庫施設の追加は不要。",
    "物語改訂1→2で、旧定義による保存全体の検証後にmanagerAtだけを補う。初期station、test_decoyの実到着後seal、同経路の移動中transit。本文・既存の箱と囮の所在・縄の消費・戦闘・報酬は保持する。現場接続前に受注した旧経路には人物状態も追加castも加えない。"
  ],
  "relatedClients": {},
  "people": {
    "q132_manager": {
      "label": "財宝庫の管理人（匿名）",
      "status": "connected",
      "entity": "manager",
      "need": "test・isolateの2場面へ専用画・person・所在・station→sealの実同行を接続済み。entry・fightには表示せず、安全側に留まる。父や退避する詰所の人々と同一視しない。旧保存へは所在だけを追加し、現場接続前から受注した旧経路は保持する。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "宝箱の底には小さな椅子と茶器がある。",
      "reason": "箱・椅子・茶器・覗き穴の説明だけで、管理人の現場同席は確定しない。",
      "visual": "宝箱、小さな椅子、茶器、外向きの覗き穴。過去の警備員を現在の出演者として描かない。"
    },
    "test": {
      "decision": "person-evidence",
      "people": [
        "q132_manager"
      ],
      "evidence": "管理人は父の座り方と合図を教えた。",
      "reason": "管理人本人の説明が明記される。古い詰所だった事実と、今の擬態生物が人を襲う危険を両立させる。",
      "visual": "詰所記録、食べ物の古さの手掛かり、座り方と合図、試験前の囮。父の回想を固定立ち絵へ変換しない。"
    },
    "isolate": {
      "decision": "person-evidence",
      "people": [
        "q132_manager"
      ],
      "evidence": "継続して見張る費用は管理人が引き受ける。",
      "reason": "管理人の費用負担の申し出があり、test_decoyで詰所から封鎖地点へ探索隊と実到着している。移動中はtransitとし、到着前の出演を先取りしない。",
      "visual": "外側の封鎖具・縄・到着した囮・開いた箱。隔離確定後の当番と費用の帳面、椅子を安全側へ移した差分を分ける。"
    },
    "fight": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "詰所の人を安全な側へ退かせてから討伐する。",
      "reason": "退避先の人々を危険な箱の前に常駐させない。人数・顔・管理人との同一性は本文から確定しない。",
      "visual": "箱の前へ実際に戻った状態、退避後の戦闘、破壊後の箱と回収した椅子・薄い座布団。"
    }
  },
  "next": "管理人の専用画・所在・同行と保存移行の実装は完了。箱の開閉・破壊・隔離、小さな椅子・茶器・座布団、覗き穴・詰所記録・囮・封鎖具・当番費用帳は素材候補。q133のドマと石工も接続済み。q134の4役も接続済み。q135のアネと給仕人形の表示・工房本文と魔石受渡しの整合も完了。次はq136のトゥリと傭兵の表示・所在・同行の整理、扉と録音と守護者の描き分け。人物監査はq137。"
},
  q133:{
  "sourceSha256": "5dd398d20116fa4f3bbd8a65b07b0325e3536aa34a66c7434b675b26eedaff6c",
  "identityNotes": [
    "依頼人は建築師ドマ。固定過去で師の図面を守りたい本人と同行の石工が意見を異にする。二人の同行が前提で、entryではドマの反応、warningとstairsでは石工の行動、saveの結末ではドマの追記が明記される。二人のperson・所在・往復同行・castを全5場面へ接続済み。",
    "ドマと石工は全5場面へ接続済み。platform・drawingなど個々の本文に二人を明記しない場面は、固定過去の同行と同じ調査の継続からの判断で、本文に新しい発言があるとの断定ではない。師匠は図面を残した過去の人物で、現在の固定出演者へ追加しない。匿名の石工をq032の石工台の職人や修復師サイへ統合しない。",
    "階段上entryはregion_4_f1 (6,1)、荷台platformは(7,3)。錘試験と手動固定で荷台へ行き、図面の掲示と階段改修では上へ実際に戻る。二人の往復同行をこの4旅程へ接続済み。warningは同じ階段上で落下前に引き戻された段階で、落下・負傷・救助搬送を追加しない。",
    "weightChecked・fixedは各経路で荷台へ実到着した時に立つ。試験前から作業済みの差分へ切り替えない。錘の具体的重量や荷台の耐荷重は本文に数値がなく、図面へ恣意的な数値を記さない。現行の無料の手動固定と二つの結末を維持する。",
    "荷台の(7,3)はq132の詰所と同じ座標。依頼ごとの場面文脈で局所差分を選び、座標だけで宝箱の詰所や階段機構を一律に描かない。新しい町や独立した葬祭施設の追加は不要。",
    "物語改訂1→2。旧定義で保存全体を検証した後、partyAtと同じ値のdomaAt・masonAtだけを補う。二人は初期から探索隊と同行し、移動中transit・実到着先・退却後の再開をそろえる。本文・重量と固定の到着時確定・準備なしの安全なやり直し・両結末・報酬は維持する。現場接続前に受注した旧経路へ人物状態とcastを混入させない。"
  ],
  "relatedClients": {
    "q032": "修復師のサイ"
  },
  "people": {
    "q133_doma": {
      "label": "建築師ドマ",
      "status": "connected",
      "entity": "doma",
      "need": "全5場面へ専用画・person・所在を接続済み。階段上と荷台の往復4旅程に同行する。師匠本人と区別し、本文にない年齢・性別の描画・衣装は美術設定として記録する。旧保存には隊と同じ所在だけを補う。"
    },
    "q133_mason": {
      "label": "同行の石工（匿名）",
      "status": "connected",
      "entity": "mason",
      "need": "全5場面へ専用画・person・所在を接続済み。ドマと探索隊に往復同行し、準備なしで踏んだ後も同じ階段上に留まる。氏名や他依頼の職人との同一性を追加せず、外見は美術設定として分ける。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q133_doma",
        "q133_mason"
      ],
      "evidence": "ドマは師の図面の誤りを認めまいとする。",
      "reason": "ドマ本人の反応があり、石工は固定過去の同行者で手動固定の選択相手。二人の調査開始地点へ接続済み。",
      "visual": "師の図面、靴跡のない段、肩の高さの擦れ溝、試験前の錘と固定具。過去の葬列を現在の同行者として増やさない。"
    },
    "warning": {
      "decision": "person-evidence",
      "people": [
        "q133_doma",
        "q133_mason"
      ],
      "evidence": "足元が沈み始め、石工が腕を引いた。",
      "reason": "石工の救援動作が明記され、ドマの退出はない。同じ階段上の準備やり直しで、下の荷台へ到着したことにはしない。",
      "visual": "沈み始めた段と安全側へ引き戻す動作。落下後の破損・負傷・搬送済みの差分を作らない。"
    },
    "platform": {
      "decision": "person-evidence",
      "people": [
        "q133_doma",
        "q133_mason"
      ],
      "evidence": "重い棺を載せる時だけ下がる荷台だった。",
      "reason": "本文は機構の説明。二人の同席は固定過去の同行と錘試験／石工との共同固定の継続による。両経路の実同行と所在を接続済みで、荷台への到着時だけ表示する。",
      "visual": "下降する荷台、重い石棺を載せる用途、錘試験と手動固定の差分。現在進行中の葬列や未指定の故人を描かない。"
    },
    "drawing": {
      "decision": "person-evidence",
      "people": [
        "q133_doma",
        "q133_mason"
      ],
      "evidence": "階段の上へ戻り、図面へ実測した重量条件を記した。",
      "reason": "同じ調査の帰路で、saveの結末ではドマ本人が重さを追記する。石工も階段上へ実同行して到着済み。掲示対象の参拝者を固定castへ増やさない。",
      "visual": "追記前／重量条件を補った図面と掲示位置、保存する荷台。数値と単位を創作せず、通常階段への改修済みにしない。"
    },
    "stairs": {
      "decision": "person-evidence",
      "people": [
        "q133_doma",
        "q133_mason"
      ],
      "evidence": "荷台の構造を記録し、石工と通常の参拝階段への改修を終えた。",
      "reason": "石工の共同作業が明記される。ドマも同じ調査の同行者として階段上へ実到着している。師の図面自体を破棄した扱いにしない。",
      "visual": "記録した荷台構造、改修前後の通常階段、増える参拝者の足跡。棺用の図面と過去の機構の記録を保つ。"
    }
  },
  "next": "二人の専用画・person・所在・全5場面のcast・往復同行と旧保存移行を接続済み。階段・荷台・溝・錘・固定具・図面の状態差分は制作候補。q134の4役も接続済み。q135のアネと給仕人形の表示・工房本文と魔石受渡しの整合も完了。次はq136のトゥリと傭兵の表示・所在・同行の整理、扉と録音と守護者の描き分け。人物監査はq137。"
},
  q134:{
  "sourceSha256": "a6b015188b741894d2937b3be48433c78bb0543e04d6006bcccfe0f6b17a0676",
  "identityNotes": [
    "依頼人は剣士ザグ。entryの模擬決闘と師の剣の返却が本人の根拠。既存zag・master・ownerへ専用画を接続し、庫番custodianのperson・所在・受付keeperからvaultへの実同行を追加した。4役を7場面へ表示し、brokenには人物を置かない。",
    "修道士は固定過去で遺失物の事情を知る人物としてのみ記される。庫番との同一性も現在の各場面への同席も明記されず、別の固定人物や庫番の名前にしない。戦う番人は敵側の役であり、庫番と同一にしない。師の氏名と届け先の氏名・品の具体名も創作しない。",
    "ザグはentry→keeper、剣の経路ならkeeper→masterへ既存旅程で同行する。届け物経路ではkeeperに残るため、receiptで同じ受付へ戻った時にも出演する。これは台詞の追加ではなく保存された所在からの判断。届け先ownerと庫内parcel_endには同行させない。",
    "破壊経路のentry_break_readyではザグはentryに残っている。戦闘勝利後の同じ入口での出演を接続したが、庫へ入る旅程には同行しないためbrokenには表示しない。模擬決闘を実際の番人戦や敗北救助へ置き換えない。辞退の挑戦料精算は既存の定額報酬表現を保ち、新しい支払い・返金処理を追加しない。",
    "師の剣swordはzagからmasterへ、練習剣practiceはmasterからzagへ、師の家へ実到着した時に交換する。預かり物parcelはkeeper→party→owner、受領証receiptはowner→party→keeper。受領証の照合前に正式な入庫や受領済みの図を使わない。剣の結末には庫への追加移動がなく、架空の入庫場面を増やさない。",
    "既存5地点はregion_4_f1の入口(8,1)・返却受付(9,5)・庫内(11,5)、巡礼台地の剣の持主宅pilgrim_master・預かり物の持主宅pilgrim_parcel_owner。入口の名札・破壊穴、受付の名簿と受領証、持主あり／なしの品、各家の返却窓口を局所差分にする。新しい町や組合への名簿送付場面は不要。",
    "物語改訂1→2。旧定義で保存全体を検証後、到着履歴receipt_enterと進行中の旅程からcustodianAtだけをkeeper／transit／vaultへ補う。地点keeperと人物custodianを分け、既存のparcelAt・receiptAtの保持者keeperを変更しない。師の剣・練習剣の交換、届け物・受領証の受渡し、本文・戦闘・報酬・現場接続前の旧受注経路を保持する。"
  ],
  "relatedClients": {},
  "people": {
    "q134_zag": {
      "label": "剣士ザグ",
      "status": "connected",
      "need": "既存zagへ専用画を接続済みで、entry・return・sword_home・receipt・entry_break_readyに所在どおり表示する。届け先と庫内に同行を増やさず、師の剣と練習剣を共通人物画へ固定しない。",
      "entity": "zag"
    },
    "q134_master": {
      "label": "ザグの師（剣の持主）",
      "status": "connected",
      "need": "既存masterへ専用画を接続済みで、sword_homeの家だけに表示する。生存する師を過去の肖像へ置き換えず、剣の受渡しは実到着時に確定する。",
      "entity": "master"
    },
    "q134_owner": {
      "label": "預かり物の持主（匿名）",
      "status": "connected",
      "need": "既存ownerへ専用画を接続済みで、deliveredの家だけに表示する。品を受け取り受領証を渡す動作を保ち、師や他依頼の返却先へ統合しない。",
      "entity": "owner"
    },
    "q134_keeper": {
      "label": "宝物庫の庫番（匿名）",
      "status": "connected",
      "need": "person・所在・専用画を追加済みで、return・receipt・parcel_endに表示する。receipt_enterで受付から庫内へ実同行を接続し、旧保存では到着履歴と旅程から所在だけを補う。修道士や戦う番人との同一性を断定しない。",
      "entity": "custodian"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q134_zag"
      ],
      "evidence": "ザグは模擬決闘でわざと負けた。",
      "reason": "本人の動作と既存zagAt=entryが一致する。庫番・師・届け先を入口へ呼び寄せない。",
      "visual": "開かない扉、返却先を記した名札、模擬決闘の後。勝敗と所有の主張を区別する。"
    },
    "return": {
      "decision": "person-evidence",
      "people": [
        "q134_zag",
        "q134_keeper"
      ],
      "evidence": "代わりに庫番の届け物を運ぶ道もある。",
      "reason": "庫番へ尋ねる選択の到着先で、ザグも既存の同行で受付へ到着する。庫番の人物状態custodianを追加し、二人を表示する。",
      "visual": "返却の受付、名札と名簿、まだ預かり中の品、ザグが持つ師の剣。"
    },
    "broken": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "番人を退けた穴から庫へ入った。",
      "reason": "戦闘後に探索隊だけが庫内へ移動する。ザグはentry、師と届け先は各家で、庫番の同席もない。返却要求の名簿送付は結末の記述として区別する。",
      "visual": "破られた入口、持主のあるままの品と名札。正当な受領済みの差分を使わない。"
    },
    "sword_home": {
      "decision": "person-evidence",
      "people": [
        "q134_zag",
        "q134_master"
      ],
      "evidence": "ザグが師へ剣を返し、別の練習剣を受け取るところを見届けた。",
      "reason": "二人の対面と交換が明記され、ザグも既存旅程で師の家へ到着している。師は家を離れない。",
      "visual": "師の家の返却場所、返した師の剣と受け取った練習剣の所有差分。"
    },
    "delivered": {
      "decision": "person-evidence",
      "people": [
        "q134_owner"
      ],
      "evidence": "持主が品を受け取り、受領証を渡した。",
      "reason": "既存ownerの家での受渡し。ザグと庫番は受付に残り、師は別の家にいる。",
      "visual": "預かり物の受渡し、持主から渡された受領証。品の具体名や中身を創作しない。"
    },
    "receipt": {
      "decision": "person-evidence",
      "people": [
        "q134_zag",
        "q134_keeper"
      ],
      "evidence": "庫番は受領証と名簿を照合し、庫の内側を指した。",
      "reason": "庫番の照合が明記される。ザグも届け物へ同行せず同じkeeperに残るため表示する。発言の追加を意味しない。",
      "visual": "持ち帰った受領証と名簿の照合、庫内を案内する段階。入庫完了にはしない。"
    },
    "parcel_end": {
      "decision": "person-evidence",
      "people": [
        "q134_keeper"
      ],
      "evidence": "庫番と持主のない品を確かめて受け取った。",
      "reason": "庫内で庫番の同席が明記される。受付からの実同行と所在を追加済み。ザグは受付に残し、持主のある品を譲渡したことにしない。",
      "visual": "正式に開いた入口、持主のない品と確認済みの名簿、受領の差分。"
    },
    "entry_break_ready": {
      "decision": "person-evidence",
      "people": [
        "q134_zag"
      ],
      "evidence": "戦いに勝利し、先へ進む道が開いた。",
      "reason": "本文は戦闘後の準備を述べる。ザグは既存所在がentryのままなので表示する。次の庫内への移動では同行しない。倒した番人や庫番を同行者へ加えない。",
      "visual": "戦闘後の入口と開いた道。まだ庫内へ入っておらず、回収品を受領済みにしない。"
    }
  },
  "next": "4役の専用画・7場面のcast、庫番の実同行と旧保存移行を接続済み。名札・剣・届け物・受領証・名簿・庫の状態差分は制作候補。q135のアネと給仕人形の表示・工房本文と魔石受渡しの整合も完了。次はq136のトゥリと傭兵の表示・所在・同行の整理、扉と録音と守護者の描き分け。人物監査はq137。"
},
  q135:{
  "sourceSha256": "1b9f123fdd9e003bfb849e4b5e0ca9ad4f04af685cde30d4732f739714afb1aa",
  "identityNotes": [
    "依頼人は潜水具職人アネ。既存person aneの所在・同行を使い、entry・reply・二つの準備後・surfaced・refill・retrainedの7場面へ専用画を接続済み。魔石回収経路ではentryに残り、stone_reportへ表示しない。",
    "給仕人形は既存item dollを維持し、食堂4場面・浮上・工房の6場面へ専用画を接続済み。三作業はパンを出す・湯を注ぐ・返事を待つ。祖母の幽霊ではなく、personエンティティ数や人間の人数へ加算しない。祖母・過去の客・新しい宿の客は固定castへ増やさない。",
    "工房の職人がアネと同一かは原文で未確定。retrainedは工房へ人形を据える場所・作業の描写へ整理した。アネと同一人物とも第三者とも断定せず、独立した職人の人物定義・画像・castは追加しない。初版と旧保存の待機文章は原文を保持する。",
    "縄1つを準備段階で消費し、その後のcontinueで人形をpartyへ預かってアネとshoreへ浮上する。工房への実到着でdollAtはworkshopへ移る。空気補給だけの往復では人形をentryに残す。物語改訂1・保存内容・同行と受渡しを維持し、新しい保存移行は不要。",
    "stone_reportを窓口まで魔石を持ち帰った段階の本文へ直し、実際の受渡しは既存のfinishで確定する。旧保存で待機中の本文は保持し、再開後の新たな場面実行から現行本文を使う。報酬・解決方法・結末は変更しない。人形の停止・破損は専用状態がなく、履歴と結末に応じた差分は今後の制作候補。",
    "既存4地点は水底の食堂e2_sunken_inn(11,5)、地上の足場(1,1)、pilgrim_workshop、pilgrim_union。空気補充の足場・人形工房・魔石窓口の局所背景と、鍋の湯気・皿・乾いた幻の食材・浮力具・縄・祖母の椅子は未制作。新しい町・新しい宿のマップ・椅子回収の独立場面は追加しない。"
  ],
  "relatedClients": {},
  "people": {
    "q135_ane": {
      "label": "潜水具職人アネ",
      "status": "connected",
      "need": "専用画と7場面の表示を接続済み。浮上・工房・補給往復は既存同行を使い、魔石だけの経路は食堂へ残す。",
      "entity": "ane"
    },
    "q135_doll": {
      "label": "給仕人形",
      "status": "connected",
      "need": "itemと保持者を維持し、専用画を6場面へ接続済み。補給だけのrefillへ表示しない。作業・停止・浮力具・運搬・破損の差分は制作候補。",
      "entity": "doll"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q135_ane",
        "q135_doll"
      ],
      "evidence": "給仕人形はパンを出し、湯を注ぎ、返事を待つ。",
      "reason": "人形の動作が明記され、アネは既存所在と移設準備の相手として同席する。アネの同席は本文の台詞追加ではない。",
      "visual": "沈んだ食堂、同じ位置の皿、鍋の湯気、三作業を反復する給仕人形。"
    },
    "reply": {
      "decision": "person-evidence",
      "people": [
        "q135_ane",
        "q135_doll"
      ],
      "evidence": "最後の客は洪水で避難し、返事を残さなかった。",
      "reason": "人形の呼びかけがあり、アネは食堂に留まる。過去の客と祖母を現在の出演者へ追加しない。",
      "visual": "返事待ちの人形、乾いた幻のパンと湯、応答による停止前の差分。"
    },
    "surfaced": {
      "decision": "person-evidence",
      "people": [
        "q135_ane",
        "q135_doll"
      ],
      "evidence": "人形とアネが地上の足場へ上がった。",
      "reason": "二者の浮上が明記される。アネはshore、人形はpartyが保持し、工房への引渡し前。",
      "visual": "地上の足場、補充する空気、運搬用の浮力具と縄、人形の運搬中差分。"
    },
    "retrained": {
      "decision": "person-evidence",
      "people": [
        "q135_ane",
        "q135_doll"
      ],
      "evidence": "工房へ人形を据え、新しい宿の仕事を一つずつ教えた。",
      "reason": "人形は工房へ受渡し済みで、アネも同行済み。場所と作業の本文へ整理し、未確定の第三者は増やさない。",
      "visual": "工房の作業場所、据えた人形、三作業に新しい動きを加える差分。"
    },
    "stone_report": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "組合の受取窓口まで魔石を持ち帰った。",
      "reason": "アネは食堂に残り、窓口担当者は未定義。本文を持参時点へ整理し、魔石はfinishまでpartyが保持する。",
      "visual": "組合の魔石窓口、隊が所持している段階と引渡し後の差分。"
    },
    "refill": {
      "decision": "person-evidence",
      "people": [
        "q135_ane"
      ],
      "evidence": "地上の足場で息を整えた。",
      "reason": "reply_backでアネが同行し、refill_diveでも一緒に潜り直す。人形は食堂に残る。",
      "visual": "地上の空気補充、再潜水の準備。運び上げた人形の差分とは分ける。"
    },
    "entry_lift_ready": {
      "decision": "person-evidence",
      "people": [
        "q135_ane",
        "q135_doll"
      ],
      "evidence": "必要な道具を使って準備を整えた。",
      "reason": "entryから縄を消費した同じ食堂の準備後。アネと人形は食堂で、運搬開始前。",
      "visual": "縄と浮力具の準備済み差分。工房での受領済みにしない。"
    },
    "reply_lift_ready": {
      "decision": "person-evidence",
      "people": [
        "q135_ane",
        "q135_doll"
      ],
      "evidence": "必要な道具を使って準備を整えた。",
      "reason": "呼びかけを聞いた後の準備で、アネと人形は同じ食堂。応答して停止した経路とは異なる。",
      "visual": "返事待ちを保った浮力具と縄の準備。まだ浮上していない。"
    }
  },
  "next": "次はq136のトゥリと傭兵の表示・所在・同行の整理、扉と録音と守護者の描き分け。人物監査はq137。"
},
  q136:{
  "sourceSha256": "26462128b2de3efc242901aaf81943b27c6d716bf71586909641476a32d441f2",
  "identityNotes": [
    "依頼人は言語学者トゥリ。固定過去の調査と四結末での作業から、全8場面へ専用画と所在を接続した。録音台との往復と記録室・宿直室・破壊穴へ実同行する。個別物語改訂1→2で旧保存の到着履歴と旅程から所在を補う。隊だけが敗北救助や寄り道で場外へ移った時にトゥリを転送しない。",
    "入口の匿名の傭兵は供物を積む役。人数は未設定のまま、groupのエンティティmercenariesと呼称だけをentryへ接続した。一人とも複数人とも断定せず、個人画・代表者・同行・戦闘参加は追加しない。入口以外と勝利後の準備には表示しない。記録上の所在entryは最後に根拠のある地点であり、その後の同席を示さない。",
    "会話する扉は局所の装置。録音石の過去の番人、扉の発話、戦う封印守護者guard_4を同一人物へ統合せず、録音を現在の生身の人物として表示しない。守護者の戦闘画像は既存魔物素材を使用し、新しいNPC肖像の候補数へ加えない。",
    "名前はunspoken／real／aliasで保存され、実名と仮名の違いは来訪帳の記録。架空の実名を画像へ焼き込まない。研究・避難の許可、略奪の拒否と再申告、破壊穴の経路を区別し、破壊だけで来訪許可を得た絵にしない。",
    "既存5地点はregion_4_f2の扉(3,1)、辞書と録音石の台(5,3)、記録室(5,5)、宿直室(7,5)、別の入口(3,5)。新しい町や施設IDは不要。供物・辞書・録音石・来訪帳・封印・許可／拒否の扉・破壊穴・損傷記録・机・保存食・宿直室を局所背景と道具差分の候補にする。",
    "録音を調べず名乗る経路、実名／仮名、略奪を断られて再申告／辞退する経路、守護者戦の逃走・敗北・勝利後の準備と実歩行、四結末と報酬を保持する。現在は状態name以外に許可証・保存食・記録のitemはないため、既存の台詞や結末を新たな所持品と誤認しない。"
  ],
  "relatedClients": {},
  "people": {
    "q136_turi": {
      "label": "言語学者トゥリ",
      "status": "connected",
      "entity": "turi",
      "need": "専用画を全8場面へ接続済み。5旅程に実同行し、旧保存へ到着履歴・旅程から所在だけを追加する。辞書・論文・保存食は局所素材として残る。"
    },
    "q136_mercenary": {
      "label": "入口で供物を積む傭兵",
      "status": "connected",
      "entity": "mercenaries",
      "need": "人数未確定の役を呼称だけでentryへ接続済み。人数・代表者・単独画・入口以外への同行は追加しない。供物は別の素材候補。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q136_turi",
        "q136_mercenary"
      ],
      "evidence": "扉は来訪者へ同じ文を繰り返す。",
      "reason": "固定過去でトゥリは扉を調査し、傭兵は供物を積む。傭兵は入口の呼称だけで表示する。",
      "visual": "挨拶を繰り返す扉、供物、辞書の挨拶欄。"
    },
    "record": {
      "decision": "person-evidence",
      "people": [
        "q136_turi"
      ],
      "evidence": "番人が「お名前は？」と聞き返していた。",
      "reason": "録音を聞く場面であり、声の番人を現在の出演者へ追加しない。トゥリの調査経路として同行を接続済み。",
      "visual": "辞書、録音石、聞き返しを再生する状態。"
    },
    "purpose": {
      "decision": "person-evidence",
      "people": [
        "q136_turi"
      ],
      "evidence": "「ご用件は？」扉は次の返事を待つ。",
      "reason": "名乗りを記録した後の用件申告。トゥリの調査は続くが、傭兵の同席継続は明記されない。",
      "visual": "実名／仮名の来訪帳、用件待ちの扉。"
    },
    "refused": {
      "decision": "person-evidence",
      "people": [
        "q136_turi"
      ],
      "evidence": "「その用途では許可できません」扉は理由を告げた。",
      "reason": "拒否は略奪目的への回答。トゥリは辞退結末で別れの挨拶を訳して返し、再申告にもつながる。",
      "visual": "用途の拒否、再申告と辞退の選択。"
    },
    "study": {
      "decision": "person-evidence",
      "people": [
        "q136_turi"
      ],
      "evidence": "扉の案内どおり記録室まで来た。",
      "reason": "研究結末ではトゥリが論文に挨拶を書く。記録室までの同行と同席を接続済み。",
      "visual": "記録室の机、運んだ記録、論文の冒頭。"
    },
    "shelter": {
      "decision": "person-evidence",
      "people": [
        "q136_turi"
      ],
      "evidence": "案内された宿直室へ着き、保存食を受け取った。",
      "reason": "避難結末でトゥリが保存食を受け取り礼を言う。宿直室の同行済みであり、渡し手は未特定。",
      "visual": "宿直室、寝具と保存食、避難用途の許可。"
    },
    "breached": {
      "decision": "person-evidence",
      "people": [
        "q136_turi"
      ],
      "evidence": "来訪帳の許可欄は空白のままにし、損傷を記録する。",
      "reason": "結末で研究者が損傷記録を担う。トゥリの同行済み。守護者を退けても許可済みにしない。",
      "visual": "破壊穴、空白の許可欄、損傷記録。"
    },
    "entry_break_ready": {
      "decision": "person-evidence",
      "people": [
        "q136_turi"
      ],
      "evidence": "戦いに勝利し、先へ進む道が開いた。",
      "reason": "戦闘勝利後も入口で出発待ち。破壊経路の記録を担うトゥリは同行済みだが、別の穴へ到着済みにはしない。",
      "visual": "守護者戦後の入口、これから通る破壊穴。"
    }
  },
  "next": "q136の人物表示・実同行は接続済み。扉・供物・辞書・録音石・来訪帳・記録室・宿直室・破壊穴の局所差分は残る。次はq137の人物の所在・同席・表示形式を整理し、人物監査はq138。"
},
  q137:{
  "sourceSha256": "0fcc7165be8e06ddefb1736f57290e461731fb1c3dadce52ed1339b3e1ffccfd",
  "identityNotes": [
    "写本師エル・消防係・館長の三役が固定過去に登場する。entryの館長への言及と各人の現在の目標から、選書棚での表示を採用した。エルと館長は専用画、消防係は人数未確定の呼称表示。消防係のgroupは表示方式であり複数人と断定するものではない。",
    "q082の商人のエルとは役職が異なり、名前だけで同一人物へ統合しない。館長の過去の避難順の誤りを、現在の負傷者や生存者の人数へ変換しない。",
    "closedの館長は結末で閉扉音を聞き休止を受け入れるため表示する。直接封鎖と本を戻してからの封鎖では、三役ともentry→transit→exitへ退避する。closedでエル・消防係は表示しない。他の旅程では同行させず、read・受入室・組合・replace_bookにも配置しない。entryに残る状態は最後に根拠がある所在で、画面外の継続同席を主張しない。",
    "三冊はmedicine・family・languageの別item。bookとpages、各本の読解履歴を保持し、3段階を読み終えた一冊だけを冷えた状態として示す。読み終えた児童書は手掛かりで、三冊の回収対象とは別。記憶魔法の火を時間制限や通常の燃料・攻撃へ置き換えない。",
    "既存5地点はe2_burnt_libraryの選書棚(3,1)・読む机(7,3)・封鎖口(1,1)、pilgrim_archiveの受入室、pilgrim_unionの増援相談。新しい町や避難施設は不要。読書進捗による机の差分と、持参・預託・申請・封鎖の段階を分ける。",
    "携行経路は受入室到着後のfinishで本を渡す。増援準備経路は受入室到着で一冊を預け、組合到着後に申請する。途中封鎖は本を棚へ戻してから封鎖口へ移る。残る本を回収済みにせず、未読段階の持出不可・三冊の読み分け・5結末と報酬を保持する。"
  ],
  "relatedClients": {
    "q082": "商人のエル"
  },
  "people": {
    "q137_el": {
      "label": "写本師エル",
      "status": "connected",
      "need": "専用画をentryだけに接続。読む机・受入室へ同行しない。",
      "entity": "el"
    },
    "q137_firefighter": {
      "label": "封鎖を望む消防係",
      "status": "connected",
      "need": "人数未確定の呼称だけをentryへ接続。個人画・人数を追加しない。",
      "entity": "firefighter"
    },
    "q137_librarian": {
      "label": "燃え残る図書館の館長",
      "status": "connected",
      "need": "専用画をentryとclosedへ接続。封鎖の2旅程で三役の退避を実施。",
      "entity": "librarian"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q137_el",
        "q137_firefighter",
        "q137_librarian"
      ],
      "evidence": "館長が何冊も開いたままにしたため、未完の読書の火が続いていた。",
      "reason": "固定過去に三役の現在の目標がある。選書棚での対立を表示する編集判断を含む。別の場面への自動的な継続出演は採用しない。",
      "visual": "冷たい児童書、焦げた棚、開いた複数冊と続く火、三冊の選択。"
    },
    "read": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "他の本を開かず、この一冊の続きを読む。",
      "reason": "探索隊の読書行為が本文。エルの代読や館長の立会いは書かれておらず、人物の継続同席は保留する。",
      "visual": "選んだ本、三段階の進捗、燃える状態と読了して冷えた状態。"
    },
    "carry_medicine": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "冷たくなった一冊を受入室へ届けた。",
      "reason": "薬学書の持参であり、受取担当者やエルの同席は未特定。finishでの受渡し前。",
      "visual": "薬学書の持参と受領後。残る家族記録・言語書を救出済みにしない。"
    },
    "carry_family": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "冷たくなった一冊を受入室へ届けた。",
      "reason": "家族の記録を持参した段階。受取担当者や記録にある家族を現在のNPCへ増やさない。",
      "visual": "家族記録の冷えた本、持参と受領後。名や家系を絵へ創作しない。"
    },
    "carry_language": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "冷たくなった一冊を受入室へ届けた。",
      "reason": "言語書の持参。話者や受取担当者の同席はなく、トゥリも名前の連想で追加しない。",
      "visual": "言語書の冷えた本、持参と受領後。未設定の文字や言語名は固定しない。"
    },
    "prepare_book": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "読了した一冊を受入室へ預けた。",
      "reason": "一冊を預けた記録であり、預かった人物は未特定。増援が合流した場面にはしない。",
      "visual": "預託済みの一冊、残る二冊、追加人員と道具の申請前。"
    },
    "requested": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "次の救出に必要な人員と道具を申請した。",
      "reason": "組合への申請のみ。担当者や応援班を新しい人物として増やさない。",
      "visual": "申請書と準備待ち、未救出の蔵書。全冊救出の完了印は付けない。"
    },
    "replace_book": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "読んでいた本を閉じて棚へ戻した。",
      "reason": "本の返却作業で、entryと同じ棚というだけで三役の同席を確定しない。",
      "visual": "読解途中または読了した本を閉じて棚へ返した状態、退避の動線。"
    },
    "closed": {
      "decision": "person-evidence",
      "people": [
        "q137_librarian"
      ],
      "evidence": "全員が外へ出たことを確かめ、火の区画を閉じた。",
      "reason": "結末で館長が閉扉音を聞いて休止を受け入れる。三役とも封鎖口へ退避するが、この場面の表示は館長だけ。新しい人数や役は追加しない。",
      "visual": "閉じた封鎖口、区画内に残る本、未回収のまま保存する差分。"
    }
  },
  "next": "三役の表示・退避・旧保存移行は接続済み。専用の棚・読む机・封鎖口・受入室・申請窓口と本の状態差分は未制作。次はq138の二人の表示と既存同行を整理し、人物監査はq139。"
},
  q138:{
  "sourceSha256": "f6e9aee98c2e167bb7eb57d3b393a3eab78984869a4fce9be11f1b3fd668f840",
  "identityNotes": [
    "探検家ナルと弟子イラは別の二人。依頼人の探索組合を窓口係へ変換しない。本文の名と役職で識別し、他の人物へ名前だけで統合しない。",
    "イラはpupil・explored・mediated、ナルはcall・mediatedへ専用画で接続した。pupilのイラは実際に休息所にいる間だけ表示し、単独出発後に残さない。entryの地図と足跡は本人の同席根拠ではなく、reportedも特定の受取人を明記しない。共同探索の結末にあるナルの危険表示をexploredへの同席に拡張しない。",
    "現行ira・narlはperson、mapはitem。同行経路はイラと先へ進むpupil_together、ナルと戻るcall_escortだけ。ナルを呼ぶ往路ではイラは休息所に残る。同行拒否のsoloではイラへ地図を渡し、イラだけが先へ進む。隊の強制同行や和解を追加しない。",
    "地図を追うentry_mapだけが到着時にmapの履歴を記録し、足跡経路とは区別する。仲介後のfinishでイラへ、訂正報告後のfinishで組合へ地図を渡す。先へ同行する場合は功績の分担への合意を先に行う。",
    "保護の意図は探索権を奪った事実を取り消さない。礼と抗議を別々に聞き、訂正だけの帰還を救出・和解・未踏区画すべての確認へ読み替えない。4結末の93G・69EXP、戦闘なしを保持する。",
    "既存4地点はe2_sand_galleryの地図と足跡(5,1)、休息所(3,7)、先の調査地点(13,7)、pilgrim_union。新しい町は不要で、地図の虚偽・危険度・退路、共同探索と単独探索、手渡しの前後を局所差分へ分ける。",
    "mediatedの本文はイラへ渡す訂正図を確かめる描写へ整理し、finishでpartyからiraへ渡す既存の時点に合わせた。物語改訂1と保存内容は維持し、旧保存の待機本文は旧文のまま再開する。現場接続前の旧受注経路には人物状態やcastを追加しない。"
  ],
  "people": {
    "q138_ira": {
      "label": "弟子イラ",
      "status": "connected",
      "need": "専用画をpupil・explored・mediatedへ接続。pupilはiraAtがpupilの間だけ表示し、単独出発後の完了保存に姿を残さない。",
      "entity": "ira"
    },
    "q138_narl": {
      "label": "探検家ナル",
      "status": "connected",
      "need": "専用画をcall・mediatedへ接続。組合から休息所へ戻る既存の実同行を使う。",
      "entity": "narl"
    }
  },
  "scenes": {
    "entry": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "弟子イラの足跡は、まさにその先へ続く。",
      "reason": "地図と足跡の観察で、ナルもイラも現在の同席は書かれていない。",
      "visual": "行き止まりと記された地図、先へ続く足跡、詳細な休息地点。"
    },
    "pupil": {
      "decision": "person-evidence",
      "people": [
        "q138_ira"
      ],
      "evidence": "イラは休息所で見つかった。",
      "reason": "イラ本人を発見する。師が過去に準備した退路の説明からナルの同席を追加しない。単独出発後の完了状態ではイラも表示しない。",
      "visual": "休息所、退路情報、功績の分担への合意と同行拒否の選択。"
    },
    "explored": {
      "decision": "person-evidence",
      "people": [
        "q138_ira"
      ],
      "evidence": "イラと休息所の先を調べた。",
      "reason": "合意後にイラと共同探索する。ナルは別の場所にいるので描かない。",
      "visual": "共同探索と功績の分担、危険度を区別した訂正図。"
    },
    "call": {
      "decision": "person-evidence",
      "people": [
        "q138_narl"
      ],
      "evidence": "組合でナルへイラの居場所と意向を伝えた。",
      "reason": "組合でナル本人に伝え、次の移動で休息所へ同行する。イラはその場にいない。",
      "visual": "組合での説明、帰路と休息所の位置、返答を聞く準備。"
    },
    "mediated": {
      "decision": "person-evidence",
      "people": [
        "q138_ira",
        "q138_narl"
      ],
      "evidence": "二人が同じ休息所で話した。",
      "reason": "実際の帰着後に二人が会う。礼と抗議を別々に扱い、強制和解や新しい関係を断定しない。",
      "visual": "二人の対話、渡す訂正図の確認とfinishでの手渡し。"
    },
    "reported": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "確認できた範囲だけを報告した。",
      "reason": "組合の受取人は特定されていない。ナルの所在が組合というだけで出演させず、イラの帰還も追加しない。",
      "visual": "訂正図の持参と受領、確認済み範囲と未確認範囲。"
    }
  },
  "next": "イラ・ナルの人物画と既存の所在・同行への接続、単独出発後の表示条件、本文の受渡し時点は整理済み。地図・足跡・退路・休息所・共同と単独の探索・組合報告の差分は未制作。次はq139の5役の表示・条件付き同行、人物監査はq140。"
},
  q139:{
  "sourceSha256": "a20a4f64fec03314b3ca9462b51baaf43406540b79610838ae24a89394bcf1d5",
  "identityNotes": [
    "救助責任者セナと匿名の地質師はentryで直接発言する二役。篝火q202の訓練を担当するセナとは名前だけで同一人物へ統合しない。具体的な年齢・性別・人数・負傷の程度は新設しない。",
    "既存crowd・injured・helpersは三つのgroup。声の多い側の生存者、声を出せない負傷者、詰所から同行する応援班を区別し、群衆を一人の代表画へ置換しない。三群の人数や構成は未設定で、呼称表示を第一候補とする。",
    "listenは壁を通した声と振動の観察で、声の発生源を個人の立ち絵として見せない。反響があることと二組の生存者が実在することを同時に保つ。少ない声を無人、反響を偽の救難と断定しない。",
    "セナと地質師の全経路同行は明記されない。wounded結末ではセナが道具を回すが、それはfinish後の描写であり、wounded_homeの到着直後へ自動配置しない。詰所の受入班と同行するhelpersを同一の構成員だと決めず、新しい窓口係も増やさない。",
    "helpersはrequest_helpで呼び、returnから同行する。collect_injured_help・collect_crowd_helpへ接続し、共用both_homeでは応援経路の到着履歴を表示条件にする。初期所在がrescueというだけで自力の縄経路のboth_homeへ表示しない。単なる所在判定では区別できない。",
    "排水と送気はpump・airの別地点への実到着で確定する。縄二つの経路は準備場面で一回消費し、無料の応援経路も保持する。掘り出した段階と詰所へ到着した救出確定を分け、injuredRescued・crowdRescuedを早めない。",
    "既存6地点はe2_rescue_tunnelの分岐(1,1)、声の多い室(11,3)、負傷者の室(11,7)、排水口(3,5)、送気口(7,5)、pilgrim_rescueの救助詰所。新しい町は不要。二室・排水・送気・資材準備・応援到着・引継ぎを個別の状態差分にする。",
    "結末many・wounded・bothは各93G・69EXP。片側だけの救出は残室の救援を継続する結末として保ち、放棄や死亡を追加しない。救難笛の描写は小物候補で、所持品や消費アイテムへ自動変換しない。"
  ],
  "people": {
    "q139_sena": {
      "label": "救助責任者セナ",
      "status": "connected",
      "need": "entryだけへ専用画と所在を接続済み。全経路同行を追加せず、旧保存にはentryの所在だけを補う。",
      "entity": "sena"
    },
    "q139_geologist": {
      "label": "坑道の地質師",
      "status": "connected",
      "need": "entryだけへ専用画と所在を接続済み。全経路同行を追加せず、旧保存にはentryの所在だけを補う。",
      "entity": "geologist"
    },
    "q139_crowd": {
      "label": "声の多い側の生存者",
      "status": "connected",
      "need": "既存groupの所在と同行を保ち、発見・掘り出し後・地上到着の該当場面へ呼称を接続済み。",
      "entity": "crowd"
    },
    "q139_injured": {
      "label": "声を出せない負傷者",
      "status": "connected",
      "need": "既存groupの所在と同行を保ち、発見・掘り出し後・地上到着の該当場面へ呼称を接続済み。",
      "entity": "injured"
    },
    "q139_helpers": {
      "label": "同行する応援班",
      "status": "connected",
      "need": "既存helpersへ呼称を接続済み。応援経路だけで実同行し、both_homeではcollect_crowd_help_escortの到着履歴を条件にする。",
      "entity": "helpers"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q139_sena",
        "q139_geologist"
      ],
      "evidence": "声の多い側をセナは指す。地質師は反対側の水位が低いと言う。",
      "reason": "セナと地質師がその場で判断を述べる。地下の生存者はまだ見えていない。",
      "visual": "分岐、崩落、二方向の声、水位の違い、壁へ当てる器。"
    },
    "rooms": {
      "decision": "person-evidence",
      "people": [
        "q139_injured"
      ],
      "evidence": "静かな側には声を出せない負傷者がいた。",
      "reason": "負傷者の室で本人たちを発見する。別室の群やセナ・地質師の同席は追加しない。",
      "visual": "負傷者の支援、二室の位置と音の違い、排水と送気の準備判断。"
    },
    "air": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "空気は通った。",
      "reason": "送気の状態と救助方法の判断。応援班はまだ呼んでおらず、生存者も別室にいる。",
      "visual": "送気口、両室への通気、縄二つと無料応援の選択。"
    },
    "listen": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "声の多い側の振動を測った。",
      "reason": "壁越しの測定であり、まだ掘り出していない生存者の顔や身体を見せる根拠にはしない。",
      "visual": "器と壁の接触、声と振動、反響と発生源の区別。"
    },
    "many_ready": {
      "decision": "person-evidence",
      "people": [
        "q139_crowd"
      ],
      "evidence": "多い側の組を掘り出した。",
      "reason": "掘り出した群はこの室にいる。まだ地上への到着・救出完了ではない。",
      "visual": "開いた崩落部、連絡を保つ退路、地上への出発準備。"
    },
    "many_home": {
      "decision": "person-evidence",
      "people": [
        "q139_crowd"
      ],
      "evidence": "多い側の組が詰所へ着いた。",
      "reason": "到着した群を示す。残る室の負傷者・呼んでいない応援班は加えない。",
      "visual": "多い側の帰還、残室への救援継続の記録。"
    },
    "wounded_home": {
      "decision": "person-evidence",
      "people": [
        "q139_injured"
      ],
      "evidence": "負傷者を詰所の班へ引き渡した。",
      "reason": "帰還した負傷者を表示候補とする。受入班の構成やfinish後のセナの所在を到着直後へ固定しない。",
      "visual": "支援と引継ぎ、救難笛、もう一室へ回す道具。"
    },
    "drain": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "排水口へ着き、水の流れを外へ逃がした。",
      "reason": "排水作業のみ。地質師の自動同行や別室の生存者を加えない。",
      "visual": "排水口と水流、排水前後、別地点にある送気口。"
    },
    "request_help": {
      "decision": "person-evidence",
      "people": [
        "q139_helpers"
      ],
      "evidence": "詰所へ応援を求めた。",
      "reason": "次のreturnが応援班との同行を明記するため、出発前に応じる班の呼称を候補とする編集判断を含む。受入班全員との同一性は確定しない。",
      "visual": "応援要請、送気を維持する引継ぎ、未救出の二室。"
    },
    "collect_injured": {
      "decision": "person-evidence",
      "people": [
        "q139_injured"
      ],
      "evidence": "負傷者を支えられる状態にし、もう一室へ向かう。",
      "reason": "自力の縄経路で負傷者を支える。まだ応援班は同行していない。",
      "visual": "縄と支持、もう一室へ運ぶ準備、救出未確定。"
    },
    "collect_crowd": {
      "decision": "person-evidence",
      "people": [
        "q139_injured",
        "q139_crowd"
      ],
      "evidence": "二室の生存者が揃った。",
      "reason": "負傷者を連れて多い側へ実到着し、二群が揃う。地上への救出完了はまだ。",
      "visual": "二群の合流、出口への動線、地上到着待ち。"
    },
    "collect_injured_help": {
      "decision": "person-evidence",
      "people": [
        "q139_injured",
        "q139_helpers"
      ],
      "evidence": "負傷者を支えられる状態にし、もう一室へ向かう。",
      "reason": "returnで同行してきた応援班が負傷者の室にいる。班をその場へ瞬間移動させず、実旅程で合わせる。",
      "visual": "応援班による支持と役割の引継ぎ、次室への出発。"
    },
    "collect_crowd_help": {
      "decision": "person-evidence",
      "people": [
        "q139_injured",
        "q139_crowd",
        "q139_helpers"
      ],
      "evidence": "二室の生存者が揃った。",
      "reason": "負傷者と応援班の同行で二群が合流する。三群を個別の呼称で区別する。",
      "visual": "二室の生存者と応援班、地上へ運ぶ隊列。"
    },
    "both_home": {
      "decision": "person-evidence",
      "people": [
        "q139_injured",
        "q139_crowd",
        "q139_helpers"
      ],
      "evidence": "二室の生存者が地上の詰所へ着いた。",
      "reason": "二群は両経路で到着する。helpersは応援経路の到着履歴がある場合だけ表示候補。自力経路では同じ詰所という理由だけで表示しない。",
      "visual": "二室の帰還、支援の引継ぎ、応援同行の有無による差分、救難笛。"
    },
    "air_tools_ready": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "必要な道具を使って準備を整えた。",
      "reason": "縄二つを支払った送気口での準備。二群はまだ別室、応援班も呼んでいない。",
      "visual": "消費済みの縄二つ、準備完了と出発待ち、繰返し課金しない状態。"
    }
  },
  "next": "二人の専用画・三群の呼称・応援帰還だけの条件・旧保存移行は接続済み。器・反響・崩落・水位・排水・送気・縄・笛・二室と詰所の差分は未制作。次はq140の人物表示と所在、人物監査は沈没城q061。"
},
  q140:{
  "sourceSha256": "d10f6ed51a862e84ffd5f051c79d717f630c690a31140899fa58aaf630765259",
  "identityNotes": [
    "隊長ボロはtalkで入域条件を直接述べる人物。maintenanceに専用personと所在・専用画を接続した。entryの状況説明だけから同席を決めず、組合へ同行させない。",
    "倒れた整備員は既存personのworker。accidentで支えて運び、accident_carryの実到着でmaintenanceへ移る。talkの表示はworkerAtとhelpedの両方で制限し、直接交渉では現場に残る。",
    "事故の整備員と整備隊全員を同一視せず、人数・氏名・負傷の程度・年齢・性別を追加しない。協定結末で部下へ帰れと告げる描写はfinish後で、組合の到着場面へボロや部下を自動配置しない。",
    "既存5地点はe2_chapel_worksの入口(1,1)、庫(11,3)、事故現場(3,7)、整備区画(11,7)、pilgrim_union。入口の当番表・休業札と止まった罠、事故前後、直接交渉と救助後、持出品・申告・閉鎖提案を差分として分ける。新しい町は不要。",
    "goodsはtake_leaveの出発時にpartyへ移る。takeの本文を持ち出す品を確かめる描写へ訂正した。旧保存の待機本文は保持する。略取の帰着を入域許可とせず、協定経路で持出品を創作しない。helped・declaredと四結末の93G・69EXPを保持する。"
  ],
  "people": {
    "q140_boro": {
      "label": "整備隊長ボロ",
      "status": "connected",
      "entity": "boro",
      "need": "maintenanceに専用画・所在を接続し、talkだけに表示する。"
    },
    "q140_worker": {
      "label": "事故に遭った整備員",
      "status": "connected",
      "entity": "worker",
      "need": "既存workerへ専用画を接続。accidentと救助到着後だけのtalkへ表示する。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "罠の横の札は呪文でなく当番表だった。",
      "reason": "当番表と背景事情の説明。ボロの同席は確定しない。",
      "visual": "入口の当番表、休業札、稼働を止めた罠。"
    },
    "talk": {
      "decision": "person-evidence",
      "people": [
        "q140_boro",
        "q140_worker"
      ],
      "evidence": "持出品を申告し、入域日を限る協定なら検討すると言った。",
      "reason": "ボロが直接述べる。workerはhelpedかつworkerAtがmaintenanceの時だけ表示し、直接交渉と区別する。",
      "visual": "入域条件、直接交渉と事故救助後、整備区画。"
    },
    "take": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "止まった罠の先の庫へ着いた。",
      "reason": "庫の品と帰路の場面。守衛や整備員の同席は追加しない。",
      "visual": "庫、持出前後、品の保持者と出発時の対応。"
    },
    "looted": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "入域の許可を得たことにはしない。",
      "reason": "持出品の帰着。特定の受付係を創作しない。",
      "visual": "持出品と調査記録、無許可のままの帰着。"
    },
    "accident": {
      "decision": "person-evidence",
      "people": [
        "q140_worker"
      ],
      "evidence": "倒れた整備員を作業場所から引き出した。",
      "reason": "本人を支え、隊長の区画へ運ぶ直前。ボロはここにいるとは書かれていない。",
      "visual": "作業場の事故、救助と運搬の準備。"
    },
    "declared": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "持出品がない今回の記録も記した。",
      "reason": "協定の提出で、ボロや整備員が組合へ同行する根拠はない。",
      "visual": "協定、持出申告、入域日と休業日。"
    },
    "closed": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "修理期間の閉鎖を組合へ提案し、受理されたことを確かめた。",
      "reason": "提案受理の記録。窓口の担当者は未指定。",
      "visual": "閉鎖提案と受理の記録、修理期間。"
    },
    "left": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "調査した範囲だけを引き継いだ。",
      "reason": "交渉を残した帰着。特定の人物を自動配置しない。",
      "visual": "調査報告、未成立の入域権、交渉への引継ぎ。"
    }
  },
  "next": "二役の専用画・所在に従う表示と旧保存移行、持出品の本文と出発時点の整合は接続済み。既存5地点の札・当番表・事故・持出品・協定・申告の局所差分は未制作。次はq061の救難図の受取先表示、人物監査はq062。"
},
  q061:{
  "sourceSha256": "623e3ea9274ffa8aa8316523371f450ba32d3c6843d8e3adf5402183e1a349e9",
  "identityNotes": [
    "依頼人は航海士のナギだが、現場の本文には同席がなく、名が出るのは結末。篝火q206のナギとは同定せず、依頼人欄だけで現場へ追加しない。",
    "entryの救難隊の問いは依頼の経緯としても読める。沈没城での同席や探索への同行は確定せず、二つの空気室にも人物を補わない。",
    "rescue_reportはroyal_rescueで救難隊へ図を渡した場面。受取側を集団名だけで表示し、人数・代表者・個人画やナギとの同一性を追加しない。港の受取人は本文で特定されていない。",
    "既存5地点はregion_7_f1の発見地点(9,11)、第一空気室(9,5)、第二空気室(15,3)、royal_rescue、royal_harbor。新しい町を作らず、乾いた線・空気溜まり・二室の確認前後・救難用と海上用の記載を局所差分にする。",
    "図はentry出発時に隊が持ち、救難隊・港への実到着で渡す。tested=1の二室確認が救難図の引継ぎ条件で、第一室のみでは不可。手元に残す経路と異なる三結末の報酬を維持する。"
  ],
  "people": {
    "q061_rescuers": {
      "label": "救難図を受け取る救難隊",
      "status": "connected",
      "need": "rescue_reportだけに集団名を接続済み。物語改訂1→2で旧保存へrescueの所在だけを補い、二室確認・実到着の受渡し・旧受注経路を保持する。個人画・人数・代表者・城内同行は追加しない。",
      "entity": "rescuers"
    }
  },
  "scenes": {
    "entry": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "救難隊はこの図を外洋でも使えるか尋ねた。",
      "reason": "依頼の経緯としての質問で、発見地点での同席や同行は確定しない。",
      "visual": "濡れない線と沈没城の上部、図を得る前後。"
    },
    "air": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "最初の線の終点には空気が残り、息継ぎができた。",
      "reason": "隊が空気室を確かめる描写。ナギや救難隊の同行を追加しない。",
      "visual": "第一空気室、息継ぎと未検証の次の線。"
    },
    "second_air": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "次の線は水面と逆向きに上がり、別の空気室へ着いた。",
      "reason": "第二室の検証で、現場の相手の発言や動作はない。",
      "visual": "第二空気室、海面の方角との不一致と二室の検証記録。"
    },
    "rescue_report": {
      "decision": "person-evidence",
      "people": [
        "q061_rescuers"
      ],
      "evidence": "救難隊へ実際に歩いた二室の図を渡した。",
      "reason": "royal_rescueで図を受け取る救難隊の根拠。個人や人数は確定しない。",
      "visual": "引き渡した図、城内専用の欄外注記、二室の記録。"
    },
    "sea_report": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "港で海面の航路として図を渡した。",
      "reason": "受取人の呼称・同一性が未指定。ナギや救難隊を自動配置しない。",
      "visual": "港へ渡した図、空気室の未検証と海上航路としての誤用。"
    }
  },
  "next": "救難図の受取先表示と旧保存移行は接続済み。既存5地点の乾いた線・二室の確認・救難用と海上用の図の差分は未制作。次はq062の遺族の集団名、人物監査はq063。"
},
  q062:{
  "sourceSha256": "135970b23c7326f7281f2bf60f9b865ab91c418af296e993f467b210134e2238",
  "identityNotes": [
    "依頼人は潜水士のナオだが、現場の本文には本人の発言・動作がない。依頼人欄だけで同席や同行を追加しない。",
    "entryでは遺族が外布を広げて浮きを子供へ切り分けたと話し、testimonyでは遺族へ外布を渡して公開範囲を相談する。既存group heirsの所在と同行を用い、人数・氏名・代表者・顔を新設せず集団名を表示する候補とする。",
    "遺族はheirs経路だけでentryからwitnessへ実同行する。names・treasureではentryに残り、展示室へ自動配置しない。王と子供たちは過去の話で、contract結末の救われた老人もfinish前の展示場面へ先行追加しない。",
    "既存3地点はregion_7_f1の発見地点(11,9)、royal_exhibit、royal_witness。新しい町を作らず、外布の切断跡・幼児用の浮き・救助名簿・同時展示と外布だけの展示・公開前の証言を局所差分にする。",
    "外布と名簿はnames出発時に隊が持ち、展示室到着で共に渡す。heirsでは外布だけを持ち出し、証言室到着でheirsへ渡す。treasureでは外布だけを展示室へ渡し、名簿はentryに残る。三結末の不均等な報酬と、王の別の失政を帳消しにしない結末を維持する。"
  ],
  "people": {
    "q062_heirs": {
      "label": "外布を広げて証言する遺族",
      "status": "candidate",
      "need": "entry・testimonyの既存group heirsへ集団名だけを接続する候補。既存のheirs経路だけの同行と到着時の外布受渡しを保持し、展示室への同行・代表者・人数・個人画は追加しない。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "person-evidence",
      "people": [
        "q062_heirs"
      ],
      "evidence": "救助名簿の横で、遺族が豪華な外布を広げた。",
      "reason": "遺族本人の動作と発言がある。既存heirsの所在を使い、ナオや過去の王・子供を同席させない。",
      "visual": "外布の切断跡、救助名簿、小さな救命具との対応。"
    },
    "names_shown": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "外布と救助名簿を同じ展示台へ置いた。",
      "reason": "二資料を並べた場面で、遺族はentryに残る。展示の担当者や見学者は特定されていない。",
      "visual": "外布と名簿の同時展示、浮きの用途を示す対応。"
    },
    "testimony": {
      "decision": "person-evidence",
      "people": [
        "q062_heirs"
      ],
      "evidence": "証言室で遺族へ外布を引き渡し、公開の範囲を相談した。",
      "reason": "遺族へ実到着で布を渡し、公開前の相談をする。人数や代表者を確定しない。",
      "visual": "引き渡した外布、公開前の証言、名簿の未公開。"
    },
    "treasure_shown": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "豪華な外布だけを展示室へ納めた。",
      "reason": "外布だけを納める場面。結末の救われた老人を先行表示せず、遺族も移動させない。",
      "visual": "外布だけの展示、持ち込まれていない名簿、用途を欠く展示札。"
    }
  },
  "next": "遺族のentry・testimonyを集団名で接続し、既存の同行・外布と名簿の保持者・旧保存・三結末を検証する。人物監査はq063。"
}
 }
};
