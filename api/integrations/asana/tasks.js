const {
  env,
  json,
  idFromInput,
  requireIntegrationAccess,
  readJsonBody,
  upstreamJson,
} = require('../../_lib/integration');

const ASANA_API = 'https://app.asana.com/api/1.0';

function projectIdFromInput(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  try {
    const parts = new URL(input).pathname.split('/').filter(Boolean);
    const numeric = parts.find((part) => /^\d{8,}$/.test(part));
    return numeric || parts[parts.length - 1] || input;
  } catch {
    return idFromInput(input);
  }
}

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'GET 또는 POST only' });
  if (!await requireIntegrationAccess(req, res)) return;

  const token = env('ASANA_TOKEN_BOT');
  if (!token) return json(res, 503, { ok: false, error: 'ASANA_TOKEN_BOT 미설정' });

  const projectGid = projectIdFromInput(req.query && (req.query.projectGid || req.query.project));
  if (!projectGid) return json(res, 400, { ok: false, error: 'projectGid 필요' });

  const headers = {
    Authorization: 'Bearer ' + token,
    Accept: 'application/json',
  };

  try {
    const project = await upstreamJson(
      ASANA_API + '/projects/' + encodeURIComponent(projectGid) +
      '?opt_fields=gid,name,workspace.name,permalink_url',
      { headers }
    );
    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const name = String(body.name || '').trim();
      if (!name) return json(res, 400, { ok: false, error: 'task name 필요' });
      const created = await upstreamJson(ASANA_API + '/tasks', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            name,
            projects: [projectGid],
            notes: String(body.notes || 'AX 워크북 실습에서 생성'),
            ...(body.dueOn ? { due_on: String(body.dueOn) } : {}),
          },
        }),
      });
      return json(res, 201, { ok: true, source: 'asana', project: project.data || null, task: created.data || null });
    }

    const tasks = await upstreamJson(
      ASANA_API + '/projects/' + encodeURIComponent(projectGid) +
      '/tasks?limit=3&opt_fields=gid,name,assignee.name,due_on,completed,permalink_url',
      { headers }
    );

    return json(res, 200, {
      ok: true,
      source: 'asana',
      project: project.data || null,
      tasks: tasks.data || [],
    });
  } catch (error) {
    console.error('[integrations/asana/tasks]', error);
    return json(res, error.status === 401 || error.status === 403 ? error.status : 502, {
      ok: false,
      error: error.message || 'Asana API 호출 실패',
    });
  }
};
