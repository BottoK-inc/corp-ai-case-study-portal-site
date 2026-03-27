// scripts/fetch_notion.js
// NotionAPIからAI活用事例DBのデータを取得してdata/cases.jsonに保存する

const https = require('https');
const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DB_ID = process.env.NOTION_DB_ID || '3e4668ffa71e4d6d9bcc3f356588dbc3';

if (!NOTION_TOKEN) {
  console.error('❌ NOTION_TOKEN が設定されていません');
  process.exit(1);
}

function notionRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.notion.com',
      path,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return prop.title?.map(t => t.plain_text).join('') || '';
  if (prop.type === 'rich_text') return prop.rich_text?.map(t => t.plain_text).join('') || '';
  return '';
}

function pageToCase(page) {
  const p = page.properties;
  return {
    id: page.id,
    title: getText(p['タイトル']),
    desc: getText(p['概要']),
    category: p['カテゴリ']?.select?.name || 'その他',
    tags: p['タグ']?.multi_select?.map(t => t.name) || [],
    likes: p['いいね数']?.number || 0,
    slideUrl: p['スライドURL']?.url || '',
    thumbUrl: p['サムネイルURL']?.url || '',
    poster: getText(p['投稿者']),
    createdAt: page.created_time,
    notionUrl: page.url,
  };
}

async function fetchAll() {
  console.log('📥 Notionからデータ取得中...');
  let allPages = [];
  let cursor = undefined;

  while (true) {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await notionRequest(`/v1/databases/${NOTION_DB_ID}/query`, body);

    if (res.object === 'error') {
      throw new Error(`Notion API Error: ${res.message}`);
    }

    allPages = allPages.concat(res.results);
    if (!res.has_more) break;
    cursor = res.next_cursor;
  }

  console.log(`✅ ${allPages.length}件取得`);
  return allPages.map(pageToCase);
}

(async () => {
  try {
    const cases = await fetchAll();

    const outDir = path.join(__dirname, '../data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const outPath = path.join(outDir, 'cases.json');
    fs.writeFileSync(outPath, JSON.stringify({
      updatedAt: new Date().toISOString(),
      cases,
    }, null, 2));

    console.log(`💾 data/cases.json に保存しました（${cases.length}件）`);
  } catch (e) {
    console.error('❌ エラー:', e.message);
    process.exit(1);
  }
})();
