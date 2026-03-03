# voiceclaw アーキテクチャ（現状）

## ラダーチャート: ウェイクワード → 回答再生

```mermaid
sequenceDiagram
    participant B as 🌐 Browser
    participant V as 📡 voiceclaw server<br/>:8788
    participant G as 🤖 OpenClaw GW<br/>:18789
    participant T as 🔊 VOICEVOX<br/>:50021

    Note over B: ① STT待受 (Web Speech API, ja-JP)
    Note over B: ② ウェイクワード「アリス」検出
    Note over B: コマンド音声入力 → isFinal=true

    B->>V: ③ POST /api/chat-stream<br/>{messages: [...history]}

    V->>G: ④ POST /v1/chat/completions<br/>stream:true + 🔑 Bearer TOKEN

    loop トークン単位
        G-->>V: ⑤ SSE delta chunk
    end

    Note over V: ⑥ 文境界検出<br/>textBuf蓄積 → 。！？!? で分割

    loop 文ごとにパイプライン
        V-->>B: ⑦ SSE {sentence:"こんにちは！"}

        B->>V: ⑧ POST /api/tts {text}

        V->>T: ⑨ POST /audio_query
        T-->>V: query JSON
        V->>T: POST /synthesis
        T-->>V: WAV binary

        V-->>B: ⑩ audio/wav

        Note over B: ⑪ AudioContext再生<br/>(再生中に次文のTTSを先行fetch)
    end

    Note over B: ⑫ 全文再生完了 → ウェイクワード待受に戻る
```

## コンポーネント

| コンポーネント | ポート | 役割 |
|---|---|---|
| Browser | - | STT (Web Speech API) + TTS再生 (Web Audio) + UI |
| voiceclaw server | :8788 | リレー + 文境界検出 + VOICEVOX proxy |
| OpenClaw Gateway | :18789 | LLM呼び出し + セッション管理 |
| VOICEVOX | :50021 | 日本語音声合成 |

## 秘密情報

| 変数 | 必要性 | 備考 |
|---|---|---|
| OPENCLAW_GATEWAY_TOKEN | **現在必要** | → openclaw.json自動読み取りで除去予定 |
| DISCORD_BOT_TOKEN | 不要（レガシー） | Discord経由は廃止済み |
| DISCORD_WEBHOOK_URL | 不要（レガシー） | 同上 |
