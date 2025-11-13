# wargame — minimal refactor

このリポジトリは簡易な記事表示と、記事内容を元にAI(Gemini)へ質問を投げるUIを備えたサンプルです。
本リファクタリングでは、機能を最小化してローカル開発で壊れにくくしました。

## 目的
- `functions/operate/[id].js` をシンプルにして、データファイルが無くてもページが表示されるようにする
- `functions/api/gemini.js` は API キーが無い場合でも動作する（ローカルでの開発用エコー応答）
- クライアント側は `/js/gemini-form.js` で最小の入出力を行う

## 主要ファイル
- `functions/operate/[id].js` — /operate/:id のサーバー関数。可能なら `/data/operate.json` と `/data/operate_questions.json` を読み込むが、無ければサンプル記事でフォールバックする。
- `functions/api/gemini.js` — POST /api/gemini。`{ prompt }` を受け取り、環境変数 `GEMINI_API_KEY` がある場合は Gemini に中継、無い場合はローカル用のエコー応答を返す。
- `public/js/gemini-form.js` — クライアント側の最小スクリプト。送信時にコンソールへプロンプトを出力し、`/api/gemini` へ POST して `responseText` を表示する。

## 開発サイクル（ローカル）
1. 開発サーバー起動

```bash
wrangler pages dev public/
```

2. ブラウザでページを開く

- Operate ページ例: http://127.0.0.1:8788/operate/5

3. コンソール確認
- クライアントスクリプトのロード: `gemini-form.js loaded` が表示される
- 送信時: `gemini-form submit prompt:` に入力内容が表示される

## API 仕様（I/O）
### POST /api/gemini
- リクエスト (JSON): `{ "prompt": "ユーザー入力と記事内容を組み合わせた文字列" }`
- レスポンス (JSON):
	- 正常: `{ "responseText": "AIの応答テキスト" }`
	- エラー: `{ "error": "説明" }`

GEMINI_API_KEY が設定されていなければ、ローカルモードで以下を返します:
`{ "responseText": "（ローカルモード）受け取ったプロンプト: ..." }`

## データベース設計（簡易）
このプロジェクトで運用する主な永続データは「回答 (answers)」です。
簡易的な RDB スキーマ例 (Postgres):

- answers
	- id SERIAL PRIMARY KEY
	- operate_id TEXT
	- operate_external_id TEXT
	- submitted_by TEXT NULL
	- submitted_at TIMESTAMP WITH TIME ZONE
	- payload JSONB -- 質問IDと回答の配列

インサート時、`payload` に以下の形を保存できます:
```
{
	"answers": [ { "question_id": "q1", "answer": "..." }, ... ]
}
```

## 追加のメモ
- 本リファクタは「最小実装」を目的とします。将来的に堅牢化する場合は、入力バリデーション、認証、ログ（監査）、および Gemini 連携のリトライ/タイムアウトを追加してください。
- `GEMINI_API_KEY` を設定すると実際の Gemini に中継されます（現在のコードは API のレスポンス形に依存しているため、必要に応じて整形を追加してください）。

---

次に行える作業例:
- `functions/api/answers.js`（POST を受けて DB に保存する関数）のひな型追加
- E2E テスト用の小さなスクリプト
- `data/` のサンプル JSON を追加

どれを先に進めましょうか？
