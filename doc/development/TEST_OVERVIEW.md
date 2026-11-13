# CI・自動テスト総覧

2026-11-13追記：PR #239をmaster `6ffc841c64ec51f4849bb08e6a22a592fb382570`へ統合した。実装先端と検証記録更新後の各8ワークフロー、統合後検査run 43388982913、公開run 43388981701が成功した。公開版q049では別紙化→文書持帰り→帰還印20G→窓口到着→報告を操作し、ルウの表示、105G・100EXP、指定結末でクリアを確認した。0歩・戦闘0回、240G→325G。

q050「止まった終章」の原稿・初版4場面・現行11場面を出演監査へ登録し、司書・二冊を選ぶ読者・写本班の3役を3場面へ呼称表示した。司書は入口から初回の申請窓口へ独立して到着し、以後は窓口に留まる。読者は申請窓口、写本班は照合室に固定する。全12旅程の同行者は空のまま、記録係テオと時計守の同席・戦闘や専用画を追加しない。

物語改訂1→2では旧保存全体を旧定義で検証後、3役の所在だけを補う。司書の窓口到着は完了済み行動の履歴で判定する。全16行動・原本3種類と写本の保持者・知識・既存の旗・3結末・報酬を保持した。準備、別倉の受領、棚への原本返却、掲示の4本文は既存処理の確定時点へ合わせ、旧保存の待機本文は保持する。

専用11試験と出演監査7試験が成功した。現行／旧保存の全11場面・12旅程・16行動、先着箱の回収、原本と写本の所在、写本から延長への切替・撤回の2回反復、帰還印・敗北救助での途中再開、20経路の一回報酬、旧受注4場面・20直接経路、不正保存の原子的拒否を確認した。18試験成功・失敗0・スキップ0。現行／表示追加前各36点と旧受注4点の76保存点をScene／Classic × 1440／390pxの304画面条件で確認するCIを追加した。`npm run check` は2,869試験成功・失敗0・スキップ0。Salome CI run 43405899798のq050成果物（artifact 14026689752）は304 PNG・304画面検査・3結末、通信／実行エラー0・横あふれ0・Scene縦あふれ0・人物呼称の遮蔽0。ZIPのSHA-256を照合し、入口・申請窓口・照合室・受領棚・掲示・旧受注を含む8代表画面を目視した。PR #240で反映する。

標準Lv5・現場開始・seed 1907の通常移動と戦闘で2編成を完走した。基本4人は一箱目の追跡→延長申請→通常分の移送→掲示を247歩・7戦7勝、240G→465Gで指定結末をクリアした。全員Lv5・HP全快、アダMP16→9、ニオ22→18、イル45→9、予備灯油+1。探索・道具編成（ドーラ・ニオ・トーマ・ミカ）は写本→延長切替→撤回→再写本→閉架を412歩・11戦11勝、240G→503Gで完走した。全員Lv5、ドーラHP98→82・MP22→0、ニオMP22→10、トーマMP44→20、ミカMP45→41、静寂の胞子+2。両編成とも敗北・逃走・救助0。能力補正・乱数上書き・強制回復は使用していない。各1経路・同一seedの結果であり全編成の保証とは扱わない。

出演監査は70件・541場面（出演根拠あり397・同席根拠なし144）、残り30件・212場面。q171の妻は別途未接続候補1役。次工程はq141「音の出ない優勝旗」。参照原稿volume-05のGQ041・初版2場面・現行7場面・7旅程・10行動・3結末を精読済み。洗濯場に残るサナ、入口と本番の楽団、ポルの同席範囲を判定する。曲の使用・記名・出演の許諾を分け、旗と楽譜の携行・本番到着・finishでの受渡しを区別する。サナを舞台へ同行させず、全旅程の同行者は空のまま。監査登録と人物表示の実装は未着手。

2026-11-13追記：PR #236をmaster `cec567996c0e332f1886277161671f3b6fe0c8eb`へ統合した。実装先端と検証記録更新後の各8ワークフロー、統合後検査run 43381156157、公開run 43381155163が成功した。公開版q048は入口の校正者・原稿の依頼人を確認し、自動筆を壊す経路を操作して125G・75EXP、指定結末でクリアを確認した。0歩・戦闘0回、240G→365G。ニオをゲルハルトの信頼する仲間に据え、大水門開放・水没後にオッドランド侵攻が始まる設定文書更新を含むmaster `3f8ac06e477a24b9246f145d80bcee8cdf1856d8`を取り込んだ。

q049「忘却の栞」の原稿・初版・現行6場面を出演監査へ登録した。既存person luuを探検家ルウとして全6場面へ呼称表示する。全5旅程の実同行を使用し、同名の弟子戦士ルウなどへ統合しない。本文・物語改訂1・保存値・全5経路・3結末・報酬を保持し、窓口の特定担当者や忘却の番人との戦闘を補わない。

文書を残す3経路と、機密だけを封じた文書を持ち帰る経路を分ける。写し・文書の出発時の携行と窓口finishでの受渡しを保持し、到着だけで完了・報酬を確定しない。別紙化separateMapと壁の見取図の写しmapCopyは別の状態であり、栞の封印を実際の移動不能・技能や知識の全消去へ拡張しない。

