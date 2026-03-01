# Discord Bot 初期設定チェック（voiceclaw）

- 更新日: 2026-03-01

## 目的

- relay（voiceclaw server）が Discord に投稿/取得できるようにする
- 401/403（Unauthorized / Missing Access）の切り分けを素早く行う

## よくあるエラーと原因

### 401 Unauthorized

- **トークンが間違っている / 失効している**
  - Bot token をリセットした後、設定ファイルや `.env` が古いまま

### 403 Forbidden / Missing Access (code 50001)

- Botがサーバに入っていない
- Botがそのチャンネルを見れない（View Channelがない）
- Botに送信権限がない（Send Messagesがない）

## 必要な権限（最低限）

- View Channel
- Send Messages
- Read Message History（返信ポーリングするなら）

## 招待リンク（概略）

- Discord Developer Portal で Bot を作成→サーバへ招待
- スコープ: `bot`
- 必要権限: 上記（View/Send/Read History）

## 動作確認（サーバ側）

- relayサーバから Discord REST を叩いて確認する

### 1) 投稿確認

- 成功: 200 + message id が返る
- 失敗: 401/403 の内容をそのままログに残す

### 2) 取得確認

- `GET /channels/{channelId}/messages` が 200 で取れるか

## 運用上の推奨

- 「入力を投稿する主体」と「Chappyが応答する主体」は分ける（別Bot/別チャンネル/Webhook等）
  - Bot同士だと反応しない設定になることが多いため
