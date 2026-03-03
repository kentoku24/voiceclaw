# MVP（最短）: WebでSTT→Discordへテキスト→Chappy応答→WebでTTS再生

- 更新日: 2026-03-01

## 採用方針（最短で動かす）

- Webアプリの操作は **開始/終了（押して録音）だけ**
- Web側で **STTしてテキスト化**し、Discordの指定チャンネルへ投稿
- Chappyはテキストに応答（必要ならOpenClawで実行）
- WebはChappyの返信テキストを取得し、**自動でTTSして再生**

## フロー

1. User: Webで「押す」→録音開始
2. User: Webで「離す」→録音停止
3. Web: 録音音声をSTT→テキスト生成
4. Web: Discordチャンネルへテキスト送信（bot）
5. Chappy: チャンネルのテキストに返信
6. Web: Chappy返信を取得→TTS→スピーカー再生（自動）

## DoD（Definition of Done）

- 開始/終了操作のみで一連が完走する
- Discord指定チャンネルにユーザー発話テキストが投稿される
- Chappyの返信が自動再生される

## 未決（後で拡張）

- Wakeword常時待受（ローカル）
- 音声添付の取り扱い（Chappy側STT）
- Androidでの24h常駐（省電力制限の攻略）
