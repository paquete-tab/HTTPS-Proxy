# HTTPS Proxy

## 概要

SSL化されたWebアプリケーション内から、SSL化されていないサーバのAPIにアクセスする際に使用するプロキシです。

## 使用方法

1. Cloudflare WorkersにHTTPS Proxyをデプロイ
1. 環境変数`API_ENDPOINT`にアクセスしたいAPIのエンドポイントを登録します
2. WorkersのURL`https://example.username.workers.dev/`をAPIのエンドポイントとして使用できます
