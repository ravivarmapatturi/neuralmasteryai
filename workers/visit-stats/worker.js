// Cloudflare Worker: a visit counter for neuralmasteryai.com.
//
//   POST /hit   body "1" for the first page of a browser session, "0" after.
//               Adds one page view, and one visit when the body is "1".
//   GET  /      { "visits": 312, "pageViews": 1045, "days": 7 } for the last 7 days.
//
// It stores daily totals only (day, visits, views) in the D1 database
// bound as DB (schema.sql). There are no cookies, IPs or user agents, and
// nothing per visitor. Anyone could post fake hits, which is acceptable for
// a public "people visited this week" line. Cloudflare Web Analytics, loaded
// separately, has the detailed view.
//
// Deploy from this folder: `npx wrangler@4 deploy`.

const ALLOWED_ORIGINS = ['https://neuralmasteryai.com'];
const CACHE_SECONDS = 300;

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

async function weekly(request, env, ctx) {
  const cache = caches.default;
  const key = new Request(new URL('/weekly', request.url).toString());
  let response = await cache.match(key);
  if (!response) {
    const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const row = await env.DB.prepare('SELECT COALESCE(SUM(visits), 0) AS visits, COALESCE(SUM(views), 0) AS views FROM daily WHERE day >= ?1')
      .bind(since)
      .first();
    response = new Response(JSON.stringify({ visits: row.visits, pageViews: row.views, days: 7 }), {
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
