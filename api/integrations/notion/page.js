const {
  env,
  json,
  idFromInput,
  requireIntegrationAccess,
  upstreamJson,
} = require('../../_lib/integration');

const NOTION_API = 'https://api.notion.com/v1';

function pageIdFromInput(value) {
  const input = String(value || '').trim();
  const compactId = input.match(/[0-9a-f]{32}/i);
  return compactId ? compactId[0] : idFromInput(input);
}

function notionHeaders(token) {
  return {
    Authorization: 'Bearer ' + token,
    'Notion-Version': env('NOTION_VERSION') || '2026-03-11',
    'Content-Type': 'application/json',
  };
}

function blockText(block) {
  const value = block && block[block.type];
  const richText = value && Array.isArray(value.rich_text) ? value.rich_text : [];
  return richText.map((item) => item.plain_text || (item.text && item.text.content) || '').join('');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'GET only' });
  if (!await requireIntegrationAccess(req, res)) return;

  const token = env('NOTION_TOKEN');
  if (!token) return json(res, 503, { ok: false, error: 'NOTION_TOKEN 미설정' });

  const pageId = pageIdFromInput(req.query && (req.query.pageId || req.query.page));
  if (!pageId) return json(res, 400, { ok: false, error: 'pageId 필요' });

  const headers = notionHeaders(token);

  try {
    const page = await upstreamJson(
      NOTION_API + '/pages/' + encodeURIComponent(pageId),
      { headers }
    );
    const children = await upstreamJson(
      NOTION_API + '/blocks/' + encodeURIComponent(pageId) + '/children?page_size=100',
      { headers }
    );

    const blocks = (children.results || []).map((block) => ({
      id: block.id,
      type: block.type,
      text: blockText(block),
      has_children: Boolean(block.has_children),
    }));

    return json(res, 200, {
      ok: true,
      source: 'notion',
      page: page,
      blocks,
      has_more: Boolean(children.has_more),
      next_cursor: children.next_cursor || null,
    });
  } catch (error) {
    console.error('[integrations/notion/page]', error);
    return json(res, error.status === 401 || error.status === 403 ? error.status : 502, {
      ok: false,
      error: error.message || 'Notion API 호출 실패',
    });
  }
};
