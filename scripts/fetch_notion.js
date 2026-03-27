// scripts/fetch_notion.js
// NotionAPIからデータ取得 → サムネイルURL自動補完（書き戻しなし）→ cases.json保存

const https = require('https');
const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DB_ID = process.env.NOTION_DB_ID;

if (!NOTION_TOKEN) {
  console.error('NOTION_TOKEN が設定されていません');
  process.exit(1);
}
if (!NOTION_DB_ID) {
  console.error('NOTION_DB_ID が設定されていません');
  process.exit(1);
}

function notionRequest(method, reqPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'api.notion.com',
      path: reqPath,
      method,
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let buf = '';
      res.on('data', chunk => buf += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// スライドURL → サムネイルURL 変換（ビルド時のみ、Notionへの書き戻しはしない）
function slideUrlToThumb(slideUrl) {
  if (!slideUrl) return '';
  const match = slideUrl.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return '';
  return `https://docs.google.com/presentation/d/${match[1]}/export/png?pageid=p`;
}

function getText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return prop.title?.map(t => t.plain_text).join('') || '';
  if (prop.type === 'rich_text') return prop.rich_text?.map(t => t.plain_text).join('') || '';
  return '';
}

function pageToCase(page) {
  const p = page.properties;
  const slideUrl = p['スライドURL']?.url || '';
  const thumbUrl = p['サムネイルURL']?.url || slideUrlToThumb(slideUrl);
  return {
    id: page.id,
    title: getText(p['タイトル']),
    desc: getText(p['概要']),
    category: p['カテゴリ']?.select?.name || 'その他',
    tags: p['タグ']?.multi_select?.map(t => t.name) || [],
    likes: p['いいね数']?.number || 0,
    slideUrl,
    thumbUrl,
    poster: getText(p['投稿者']),
    createdAt: page.created_time,
    notionUrl: page.url,
  };
}

async function fetchAll() {
  console.log('Notionからデータ取得中...');
  let allPages = [];
  let cursor = undefined;
  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionRequest('POST', `/v1/databases/${NOTION_DB_ID}/query`, body);
    if (res.object === 'error') throw new Error(`Notion API Error: ${res.message}`);
    allPages = allPages.concat(res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }
  console.log(`${allPages.length}件取得`);
  return allPages;
}

(async () => {
  try {
    const pages = await fetchAll();
    const cases = pages.map(pageToCase);

    const outDir = path.join(__dirname, '../data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'cases.json');
    fs.writeFileSync(outPath, JSON.stringify({ updatedAt: new Date().toISOString(), cases }, null, 2));
    console.log(`data/cases.json に保存しました（${cases.length}件）`);

  } catch (e) {
    console.error('エラー:', e.message);
    process.exit(1);
  }
})();
