# voiceclaw マイルストーン（小さく作って積み上げ）

- 更新日: 2026-03-01
- 方針: **最初は Mac 単体で完結**させ、動く最小形（MVP）を作ってから、段階的に端末（Android等）へ移す。

## Milestone 0: 仕様の最小化（紙の上で確定）

- Wakeword（例: "voiceclaw"）
- 1コマンドだけ対応（例: 「今日の天気を教えて」or「タイマー3分」など）
- 成功条件（Definition of Done）
  - Wakeword→短い発話→何かが実行され、結果が返る（音声 or ログ）

## Milestone 1: Mac単体・テキストでOpenClaw実行（音声なし）

目的: LLM→OpenClaw 連携の「実行系」を先に固める。

- 入力: 手打ちテキスト
- 処理: got5.3 等（クラウドLLM）で意図解析→OpenClaw tool 呼び出し
- 出力: ターミナルログ（まずは音声なし）
- DoD:
  - 1つ以上の実タスクが OpenClaw 経由で成功（例: リマインダー追加、メッセージ送信、など）

**現状 (2026-03-01):**
- Node relay + Discord webhook で投稿はできる
- 人間の投稿には Chappy が返信する
- ❌ **webhook(bot)投稿には Chappy が反応しない** ← ブロッカー
- 詳細: `docs/status-2026-03-01.md`

## Milestone 2: Mac単体・STT（押しボタン/手動トリガ）

目的: 音声入力（STT）の品質/遅延/コスト感を掴む。

- トリガ: キー入力/ショートカット等で録音開始→停止
- STT: ローカル or クラウド（どちらでもよい、比較する）
- LLM/実行: Milestone 1 と同じ
- DoD:
  - 音声→テキスト→OpenClaw実行が一連で動く

**現状 (2026-03-01):**
- ✅ Web Speech API (Chrome) で STT 動作確認済み
- ✅ HTTPS (Tailscale Serve) でマイクアクセス可能
- Milestone 1 のブロッカー解消待ち

## Milestone 3: Mac単体・wakeword常時待受（ローカル）

目的: 要件のコア（コスト最適化 + 会話分離）を満たす。

- 常時起動: wakeword + VAD（ローカル）
- Wakeword検出後のみ
  - 録音（VADで無音停止）
  - STT
  - LLM（got5.3）
  - OpenClaw実行
- DoD:
  - 人間同士の会話では反応せず、wakeword後のみ反応
  - 後段LLM呼び出し回数が wakeword で抑制できている（ログで確認）

## Milestone 4: Mac単体・音声出力（TTS）

目的: 「アレクサ的」体験に近づける。

- TTS: ローカル/クラウドどちらでも
- DoD:
  - 実行結果を音声で返せる（最低1ケース）

## Milestone 5: Androidへ段階移植（まずはUI/コントローラ）

目的: Androidを“操作/表示端末”として導入し、運用の形を作る。

- まずは Android を
  - 状態表示（待受/録音中/実行中）
  - 実行ログ閲覧
  - 手動トリガ（録音開始）
  のみに使う（マイク常時は後回し）
- DoD:
  - Androidから「実行開始」ができ、結果が表示できる

## Milestone 6: Androidのマイク/スピーカーで24h入出力（最終目標）

- Android側で wakeword 常時待受を成立させる
  - Termux 常駐、またはネイティブアプリ化
- DoD:
  - Android単体で 24h 入出力 + wakeword での会話分離が安定動作

## 直近で決めること（次の1歩）

- Milestone 1 の「最初の1タスク」を何にするか
  - 候補: Discordへ返信、Apple Reminders追加、天気取得、タイマー、など
- Milestone 2 の STT をどうするか（ローカル vs クラウド）
