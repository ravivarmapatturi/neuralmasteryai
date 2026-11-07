// Cloudflare Worker: a visit counter for neuralmasteryai.com.
//
//   POST /hit   body "1" for the first page of a browser session, "0" after.
//               Adds one page view, and one visit when the body is "1".
//   GET  /      { "visits": 312, "pageViews": 1045, "todayVisits": 40, "todayViews": 150, "days": 7 }
//               (the last 7 days, and today in UTC).
//   POST /topic body "deep-learning": one view of that topic, per day in topic_daily.
//   GET  /topics  { "days": 30, "topics": [{ "topic": "deep-learning", "views": 120 }, ...] }
//   POST /error   body JSON { "message": "...", "route": "/labs" }: one client
//               error, counted per day, message and route in client_errors.
//               Read with: npx wrangler@4 d1 execute visit-stats --remote
//                 --command "SELECT * FROM client_errors ORDER BY day DESC, count DESC LIMIT 50"
//
// It stores daily totals only (day, visits, views; views per topic; error
// messages with their route) in the D1 database
// bound as DB (schema.sql). There are no cookies, IPs or user agents, and
// nothing per visitor. Anyone could post fake hits, which is acceptable for
// a public "people visited this week" line. Cloudflare Web Analytics, loaded
// separately, has the detailed view.
//
// Deploy from this folder: `npx wrangler@4 deploy`.

const ALLOWED_ORIGINS = ['https://neuralmasteryai.com'];
const CACHE_SECONDS = 30;
const TOPIC = /^[a-z0-9-]{1,60}$/;

function cors(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST',
    'Vary': 'Origin',
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function hit(request, env) {
  // Browsers send the page's origin; refusing other origins stops casual
  // inflation from other sites (not a determined script, see above).
  if (!ALLOWED_ORIGINS.includes(request.headers.get('Origin'))) return new Response(null, { status: 403 });
  const isNewVisit = (await request.text()).trim() === '1' ? 1 : 0;
  await env.DB.prepare(
    'INSERT INTO daily (day, visits, views) VALUES (?1, ?2, 1) ' +
      'ON CONFLICT(day) DO UPDATE SET visits = visits + ?2, views = views + 1',
  ).bind(today(), isNewVisit).run();
  return new Response(null, { status: 204, headers: cors(request) });
}

async function topicView(request, env) {
  if (!ALLOWED_ORIGINS.includes(request.headers.get('Origin'))) return new Response(null, { status: 403 });
  const topic = (await request.text()).trim();
  if (!TOPIC.test(topic)) return new Response(null, { status: 400 });
  await env.DB.prepare('INSERT INTO topic_daily (day, topic, views) VALUES (?1, ?2, 1) ON CONFLICT(day, topic) DO UPDATE SET views = views + 1')
    .bind(today(), topic)
    .run();
  return new Response(null, { status: 204, headers: cors(request) });
}

async function clientError(request, env) {
  if (!ALLOWED_ORIGINS.includes(request.headers.get('Origin'))) return new Response(null, { status: 403 });
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const message = String(body.message ?? '').slice(0, 300);
  const route = String(body.route ?? '').slice(0, 200);
  if (!message) return new Response(null, { status: 400 });
  await env.DB.prepare(
    'INSERT INTO client_errors (day, message, route, count) VALUES (?1, ?2, ?3, 1) ' +
      'ON CONFLICT(day, message, route) DO UPDATE SET count = count + 1',
  ).bind(today(), message, route).run();
  return new Response(null, { status: 204, headers: cors(request) });
}

async function topics(request, env) {
  const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(
    'SELECT topic, SUM(views) AS views FROM topic_daily WHERE day >= ?1 GROUP BY topic ORDER BY views DESC LIMIT 100',
  ).bind(since).all();
  return new Response(JSON.stringify({ days: 30, topics: results }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', ...cors(request) },
  });
}

async function weekly(request, env, ctx) {
  const cache = caches.default;
  const key = new Request(new URL('/stats-v2', request.url).toString());
  let response = await cache.match(key);
  if (!response) {
    const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const row = await env.DB.prepare(
      'SELECT COALESCE(SUM(visits), 0) AS visits, COALESCE(SUM(views), 0) AS views, ' +
        'COALESCE(SUM(CASE WHEN day = ?2 THEN visits END), 0) AS todayVisits, ' +
        'COALESCE(SUM(CASE WHEN day = ?2 THEN views END), 0) AS todayViews FROM daily WHERE day >= ?1',
    )
      .bind(since, today())
      .first();
    const body = { visits: row.visits, pageViews: row.views, todayVisits: row.todayVisits, todayViews: row.todayViews, days: 7 };
    response = new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
    });
    ctx.waitUntil(cache.put(key, response.clone()));
  }
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(cors(request))) out.headers.set(k, v);
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors(request) });
    try {
      if (request.method === 'POST' && url.pathname === '/hit') return await hit(request, env);
      if (request.method === 'POST' && url.pathname === '/topic') return await topicView(request, env);
      if (request.method === 'POST' && url.pathname === '/error') return await clientError(request, env);
      if (request.method === 'GET' && url.pathname === '/topics') return await topics(request, env);
      if (request.method === 'GET' && url.pathname === '/') return await weekly(request, env, ctx);
    } catch (err) {
      return new Response(JSON.stringify({ error: 'unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...cors(request) },
      });
    }
    return new Response('Not found', { status: 404 });
  },
};
