# ローカルNodeでの最短MVP（トークンをブラウザに置かない）

- 更新日: 2026-03-01

## 概要

- ブラウザ: 開始/終了（押して話す）だけ
  - STT: Web Speech API
  - TTS: SpeechSynthesis
- ローカルNode:
  - **送信**: Discord Webhook（推奨。bot投稿を避けてChappyが反応しやすい）
  - **受信**: Discord Bot token でチャンネル履歴を取得（返信待ち）

## セットアップ

1. 依存インストール

```bash
npm i
```

2. `.env` を作成

```bash
cp .env.example .env
# .env を編集して DISCORD_BOT_TOKEN を設定
```

3. 起動

```bash
npm run dev
```

※ `PORT=8787` は他のサービスと被って 404 になることがあるため、まずは 8788 を推奨。

4. ブラウザで開く

- 同じPCで開く: http://localhost:8788/
- 別端末（スマホ等）で開く: `.env` で `HOST=0.0.0.0` にして、http://<PCのLAN IP>:8788/ を開く

## 使い方

- ボタンを押して話す → 離す
- 文字起こしテキストが `#voiceclaw` に送信される
- Chappyの返信を取得したら自動で読み上げる

## 注意

- このMVPは「最短」なので、返信の判定は単純（送信メッセージIDより新しい最初のメッセージ）。
  - 実運用ではスレッド化/メッセージのメタ情報付与などで堅牢化する。
