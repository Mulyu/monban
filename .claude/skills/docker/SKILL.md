---
name: docker
description: Claude Code web 環境で Docker を起動・使用する。Docker、コンテナ、docker-compose、docker build に関する作業時に使用する。
allowed-tools: Bash(dockerd *) Bash(docker *) Bash(update-alternatives *)
---

# Claude Code web で Docker を使う

この環境ではカーネルの制限により、Docker デーモンをそのまま起動できない。以下の手順で回避する。

## 起動手順

```bash
# 1. iptables を legacy に切り替え（nftables は使えない）
update-alternatives --set iptables /usr/sbin/iptables-legacy
update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# 2. Docker デーモンをバックグラウンドで起動
dockerd --iptables=false --ip6tables=false --bridge=none --storage-driver=vfs &>/tmp/dockerd.log &

# 3. 起動を待って確認（5秒程度）
sleep 5
docker info
```

## 使い方の制約

### コンテナ実行

ブリッジネットワークは使えない。`--network host` または `--network none` を指定する。

```bash
# ネットワーク不要な場合
docker run --rm --network none alpine echo "hello"

# ホストのネットワークを使う場合
docker run --rm --network host alpine wget -qO- http://example.com
```

### イメージビルド

`docker build` は `--network host` が必要。

```bash
docker build --network host -t my-app .
```

### Docker Compose

`network_mode: host` を指定する。

```yaml
services:
  web:
    image: nginx:alpine
    network_mode: host
```

## できないこと

- **ポートマッピング**（`-p 8080:80`）— iptables/NAT が無効なため不可。`--network host` で直接バインドする
- **コンテナ間ブリッジ通信** — bridge ネットワークが無効。全サービスを host ネットワークで動かし、ポートで分ける
- **コンテナ内からの HTTPS** — SSL 証明書検証が失敗する（ホスト側プロキシの制限）
- **overlayfs** — vfs ドライバ使用のため、ディスク使用量が大きい