専用10試験と出演監査7試験が成功した。全6場面・5旅程・10行動の新旧保存再開、3通りの写し経路、文書の携行、窓口到着と受渡し、帰還印・敗北救助での途中再開、全5経路の一回報酬、旧受注3場面・5直接経路、不正保存の原子的拒否を確認した。17試験成功・失敗0・スキップ0。現行／表示追加前の各10保存点と旧受注3保存点の23保存点を、Scene／Classic × 1440／390pxの92画面条件で確認するCIを追加した。`npm run check`は全2,858試験成功・失敗0・スキップ0で、生成物・データ・静的参照・文書検査も成功した。[Salome CI](https://github.com/TomTomYoung/adv/actions/runs/43386226637)で23保存点・92画面条件・3結末が成功し、エラー0・横方向のはみ出し0・人物表示の遮蔽0だった。証跡ZIP（artifact 14018338697）のSHA-256 `5a9aa40645decb492b446a0693af91c62f2be5889b5b8e88f6b4b68e27f126bc`とPNG92枚・結果JSONの一致を確認した。入口、封印範囲、別紙の試験、直接／別紙化後の壁の見取図、写し／文書を持った窓口帰着、旧受注の人物なしの代表8画面を目視した。ローカル環境のChromiumはsocket作成制限で起動できないため、画面検査はGitHub CIで実施した。実装と検証は[PR #239](https://github.com/TomTomYoung/adv/pull/239)へまとめた。

基本4人・標準Lv5・現場開始・seed 1907で、栞を一時外す→別紙化→文書を持ち帰る→窓口で受渡しの経路を通常の移動・戦闘処理で通した。93歩・2戦2勝・敗北0・逃走0・救助0、240G→390G（戦闘45G・依頼105G）、全員Lv5・HP全快で指定結末をクリアした。アダMP16→13・イルMP45→33、予備灯油+1。

探索・道具編成（ドーラ・ニオ・トーマ・ミカ）・標準Lv5・現場開始・seed 1907では、別紙化を試した後に文書を残し、壁の道順だけ写して持ち帰る経路を通常攻略した。105歩・2戦2勝・敗北0・逃走0・救助0、240G→353G（戦闘45G・依頼68G）、全員Lv5で指定結末をクリアした。ドーラHP98→90・MP22→13、ニオHP66→47、トーマHP70→62、ミカMP45→41、道具の増減なし。2編成・各1経路・同一seedの確認であり、全編成・全seedの保証ではない。

出演監査は69件・530場面（出演根拠あり394・同席根拠なし136）、残り31件・223場面。q171「足音を持ち帰る」の妻は別途未接続候補1役として残る。次工程はq050「止まった終章」。原稿・初版4場面・現行11場面・12旅程・16行動・3結末を精読済み。司書・未完の二冊を選ぶ読者・写本班の同席範囲を判定し、全旅程の同行者が空であることを保持する。先着した一箱目の回収、原本3種類と写本の所在、写本後に延長へ切り替える往復と延長撤回の反復、実到着・受領・掲示・finishの時点を区別する。記録係テオや時計守を現場へ補わない。監査登録と人物表示の実装は未着手。

2026-11-13追記：PR #235をmaster `2e9c4c3b9a8d07fb1d3643c889e57ecca4a5580c`へ統合した。実装先端と検証記録更新後の各8ワークフロー、統合後検査run 43375719010、公開run 43375718455が成功した。公開版q047は原本返却経路を操作し、依頼国の記録係の表示、帰還印20G、125G・75EXPと指定結末を確認した。0歩・戦闘0回、240G→345G。

q048「眠る校正者」の原稿・初版・現行7場面を出演監査へ登録した。校正者・原稿の依頼人・交代の校正者たちの3役を5場面へ呼称表示した。校正者は校正台に固定し、入口の発言だけに表示する。依頼人は入口・翌朝の写本室・契約窓口で応対し、隊の旅程には同行させない。交代者は既存teamの合流と実同行後だけに表示する。アリと原稿の依頼人の同一性や、原稿の自動筆の精との戦闘を補わない。

物語改訂1→2では旧保存全体を旧定義で検証後、校正者の固定所在と、到着済み行動の履歴に基づく依頼人の所在だけを補う。出発時点を到着済みとは扱わず、本文・既存の旗と所在・全8旅程・12行動・3結末・報酬を保持する。再校正一回の旗、署名と封印、交代者到着と作業完了の時点を分離する。

専用10試験と出演監査7試験が成功した。新旧保存の全7場面・8旅程・12行動、往復途中の所在、再校正一回、独立した依頼人の到着、交代者への5合流経路と実同行、全8経路の一回報酬、旧受注3場面の8直接経路、不正保存の原子的拒否を確認した。検査側の行動数の数え違いと同行者の参照先の誤りを修正後、17試験成功・失敗0・スキップ0。現行／表示追加前の各18保存点と旧受注5保存点の41保存点を、Scene／Classic × 1440／390pxの164画面条件で確認するCIを追加した。`npm run check`は全2,848試験成功・失敗0・スキップ0で、生成物・データ・静的参照・文書検査も成功した。[Salome CI](https://github.com/TomTomYoung/adv/actions/runs/43378292793)で41保存点・164画面条件・3結末が成功し、エラー0・横方向のはみ出し0・人物表示の遮蔽0だった。証跡ZIP（artifact 14016021772）のSHA-256 `9580d47766ec1161ba250df432dda8bf9e90c682f1329f388c1ef51df90c5829`とPNG164枚・結果JSONの一致を確認した。入口の2役、再校正後の依頼人、契約窓口の依頼人、再校正台と封印後の人物なし、写本室と実同行後の交代者、旧受注の人物なしの代表8画面を目視した。ローカルChromiumはこの環境のsocket作成制限で起動できないため、画面検査はGitHub CIで実施した。実装と検証は[PR #236](https://github.com/TomTomYoung/adv/pull/236)へまとめた。

基本4人・標準Lv5・現場開始・seed 1907で、校正→翌朝→再校正→翌朝→契約署名→校正台で封印の経路を通常の移動・戦闘処理で通した。342歩・12勝・敗北0・逃走0・救助0、240G→540G（戦闘195G・依頼105G）、全員Lv6・HP/MP全快で指定結末をクリアした。予備灯油が+1。一編成・一seed・一経路の確認である。

追加で守備・回復編成（ベルグ・ルカ・セラ・トーマ）・標準Lv5・現場開始・seed 1907を用い、校正→翌朝→契約署名→締切を取り下げる→交代者を校正台へ案内する経路を通常攻略した。171歩・6勝・敗北0・逃走0・救助0、240G→413G（戦闘105G・依頼68G）、全員Lv5で指定結末をクリアした。ベルグHP104→86・MP14→2、ルカMP21→17、トーマMP44→32、予備灯油+1。基本4人とは異なる編成・経路での確認であり、全編成・全seedの保証ではない。

出演監査は68件・524場面（出演根拠あり388・同席根拠なし136）、残り32件・229場面。q171「足音を持ち帰る」の妻は別途未接続候補1役として残る。次工程はq049「忘却の栞」。原稿・初版・現行6場面・5旅程・3結末を精読済み。既存person luuの全5旅程の実同行、文書を残す3経路と文書を持ち帰る経路、出発時の携行と窓口のfinishでの受渡しを区別する。栞の封印を現実の地図・操作の禁止や知識全消去へ拡張せず、忘却の番人の戦闘や特定の窓口担当者を追加しない。監査登録と人物表示の実装は未着手。

2026-11-13追記：PR #234をmaster `59425c3e34601e9b395124ae7bc414406cf8a310`へ統合した。実装先端・検証記録更新後の各8ワークフロー、統合後検査run 43368085693、公開run 43368085410が成功した。公開版q046は入口から棚を直線に並べる経路を操作し、索引をたどる読者の呼称表示、125G・75EXPの報酬、指定結末を確認した。0歩・戦闘0回、240G→365G。黄天騎士団への名称変更も保持している。

q047「一頁の戦争」の原稿・初版・現行8場面を出演監査へ登録した。各国の記録係2役と共同庫の受領人2役を区別し、7場面へ呼称表示を接続した。併記の場面の受領人は共同庫で面会した経路だけに表示し、直接併記した経路へ同席させない。サロメと交易市の訪問先から戦史の二国の国名を確定せず、歴史家オミの同席や軍旗の亡霊戦を補わない。

物語改訂1→2では旧定義で保存全体を検証後、記録係の固定所在homeClerkAt=home・otherClerkAt=otherだけを補う。本文・既存の保持者・旗・全9旅程・13行動・3結末・報酬は保持する。原本の携行と返却、共同庫での受領、各記録室への写しの到着、finishでの配送完了を分ける。

専用10試験と出演監査7試験が成功した。全8場面・9旅程・13行動の新旧保存再開、越境途中の往路・復路の保存、到着時の知識、原本と写しの受渡し、全9経路の一回報酬、旧受注4場面と9直接経路、不正保存の原子的拒否を確認した。現行／表示追加前の各23保存点と旧受注7保存点の53保存点を、Scene／Classic × 1440／390pxの212画面条件で確認するCIを追加した。`npm run check`は全2,838試験成功・失敗0・スキップ0で、生成物・データ・静的参照・文書検査も成功した。[Salome CI](https://github.com/TomTomYoung/adv/actions/runs/43372083987)で53保存点・212画面条件・3結末が成功し、エラー0・横方向のはみ出し0・人物表示の遮蔽0だった。証跡ZIP（artifact 14013276594）のSHA-256 `ec3fd680018fb8e23c82744a6dffbe5aee2301b2d0513bc3eb96d931d9e8f4d3`とPNG212枚・結果JSONの一致を確認した。入口の人物なし、依頼国と相手国の記録係、共同庫の受領人2役、直接併記した場面の人物なし／共同庫経由の受領人2役、両記録室への配送後、旧受注の人物なしの代表9画面を目視した。ローカルChromiumはこの環境のsocket作成制限で起動できないため、画面検査はGitHub CIで実施した。実装と検証は[PR #235](https://github.com/TomTomYoung/adv/pull/235)へまとめた。

基本4人・標準Lv5・現場開始・seed 1907で、依頼国への照会→相手国への照会→共同庫→併記→依頼国への配送→相手国への配送を通常の移動・戦闘処理で通した。446歩・6勝・敗北0・逃走0・救助0、240G→418G（戦闘73G・依頼105G）、全員Lv5・HP全快で指定結末をクリアした。アダMP16→13・イルMP45→17、傷薬と予備灯油が各+1。一編成・一seed・一経路の確認である。

出演監査は67件・517場面（出演根拠あり383・同席根拠なし134）、残り33件・236場面。q171「足音を持ち帰る」の妻は別途未接続候補1役として残る。次工程はq048「眠る校正者」。原稿・初版・現行7場面・8旅程・3結末を精読済み。校正台に残る校正者、写本室や契約窓口で応対する依頼人、実際に同行する交代者を区別する。一回だけ再校正する旗の到着時点、別契約への署名と最後の封印、交代者への合流経路と校正台への同行を監査する。監査登録と人物表示の実装は未着手。

2026-11-13追記：PR #233をmaster `3ca5fcac8114226a84f2df99d4a2a80088d9a096`へ統合した。実装先端と文書更新後の各8ワークフロー、統合後検査run 43332726254、公開run 43332725343が成功した。公開版q045は入口から直接保管する経路を操作し、入口・保管窓口の相続人表示、帰還印20G、68G・75EXPの報酬と指定結末を確認した。0歩・戦闘0回、240G→288G。最新の設定文書追加を含むmaster `2184deb8f5b96e990887835242b9cac61fd9bcb2`を取り込んでq046を開始した。

q046「迷子の索引」の原稿・初版・現行5場面を出演監査へ登録し、既存person readerを索引をたどる読者として5場面へ呼称表示した。全7旅程の実同行、雨・川・渡しの旧書名札を巡る反復、3か所から出口札で階段へ戻る経路を維持する。司書シフや索引の番人を現場へ補わず、本文・物語改訂1・旗の設定時点・3結末・報酬・保存値を保持する。

専用9試験と出演監査7試験が成功した。全5場面・7旅程・10行動の新旧保存再開、3出口の出発時の札と到着後の完了確定、棚の到着時の既読・知識、複数周の同行と反復、3結末の一回報酬、旧受注4場面と直接出口、不正保存の原子的拒否を確認した。反復0・1・2回後の各出口と対応表の13経路を通し、知識保持は3周でも確認した。現行／表示追加前の各13保存点と旧受注7保存点の33保存点を、Scene／Classic × 1440／390pxの132画面条件で確認するCIを追加した。`npm run check`は全2,828試験成功・失敗0・スキップ0で、生成物・データ・静的参照・文書検査も成功した。[Salome CI](https://github.com/TomTomYoung/adv/actions/runs/43365553961)で33保存点・132画面条件・3結末が成功し、エラー0・横方向のはみ出し0だった。証跡ZIP（artifact 14009724869）のSHA-256 `7bb61e095e7374730279504fb60497dbc87ccc2e6275f48afdf27b476b7e2c54`とPNG132枚・結果JSONの一致を確認した。反復後の雨の棚（現行Scene 390px）と渡しの棚（表示追加前Scene 390px）、雨／川から出口に到着した階段（現行／表示追加前Classic 1440px）、渡しから出口に到着した階段（現行Scene 390px）、旧受注の反復後の雨の棚で人物表示なし（Scene 390px）の代表6画面を目視した。ローカルChromiumはこの環境のsocket作成制限で起動できないため、画面検査はGitHub CIで実施した。実装と検証は[PR #234](https://github.com/TomTomYoung/adv/pull/234)へまとめた。

基本4人・標準Lv5・現場開始・seed 1907で、索引→雨→川→渡し→雨へ再訪→川→渡し→対応表を結ぶ経路を通常の移動・戦闘処理で通した。92歩・1勝・敗北0・逃走0、240G→375G（戦闘30G・依頼105G）、全員Lv5・HP全快で指定結末をクリアした。アダMP16→13・イルMP45→37、予備灯油+1。一編成・一seed・一経路の確認である。

出演監査は66件・509場面（出演根拠あり376・同席根拠なし133）、残り34件・244場面。q171「足音を持ち帰る」の妻は別途未接続候補1役として残る。次工程はq047「一頁の戦争」。原稿・初版・現行8場面・9旅程・3結末を精読済み。二国の記録係と共同庫の受領人を区別し、原本と2部の写しの保持者、越境を含む実移動、共同庫での受領と各記録室への配送を分ける。歴史家オミの同席や軍旗の亡霊との戦闘を補わない。監査登録と表示実装は未着手。

2026-11-13追記：q045は専用8試験・出演監査7試験が成功。4場面・4旅程・8行動・5経路・3結末、相続人の集団の実同行、原稿の出発時携行と議事録／保管確定時の引渡し、旧受注3場面、不正保存の拒否を検証した。新旧各6条件＋旧受注3場面の15保存点・60画面条件を `tools/browser-inheritance-cast-smoke.mjs` で確認する。基本4人・Lv5・seed 1907の通常攻略は57歩・1勝・敗北0、240G→360Gで指定結末をクリア。`npm run check`は全2,819試験成功・失敗0・スキップ0で、生成物・データ・静的参照・文書検査も成功した。[Salome CI](https://github.com/TomTomYoung/adv/actions/runs/43329766828)で15保存点・60画面条件・3結末が成功し、エラー0・横方向のはみ出し0だった。証跡ZIP（artifact 13994872746）のSHA-256 `0a0b58fec73a51cc510a1bb0f2cc4e50339db6c67dca19dd5707734d476b8fa7`とPNG60枚・結果JSONの一致を確認した。現行入口（Scene 390px）、表示追加前の協議室（Scene 390px）、入口から直接／協議後の保管窓口（Classic 1440px）、旧受注入口の人物表示なし（Scene 390px）の代表5画面を目視した。ローカルChromiumはこの環境のsocket作成制限で起動できないため、画面検査はGitHub CIで実施した。実装と検証は[PR #233](https://github.com/TomTomYoung/adv/pull/233)へまとめた。

2026-11-13追記：q044は専用9試験・出演監査7試験が成功。全7場面・8旅程・13行動、避難・申立・審査要求の確定時点、本人が宿へ残ること、所在に応じた再訪先の有効／無効、反復往復、原本の保持者、3結末の一回報酬、旧受注3場面と不正保存の拒否を確認する。`tools/browser-obituary-cast-smoke.mjs`は27保存点・108画面条件を検査する。基本4人・Lv5・seed 1907の通常攻略は59歩・1勝・敗北0、240G→360Gで指定結末をクリア。`npm run check`は全2,811試験成功・失敗0・スキップ0で、生成物・データ・静的参照・文書検査も成功した。[Salome CI](https://github.com/TomTomYoung/adv/actions/runs/43317811612)で27保存点・108画面条件・3結末が成功し、エラー0・横方向のはみ出し0だった。証跡ZIP（artifact 13988223963）のSHA-256 `2cef5658352870b974ef5b25a3110fc5423e9cf81974dd495b6bc107f5ef0c1a`とPNG108枚・結果JSONの一致を確認した。生活市の本人（現行Scene 390px）、再訪した宿の本人（旧保存Scene 390px）、宿に本人を残した窓口（現行Classic 1440px）、本人の所在による再訪先の有効／無効（現行Scene 390px・旧保存Classic 1440px）の代表5画面を目視した。ローカルChromiumはこの環境のsocket作成制限で起動できないため、画面検査はGitHub CIで実施した。実装と検証は[PR #232](https://github.com/TomTomYoung/adv/pull/232)へまとめた。

2026-11-12追記：q043の専用8試験を `tests/ink-fire-cast.test.mjs` へ追加した。全6場面の出演根拠なし、5旅程・6経路の保存再開、薬剤停止前後の条件付き本文と復元禁止、控えの出発時の携行とfinish時の引渡し、3結末の一回報酬、不正保存の原子的拒否、旧受注2場面・6経路を確認する。専用8試験・出演監査7試験が成功。13保存点・52画面条件を `tools/browser-ink-fire-cast-smoke.mjs` で検査する。基本4人・標準Lv5・seed 1907の通常攻略は181歩・4勝・敗北0、240G→405Gで復元の結末をクリア。`npm run check`は全2,802試験成功・失敗0・スキップ0で、生成物・データ・静的参照・文書検査も成功した。[Salome CI](https://github.com/TomTomYoung/adv/actions/runs/43230679618)で13保存点・52画面条件・3結末が成功し、エラー0・横方向のはみ出し0だった。証跡ZIP（artifact 13950516227）のSHA-256 `0ca5e4bf5c1bfc8f5578336654ce01b51c1f16ea66f7d5cd7185b2d2a722968e`とPNG52枚・結果JSONの一致を確認した。現行の復元禁止（Scene 390px／Classic 1440px）、現行と旧受注の復元可能状態（Scene 390px／Classic 1440px）の代表4画面を目視し、停止前後の条件付き本文も結果JSONで確認した。公開済み本編でも、q043・基本4人・標準Lv5・現場開始・seed 1907で、先に文字を写す→追記が消える本文→復元選択肢が無効→復旧せず封鎖の順に操作した。人物表示なし、0歩・戦闘0回、報酬125G・75EXP、所持金240G→365Gと指定結末でのクリアを確認した。

2026-11-12追記：q042の専用9試験を `tests/hourglass-cast.test.mjs` へ追加した。表示前定義との差分、全9場面・8旅程・6経路の待機／移動／完了保存、砂検査の条件付き管理者表示、交代者の実同行、記録と二時計の旗の確定時点、3結末の一回報酬、不正保存の原子的拒否、旧受注3場面・6経路を確認する。画面は新旧各17条件と旧受注3場面の37保存点・148条件を `tools/browser-hourglass-cast-smoke.mjs` で検査する。専用9試験・出演監査7試験と全体2,794試験成功（失敗0・スキップ0）。標準Lv5・基本4人・seed 1907の通常操作でも、外時計確認から記録と交代まで266歩・6勝・敗北0、240G→435Gを確認した。[Salome CI](https://github.com/TomTomYoung/adv/actions/runs/43222558647)で148条件・3結末が成功、errors 0。証跡ZIP（artifact 13945434216）のSHA-256を照合し、管理者表示の経路差と交代後の複数人表示を画像でも確認した。ローカルChromiumはsocket作成制限で起動できないため、画面検査はGitHub CIで実施した。

最終確認日: 2026-11-11。対象: PR #225の `.github/workflows/*.yml` と `package.json`。

この文書は、advで実行される主要な自動検査について、何を守るためのテストか、何を実際に検査するか、何を出力するかをまとめたものです。テスト結果を会話へ持ち込む際の運用は末尾の「会話ログへの持ち込み」を基準にします。

## q041の人物表示・本の返却・司書の所在

[専用試験](../../tests/borrower-cast.test.mjs)は、表示前定義との差分、全8場面・8旅程の新旧保存、未訪問の借り手を残す本だけの回収、司書の招聘と居室に残る経路、借り手本人の返却、二人での台帳登録、本の受渡し、3結末それぞれの報酬の一回性、旧受注の3場面・4経路を検査する。[ブラウザー試験](../../tools/browser-borrower-cast-smoke.mjs)は新旧各10条件（collectとreturnedの司書の所在を区別）と旧受注3場面の23保存点をScene／Classic × 1440／390pxの92条件で検査し、呼称・本文・選択肢・保存再開・はみ出し・町背景の同席していない人物を確認する。Salome CIのq041-cast-checkpointsへ結果JSONとPNGを保存する。

## q190の人物表示・戦闘後再開・魔石回収

[専用試験](../../tests/postwar-cast.test.mjs)は、表示前定義との差分、全19場面・17旅程の新旧保存、勝利直後のフウ、逃走・敗北後の再戦禁止と現場への帰還、全6順序の封鎖、封鎖数と保管先確認の8組の回収条件、魔石3個の受渡し、3結末と報酬の一回性、旧受注経路を検査する。[ブラウザー試験](../../tools/browser-postwar-cast-smoke.mjs)は新旧保存・回収条件・封鎖済み選択肢・戦闘失敗・旧受注の60保存点をScene／Classic × 1440／390pxの240条件で検査し、呼称・本文・選択肢・保存再開・はみ出し・同席していない人物を確認する。Oddland CIのq190-cast-checkpointsへ結果JSONとPNGを保存する。

## q189の人物表示・歌集の受渡し・保存移行

[専用試験](../../tests/lullaby-cast.test.mjs)は、表示前定義との差分、全8場面・8旅程の新旧保存、アサと避難者の同行、資料室に同行しない人物、歌集の資料室→隊→看守の受渡し、4結末と報酬の一回性、不正保存の原子的拒否、旧受注経路を検査する。[ブラウザー試験](../../tools/browser-lullaby-cast-smoke.mjs)は新旧各8場面と旧受注2場面の18保存点をScene／Classic × 1440／390pxの72条件で検査し、呼称・本文・選択肢・保存再開・はみ出し・町背景の同席していない人物を確認する。Oddland CIのq189-cast-checkpointsへ結果JSONとPNGを保存する。

## q188の人物表示・家族の所在・保存互換

[専用試験](../../tests/returning-soldier-cast.test.mjs)は、表示前定義との差分、全10場面・9旅程の新旧保存、妻と弟の個別聞き取りと別居後の所在、4結末の同額報酬と一回性、現場接続前の受注経路を検査する。[ブラウザー試験](../../tools/browser-returning-soldier-cast-smoke.mjs)は22保存点をScene／Classic × 1440／390pxの88条件で検査し、呼称・本文・選択肢・保存再開・はみ出し・町背景の同席していない人物を確認する。Oddland CIのq188-cast-checkpointsへ結果JSONとPNGを保存する。

## 変更範囲と成功結果の再利用

文書本文だけのPR・master差分では、通常CIの文書・リンク・生成文書検査だけを行います。対象は `doc//*.md`、`README.md`、`AGENTS.md`。実行試験の入力でもある地域移設と出演監査の生成Markdown、および文書内JSONは除外し、通常の検査対象に残します。

ゲーム変更を含むPRへ後から文書だけを追記しても、GitHubのpaths判定ではPR全体が対象になるため、ワークフロー自体は再起動します。各ジョブの開始時に[判定処理](../../tools/ci-scope.mjs)と[共通action](../../.github/actions/ci-plan/action.yml)が、文書本文を除くGitの全ファイルのパス・モード・blob、Node版・OS・CPU・runner imageの指紋を求めます。正本、配布JSON、画像、テスト、実行器、CI設定、不明なファイルを含め、入力の変更は成功結果の再利用を無効にします。

同じジョブ・入力・環境の成功記録が完全一致するときだけ、重い試験・Chromium導入・重複画像生成を省略します。文書検査は常に実行します。再利用元の成功runをActions概要へ残し、スクリーンショットはそのrunのartifactを参照します。cacheへ保存するのは小さな成功記録だけです。すべての試験とartifact保存が成功した後だけ[記録action](../../.github/actions/ci-record/action.yml)を実行し、失敗・中止・文書のみ・cache再利用では新しい成功記録を作りません。完全一致しないcacheや壊れた記録、消失したcacheは検査を省略する根拠にしません。

PRの差分はmerge-baseからHEADまでを判定します。直前コミットだけを見る方法では、先に入れた未検証のゲーム変更を文書追記で隠せるため採用しません。履歴を取得できない場合は検査する側へ倒します。履歴の比較には全commit/treeを取得し、古い画像blobは必要になるまで取得しないpartial cloneを使います。同じPRの古い実行は新しい実行で打ち切りますが、masterへのpushや手動実行は別グループで保持します。

手動のworkflow_dispatchは、cacheがあっても選択ワークフローの検査を実行します。ゲーム変更の初回と入力が変わった場合の全体試験・既存の画面検査範囲は維持します。ローカルでは関連試験から始め、修正がまとまった後に全体試験を一度行います。

[判定の6試験](../../tests/ci-scope.test.mjs)は実Gitリポジトリを作り、文書のみ、ゲーム変更後の文書追記、削除・移動・実行属性、原稿・生成監査・JSON・画像・CI設定、比較履歴不足、環境差、成功記録の欠落・不一致、手動強制を検証します。

参考：[GitHubの差分・paths判定](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)、[cacheの一致条件とPRごとの範囲](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)、[actions/cache](https://github.com/actions/cache)。

ブラウザーCIは[Playwright公式コンテナ](https://playwright.dev/docs/docker)の`mcr.microsoft.com/playwright:v1.58.2-noble`を使う。Playwright npmパッケージも1.58.2に固定し、コンテナ内のChromium・OS依存関係・日本語フォントで既存の検査条件を実行する。2026-11-11にrunnerからUbuntuのAzure／標準配布元への名前解決失敗を観測したため、jobごとのAPT導入を廃した。画像タグは[公式一覧](https://mcr.microsoft.com/v2/playwright/tags/list)で確認した。 コンテナとcheckoutの実行ユーザー差は、共通actionでそのjobの`GITHUB_WORKSPACE`だけをGitのsafe.directoryへ登録して扱う。戦闘演出・攻略パーティー試遊も同じCI判定と成功記録を使い、文書検査を維持したまま同一入力を再利用する。

## 1. 通常CI: `.github/workflows/ci.yml`

ワークフロー名: `Validate dungeon RPG`。masterへのpush、pull request、手動実行で起動します。作業ブランチへのpush単独では起動しません。Node.js 22 / Ubuntu上で実行し、ブラウザは使用しません。

### `npm run check:runtime`

目的: 配布用runtime情報が、現行のHTML・JS/CSS・JSON・素材と一致していることを保証する。

検査: `tools/build-runtime.mjs --check` を実行し、配布revision、参照ファイルのcontent hash、生成済み `runtime.json` と現物の一致を確認する。

出力: GitHub Actionsの標準ログと終了コード。通常はartifactを生成しない。差異があれば不一致箇所をログに出して失敗する。

### `node tools/validate.mjs`

目的: ゲームデータ、Schema、参照関係、アセット参照を壊した変更を検出する。

検査: 全データの構造、IDや相互参照、シナリオ・キャラクター・アセット等の参照整合性を検証する。

出力: 標準ログと終了コード。通常はartifactなし。失敗時に検証対象と理由をログへ出す。

### `npm run check:editions`

目的: authored scenario editionsと配布用scenario edition JSONの食い違いを検出する。

検査: `tools/build-scenario-editions.mjs --check` により、正本から再生成した場合の内容と現在の生成物が一致するか確認する。

出力: 標準ログと終了コード。通常はartifactなし。

### `node tools/check-config-editors.mjs`

目的: 設定編集ページと、その正本JSON・生成物の不整合を防ぐ。

検査: config editorページ、対応するsource JSON、生成済み設定の対応関係を検査する。

出力: 標準ログと終了コード。通常はartifactなし。

### `node tools/check-static.mjs`

目的: 静的ファイルと、コードから検査可能な表示境界条件を守る。

検査: 必要な静的ファイル、参照、view boundaryなどの静的条件を検査する。実ブラウザでの見た目確認そのものではない。

出力: 標準ログと終了コード。通常はartifactなし。

### `node tools/check-docs.mjs`

目的: 自動生成文書・索引・リンク・配布データの指紋・保存原文の整合性を守る。

検査: Markdown、画像・編集画面へのリンク、生成一覧、配置図、配布データ指紋、旧原文ハッシュ等を照合する。

出力: 標準ログと終了コード。通常はartifactなし。

### `node --test tests/*.test.mjs`

目的: ゲームロジック、シナリオ分岐、保存互換、通常キャンペーン等の回帰をNodeテストで検出する。

検査: `tests/*.test.mjs` の全テスト。CI上のstep名は `Exercise all quest branches and a normal campaign`。

出力: Node test runnerのTAP系標準出力、成功・失敗件数、終了コード。通常はartifactなし。

## 2. 人物・演出ブラウザCI: `.github/workflows/cast-presentation.yml`

ワークフロー名: `Validate cast presentation in Chromium`。人物、シナリオ、人物画像、関連fixtureやbrowser smokeの変更を含むpull request、または手動実行で起動します。Playwright 1.58.2 + Chromium headless shell + Ubuntu 24.04を使用します。

### `shield-browser` job

目的: 沈没城後半のq162〜q165について、人物・グループ・portraitと旧保存移行を個別に確実に確認する。

検査:
1. q162: `browser-sunken-art-smoke.mjs --shield-only`。盾関連の保存、グループ、portrait。
1. q163: `--locksmith-only`。鍵師と店主、現行保存と旧保存。
1. q164: `--farewell-only`。客とレン、現行保存と旧保存。
1. q165: `--aid-only`。リナとイル、現行保存と旧保存。

出力: 標準ログ、各条件のスクリーンショット等。GitHub Actions artifactとして `q162-shield-checkpoints`、`q163-locksmith-checkpoints`、`q164-farewell-checkpoints`、`q165-aid-checkpoints` を保存する。

### `cast-browser` job

目的: 人物表示、アニメーション、Scene/Classic、画面幅、旧保存移行を実Chromiumで回帰確認する。

検査:
1. `browser-cast-smoke.mjs`: native cast animationとscript wait。
1. `browser-kagaribi-art-smoke.mjs`: 篝火人物画、両edition、layout、幅。
1. `browser-oddland-art-smoke.mjs`: Oddland人物画、両layout、幅。
1. `browser-chapel-art-smoke.mjs`: 礼拝堂出演者、migrated saves、両layout、幅。
1. `browser-sunken-art-smoke.mjs`: 沈没城出演者、migrated saves、両layout、幅。

出力: 標準ログとPNG/JSON checkpoint。artifactは `cast-presentation-checkpoints`、`chapel-scene-checkpoints`、`chapel-classic-checkpoints`、`sunken-cast-checkpoints`。

## 3. ダンジョン・戦闘操作ブラウザCI: `.github/workflows/event-controls.yml`

ワークフロー名: `Validate dungeon and battle controls in Chromium`。view、battle、core/application、config、Schema、関連browser smoke等の変更を含むpull request、または手動実行で起動します。

目的: 実ブラウザ上の座標、操作、戦闘、店、探索、Grid/Frontline、設定編集までを一括して回帰確認する。

個別検査:
1. `browser-event-controls-smoke.mjs`: 固定移動座標とイベント選択。
1. `browser-battle-smoke.mjs`: 戦闘開始と攻撃対象座標。
1. `browser-kagaribi-smoke.mjs`: 篝火地区と前哨サービス。
1. `browser-expedition-smoke.mjs`: 補給所、技能購入、checkpoint出発。
1. `browser-shop-smoke.mjs`: 店のスクロール、購入対象者、独立スキル屋。
1. `browser-q001-return-smoke.mjs`: q001の複数帰路と共通新人救助。
1. `browser-field-skills-smoke.mjs`: 探索技能対象、キーボード安全性、狭幅。
1. `browser-generated-dungeon-engine-smoke.mjs`: 生成ダンジョンを実ゲームエンジンで操作。
1. `browser-config-smoke.mjs`: config編集。
1. `browser-packages-smoke.mjs`: 再利用可能なdungeon package。
1. `browser-scouting-smoke.mjs`: scout技能、stun、preemptive action。
1. `browser-action-statuses-smoke.mjs`: action statusの持続とsealed controls。
1. `browser-grid-smoke.mjs`: Grid陣形、range preview、sprite重なり。
1. `browser-frontline-smoke.mjs`: Frontline testerとsilhouette。
1. `browser-battle-engine-smoke.mjs`: embedded battle engine playtest。
1. `browser-frontline-lifecycle-smoke.mjs`: Frontlineのbody、可変行、remove。

出力: 各smokeの標準ログとviewport screenshot/checkpoint。まとめて `dungeon-event-controls-checkpoints` artifactへ保存する。

## 4. 屋内探索ブラウザCI: `.github/workflows/indoor-exploration.yml`

ワークフロー名: `Validate indoor exploration in Chromium`。

目的: 屋内・閉鎖空間のマップ表示と水場遷移が、layoutや画面幅によって壊れないことを確認する。

検査: `browser-indoor-smoke.mjs` で全enclosed mapとwater transitionを両layout・複数幅で確認する。

出力: 標準ログ、viewport checkpoint。artifactは `indoor-browser-checkpoints`。

## 5. 屋外探索ブラウザCI: `.github/workflows/outdoor-exploration.yml`

ワークフロー名: `Validate outdoor exploration in Chromium`。

目的: 屋外マップがlayoutや画面幅によって崩れないことを確認する。

検査: `browser-outdoor-smoke.mjs` で全outdoor mapを両layout・複数幅で確認する。

出力: 標準ログ、viewport checkpoint。artifactは `outdoor-browser-checkpoints`。

## 6. 機関廟クエストブラウザCI: `.github/workflows/machine-quests.yml`

ワークフロー名: `Validate machinery quests in Chromium`。

目的: 機関廟系列の現場移動・帰路・施設表示が実ブラウザ上で成立することを確認する。

検査: `browser-machine-smoke.mjs` でworker return、ward collection、3 homesを両layout・複数幅で歩行確認する。`browser-machine-cast-smoke.mjs` はq173の現行・表示追加前・旧受注の19保存点をScene／Classic × 1440／390pxの76条件で表示する。`--funeral-only` はq174の現行6・表示追加前6・旧受注1の13保存点を同じ組合せの52条件で表示し、娘の非同行・負傷者の救護先・遺書の受渡し・旧受注表示を検査する。`--hunter-only` はq175の現行10・表示追加前10・戦闘再開10・旧受注1の31保存点を124条件で検査し、戦闘前と報告後の見張りの表示を区別する。[専用6試験](../../tests/hunter-cast.test.mjs)では全場面・全旅程・3結末・報酬の一回性、旧戦闘保存の勝利・逃走・敗北・再挑戦、正面戦の逃走不可と不正保存の拒否を検査する。`--god-sandals-only` はq176の現行8・表示追加前8・旧旅程の到着後2・旧受注2の20保存点を80条件で検査する。[専用7試験](../../tests/god-sandals-cast.test.mjs)は全8旅程・3結末・草鞋の受渡し・神の所在・追加3役の保存移行・旧待機本文の保持と到着後の本文修正・不正保存の拒否・報酬の一回性を検査する。`--mirror-only` はq177の現行9・表示追加前9・旧受注2の20保存点を80条件で検査する。[専用6試験](../../tests/truth-mirror-cast.test.mjs)は表示・所在追加以外の配布定義の一致、全7旅程・4結末・証拠の受渡し時点・暫定告知の未確認・遠隔同意後の設定・旧保存の厳密な移行・不正保存の拒否・報酬の一回性を検査する。`--tomorrow-door-only` はq178の現行9・表示追加前9・旧旅程の到着後3・旧受注3の24保存点を96条件で検査する。[専用7試験](../../tests/tomorrow-door-cast.test.mjs)は本文3箇所と表示・所在追加以外の配布定義の一致、全8旅程・5経路・3結末、不可逆の越境、手紙と髪紐の受渡し時点、旧保存の厳密な移行と待機本文の保持、到着後の修正文、不正保存の拒否、q177との同時移行と報酬の一回性を検査する。`--garden-only` はq179の現行17・表示追加前17・旧旅程到着後3・旧受注2の39保存点を156条件で検査する。[専用7試験](../../tests/garden-cast.test.mjs)は全17場面・15旅程・3結末、三家の6訪問順×8応答組合せを新旧保存で検査し、個別の標の保持者・縄の一回消費・焼却と救援の確定時点・報酬の一回性・不正保存の拒否を確認する。`--last-tale-only` はq180の現行9・表示追加前9・旧旅程到着後6・旧受注2の26保存点を104条件で検査する。[専用7試験](../../tests/last-tale-cast.test.mjs)は全9場面・8旅程・4結末、ムイと聞き手の実所在、本文6箇所の確定前後、台本の受渡し、旧待機本文と到着後の修正文、不正保存の拒否、q179との同時移行と報酬の一回性を検査する。人物の所在、呼称だけの表示、同意前のguest選択の無効化、保存再開、本文送り、画面内のラベル配置を確認する。

出力: 標準ログ、viewport checkpoint。歩行側のartifactは `machine-browser-checkpoints`。q173は結果JSONとPNGを `q173-cast-checkpoints` に保存する。q174は `q174-cast-checkpoints`、q175は `q175-cast-checkpoints`、q176は `q176-cast-checkpoints`、q177は `q177-cast-checkpoints`、q178は `q178-cast-checkpoints`、q179は `q179-cast-checkpoints`、q180は `q180-cast-checkpoints` に分離する。成功時は件数と成功だけを報告し、失敗時だけ該当状態の要点を取得する。

## 7. OddlandブラウザCI: `.github/workflows/oddland-quests.yml`

ワークフロー名: `Validate Oddland border and quests in Chromium`。

目的: 国境、巡礼路、Oddlandクエスト一式が実際に歩行・進行でき、表示も崩れないことを確認する。

検査: `browser-oddland-smoke.mjs` でborder、pilgrimage roads、complete questsを両layout・複数幅で確認する。 `browser-observatory-cast-smoke.mjs` はq181の現行9・表示追加前9・旧受注2の20保存点をScene／Classic × 1440／390pxの80条件で検査する。[専用7試験](../../tests/quiver-cast.test.mjs)は全9場面・8旅程・4経路・3結末、場所別の6役、矢筒の受渡しと報酬の一回性、通達・合意の確定時点、旧待機本文・厳密な移行・不正保存の拒否・q180との共存を確認する。

`browser-gunner-cast-smoke.mjs` はq182の現行11・表示追加前11・旧受注4の26保存点をScene／Classic × 1440／390pxの104条件で検査する。砲の設置点は司令の合意・避難隊との調整の4状態を含む。[専用8試験](../../tests/gunner-cast.test.mjs)は全8場面・8旅程・12経路・3結末、搬入時だけ動くオル、固定所在の司令、実退避する避難隊、魔石の一回消費・保留時の未消費と受渡し、報酬の一回性、搬入途中を含む旧保存・旧受注経路・不正保存の拒否を確認する。

`browser-laundry-cast-smoke.mjs` はq183の現行8・表示追加前8・旧受注2・糧食不足1の19保存点をScene／Classic × 1440／390pxの76条件で検査する。[専用8試験](../../tests/laundry-cast.test.mjs)は全8場面・8旅程・6経路・3結末、2群の固定所在、援助・訂正と軍服・確認書の受渡し、糧食2つの一回費用と不足時の代替経路、報酬の一回性、旧待機本文・厳密な移行・不正保存の拒否・q182との同時移行を確認する。

`browser-pot-cast-smoke.mjs` はq184の現行10・表示追加前10・旧受注2の22保存点をScene／Classic × 1440／390pxの88条件で検査する。倉庫の2経路は食材の所在が異なるため分ける。[専用8試験](../../tests/pot-cast.test.mjs)は全9場面・8旅程・4経路・3結末、4役の実同行と捕虜の出演場面、鍋・別鍋・食材の受渡し、検査と共同炊事の確定時点、報酬の一回性、物語改訂1と旧保存の完全保持、不正所在の拒否、旧受注経路とq183移行との共存を確認する。

`browser-bridge-cast-smoke.mjs` はq185の現行16・表示追加前16・旧受注1の33保存点を両表示・両幅の132条件で検査する。全13場面に加え、逃走・敗北から戻ったguardと39Gで支払えないrentを確認する。4役が同席する狭幅Sceneでは2列の呼称が重ならず、HUDと本文に隠れないことも共通ブラウザ検査で確認する。[専用8試験](../../tests/bridge-cast.test.mjs)は全11旅程・3結末・戦闘中と救助後を含む旧保存の完全保持、40G一回支払・無料帰還、家族・敵兵・舟の実移動と武器の固定所在、封鎖の確定時点、報酬一回性、不正所在の拒否、旧受注の戦闘結果と直接結末を検証する。

`browser-truce-cast-smoke.mjs`はq186の現行20・表示追加前20・旧受注2の42保存点をScene／Classic × 1440／390pxの168条件で検査する。直接合意と限定代理状の交換、逃走後に再戦・再交渉が閉じること、敗北後の再戦、全13場面を含む。[専用8試験](../../tests/truce-cast.test.mjs)は全14旅程・3結末、代理状と物資の出発／到着時の受渡し、負傷者と捕虜の実同行、限定合意、旧保存の待機本文・戦闘・旅程・完了状態、旧受注の直接結末、不正保存の原子的拒否を確認する。

`browser-flagless-soldier-cast-smoke.mjs`はq187の28保存点をScene／Classic × 1440／390pxの112条件で検査する。全9場面、住民の退避有無、勝利・逃走・敗北、3結末、勝利後もカドが残ること、将校が任用窓口だけに表示されること、逃走後に再戦と入口帰還が閉じることを含む。[専用6試験](../../tests/flagless-soldier-cast.test.mjs)は全10旅程・戦闘命令・本文・報酬の保持、固定所在、報酬一回性、改訂2保存の全段階再開と改訂1保存の原子的拒否を確認する。ユーザー許可によるq187の互換切断は、旧保存を移行できたとの検証に数えない。

出力: 標準ログ、viewport checkpoint。artifactは `oddland-browser-checkpoints`。q181の結果JSONとPNGは `q181-cast-checkpoints`、q182は `q182-cast-checkpoints`、q183は `q183-cast-checkpoints`、q184は `q184-cast-checkpoints`、q185は `q185-cast-checkpoints`、q186は `q186-cast-checkpoints`、q187は `q187-cast-checkpoints` に分離する。

## 8. SalomeブラウザCI: `.github/workflows/salome-quests.yml`

ワークフロー名: `Validate Salome access and library quests in Chromium`。

目的: サロメへの到達、個人・地域図書館クエスト、帰路が実際のブラウザ操作で成立することを確認する。

検査: `browser-salome-smoke.mjs` でSalomeまで歩き、personal/regional library questsを完了し、帰還するまでを両layout・複数幅で確認する。

出力: 標準ログ、viewport checkpoint。artifactは `salome-browser-checkpoints`。

## 9. 配信更新・キャッシュブラウザCI: `.github/workflows/runtime-update.yml`

ワークフロー名: `Validate cached runtime updates in Chromium`。

目的: キャッシュ済みの旧画面から更新した場合、部分デプロイやscenario edition切替が保存を壊さないことを確認する。

検査:
1. 最初に `npm run check:runtime` でruntime生成一致を確認。
1. `browser-runtime-smoke.mjs`: warm-cache update、partial deployment、欠落・不一致からの回復、保存保持。
1. `browser-scenario-editions-smoke.mjs`: scenario selectionとeditionごとの独立save。

出力: 標準ログと更新前後のcheckpoint。artifactは `runtime-update-checkpoints` で、`/tmp/adv-runtime-browser` と `/tmp/adv-editions-browser` を保存する。

## 10. `package.json` の統合検査 `npm run check`

ローカルでCI相当をまとめて行う入口。

実行順:
1. `tools/build-runtime.mjs --check`
2. `tools/build-scenario-editions.mjs --check`
3. `tools/validate.mjs`
4. `tools/check-config-editors.mjs`
5. `tools/check-static.mjs`
6. `tools/check-docs.mjs`
7. `node --test tests/*.test.mjs`

Chromium系browser smokeはこのコマンドには含まれず、対応するGitHub Actions workflowまたは個別scriptで実行する。

## 11. 出力の種類

advの自動テスト出力は次の3種類に分ける。

1. 終了状態: workflow/job/stepのsuccessまたはfailure。
2. テキストログ: Node、Playwright、検証scriptが標準出力・標準エラーへ出す診断。
3. artifact: Chromium系テストが保存するPNG screenshot、JSON result/checkpoint等。

成功判定だけが必要な場合は1だけを見る。失敗解析では2の失敗step周辺だけを見る。画面差異や人物表示を確認する必要がある場合だけ3の該当画像・JSONを開く。

## 12. 会話ログへの持ち込み

CIやテストの実行量と、ChatGPTの会話へ展開する情報量は別物として扱う。GitHub Actions側で多数のテストを実行しても、それだけでは会話を圧迫しない。圧迫要因は、長大な標準ログ、全stepの詳細、全artifact一覧、画像バイナリ/Base64、不要なJSON全文を会話へ展開することである。

以後の作業では次を標準運用とする。

1. 成功時は、workflow/job名、成功したこと、必要なら対象commitだけを記録する。
1. 失敗時は、失敗したworkflow/job/stepと、原因特定に必要な前後だけを取得する。
1. 成功したstepのログ全文は取得・転記しない。
1. artifactは必要なものだけ開き、全画像・全JSONを一括展開しない。
1. PNG/WebP等をBase64へ変換して会話やログへ出さない。
1. 詳細な検証結果を永続化する必要がある場合は `doc/development/PROGRESS.md` 等へ記録し、会話には要点だけ返す。

## 戦闘の手応えとHP表示（2026-11-09追加）

`tests/battle-playback.test.mjs` は命中前後のHP表示、演出省略による二重実行防止、終了時の操作復帰、再描画・ロード時の予約取消、武器別の通常攻撃、撃破結果を検査します。出力はNode標準の試験件数と成否です。

`.github/workflows/battle-feedback.yml` は `tools/browser-effects-smoke.mjs` をChromiumで実行します。Scene／Classic表示とClassic／Grid／Frontline戦闘の6組、斬撃・強打・刺突・弓の飛翔、命中音と数字の予約差、PC／390px、撃破、軽減・オフ、取消を検査します。結果JSONと代表PNGを7日間のartifactへ保存します。音声アダプターへの発音指示を検査し、スピーカーの聴感評価は行いません。

`tests/battle-impact.test.mjs` は追加の火花・衝撃波・回復・撃破、命中結果の分類、合成SEの音量・同時発音数・予約取消、BGMの一時減音と復帰を検査します。ブラウザー検査は `OfflineAudioContext` で既存SEと合成音を重ねた10種類を実際に生成し、無音・クリッピング・音色の取り違えを検査します。会心・回復・撃破のPNGと波形測定値を既存artifactへ追加します。
