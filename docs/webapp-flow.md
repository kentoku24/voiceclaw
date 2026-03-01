# Webアプリ前提フロー案（Push-to-talk → Discord経由 → 端末再生）

- 更新日: 2026-03-01
- 目的: Macにマイクが無い前提で、Webアプリ（ブラウザ）を入力/出力端末にして、OpenClaw/Chappy と連携する最小フローを定義する。

## やりたいこと（要約）

1. Webアプリで「押して録音」（Push-to-talk）
2. 録音音声を Discord の特定チャンネルに送信
3. Chappy がそのチャンネルで応答
4. 応答を Web側で受け取り、端末スピーカーから再生

## 推奨する最小構成（現実的・実装簡単）

※「ChappyのレスポンスをSTT」は、通常 Chappy はテキストで返すため **STTは不要**。
Web側で **テキスト→TTS** して再生するのが最短。

```
[Browser WebApp]
  - 録音 (MediaRecorder)
  - (任意) 端末側でTTS再生
        |
        | Discord API (Bot)
        v
[Discord channel #voiceclaw]
  - ユーザー音声(添付) or 音声の文字起こし(テキスト)
        |
        | OpenClaw/Chappy (このチャンネルを監視/応答)
        v
[Chappy reply]
  - テキスト返信（推奨）
  - (任意) 音声返信（添付）
        |
        v
[Browser WebApp]
  - 返信取得 -> TTS -> 再生
```

## 送る内容の選択肢

### Option A: 音声ファイルをそのままDiscordに添付（シンプルだが、Chappy側でSTTが必要）

- Web→Discord: 音声添付（webm/wavなど）
- Chappy: 受け取った音声を STT → LLM → 応答
- Pros: Web側は録音して投げるだけ
- Cons: Chappy/バックエンド側で「添付音声の取得→STT」の実装が必要

### Option B: Web側でSTTしてテキストをDiscordに送信（最短で動く）

- Web: 録音→STT（ブラウザ内 or サーバ）→テキスト化
- Web→Discord: テキスト投稿
- Chappy: テキストを見て LLM→実行→テキスト応答
- Pros: Chappy側の実装が一気に楽、まず動かすには最適
- Cons: STTコスト/品質はWeb側の選択に依存

## 応答の受け取りと再生

- Chappy応答がテキストなら:
  - Webが Discord API で最新メッセージを取得 → TTS（ブラウザ SpeechSynthesis か外部TTS）→再生
- Chappy応答が音声添付なら:
  - Webが添付URLを取得して再生（この場合はSTT不要）

## 実装に必要なもの（概略）

- Discord Bot（Webアプリが投稿/読み取りするため）
  - 権限: 対象チャンネルへの送信、メッセージ履歴読み取り
- Webアプリ
  - 録音: MediaRecorder API
  - Discord送信: Bot経由でREST
  - 応答待ち: ポーリング or Gateway(WebSocket)
  - 再生: Audioタグ / WebAudio

## 次に決めたい（仕様質問）

1. Discordへ送るのは **音声添付**（Option A）？それとも **テキスト（Web側STT）**（Option B）？
2. Chappy応答は **テキスト**でOK？それとも **音声で返してほしい**？
3. 端末側TTSは
   - ブラウザ内蔵（無料/簡単）
   - 外部TTS（音質/声のこだわり）
   のどちらを優先する？
