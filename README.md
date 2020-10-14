# onyx_d
とりあえず動けばいい、自分用の[un-vector-tile-toolkit/onyx](https://github.com/un-vector-tile-toolkit/onyx)。
試作したmbtilesをとりあえず確認するときなどに。

## Setup

```
npm install

mkdir config
mkdir htdocs
mkdir mbtiles
mkdir log

vi config/default.hjson

vi app.js
```

* pm2、spdyは使わない。単に、Node.jsでhttp通信でmbtilesからタイルを配信する。(package.jsonはいじっていないので、npmでspdyは入ってくるが。)
* mbtilesから返されるpbfタイルはgzip圧縮されているので、`content-encoding: gzip`が必要。

## 元のレポジトリ

https://github.com/un-vector-tile-toolkit/onyx

## 参考文献

https://nodejs.org/ja/docs/guides/getting-started-guide/

