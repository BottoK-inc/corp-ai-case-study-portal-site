// scripts/build.js
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/cases.json');
const outPath  = path.join(__dirname, '../index.html');

if (!fs.existsSync(dataPath)) {
  console.error('data/cases.json が見つかりません');
  process.exit(1);
}

const { updatedAt, cases } = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const updatedJST = new Date(updatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

// JSON埋め込み（HTMLタグ・特殊文字をエスケープ）
const casesJSON = JSON.stringify(cases)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');

// HTMLテンプレートを別ファイルから読み込む
const templatePath = path.join(__dirname, '../template.html');
let html = fs.readFileSync(templatePath, 'utf8');

// プレースホルダーを置換
html = html.replace('__CASES_JSON__', casesJSON);
html = html.replace('__UPDATED_JST__', updatedJST);

fs.writeFileSync(outPath, html, 'utf8');
console.log(`index.html を生成しました（${cases.length}件, 更新: ${updatedJST}）`);
