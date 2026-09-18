# アトリエ かわぐっち

スムージーの原料を最大10種類選ぶと、**五大栄養素の五角形チャート**と、各大栄養素の**代表6栄養素の六角形チャート**で栄養バランスを見るウェブアプリです。イメージキャラクターはかわぐっちです。

## WEB公開

GitHub Pages で公開しています。

- リポジトリ: https://github.com/keiIna-lab/smoothie-atelier
- 公開URL: https://keiIna-lab.github.io/smoothie-atelier/

`main` ブランチへ push すると、GitHub Actions が Pages を更新します。

## できること

- フルーツ・野菜・ベース・プラス、こんにゃく5種から原料を選ぶ
- リストにない原料は「その他」で追加し、成分表と照合できる
- 投入量はグラムで数字入力
- レシピに名前をつけてブラウザへ最大100杯まで保存
- LINE / メール / Instagram / X / Facebook で共有

栄養値は日本食品標準成分表などを参考にした目安です。医療・栄養指導の代替ではありません。

## ローカルで開く

```bash
python -m http.server 8765
```

ブラウザで http://127.0.0.1:8765/ を開いてください。

## ファイル

| ファイル | 内容 |
|---|---|
| `index.html` | 画面とSEO用の説明 |
| `app.js` | 画面の動き |
| `data.js` | 原料と栄養データ |
| `styles.css` | デザイン |
| `img/` | かわぐっちの画像 |
| `llms.txt` | AI向けのアプリ説明 |
