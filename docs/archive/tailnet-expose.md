# Tailnet公開（wattageアプリと同じノリ）

- 更新日: 2026-03-01

## 結論

ローカルNodeの `voiceclaw` を Tailnet（Tailscale）上に公開するのは可能。
基本は **Tailscale Serve** を使って、`localhost:8788` を tailnet ホスト名で配る。

## 前提

- 対象マシンに Tailscale が入っていて tailnet に参加している
- `voiceclaw` がローカルで起動している（例: `http://127.0.0.1:8788/`）

## 手順（HTTPSで公開）

1) voiceclaw を起動（例）

```bash
HOST=127.0.0.1 PORT=8788 npm run dev
```

2) Tailscale Serve で公開

```bash
# 例: https://<machine-name>.<tailnet-name>.ts.net/ でアクセス可能になる
sudo tailscale serve --https=443 http://127.0.0.1:8788
```

3) 停止/解除

```bash
sudo tailscale serve reset
```

## 注意点

- Tailnet内の誰がアクセスできるかは Tailscale 側の ACL / device posture 次第。
- インターネット全体に出す（Funnel）は日曜大工MVPでは非推奨（やるなら別途検討）。
- ブラウザSTT/TTSは「HTTPS」前提で安定することが多いので、Serve(HTTPS)は相性が良い。
