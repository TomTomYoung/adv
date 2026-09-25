# ゲーム設定の編集元

[編集画面を開く](index.html)。HTTPまたはGitHub Pagesで配信して使用します。[操作・対象・検証範囲](../doc/authoring/CONFIG_EDITORS.md)を参照してください。

直下12件、dungeonsの13件、questsの200件のJSONが編集元です。同名HTMLで読み込み・編集・検証・全JSON出力を行います。GitHubへの貼り付けやcommit・pushは利用者が行います。

HTMLとshared/catalog.jsは `npm run build:config` で生成します。配布用dataはここから通常のビルドで生成し、二重管理しません。互換保存や制作記録は元の保管場所に維持します。
