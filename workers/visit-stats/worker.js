// Cloudflare Worker: public weekly visit counts for neuralmasteryai.com.
//
// The homepage can't query Cloudflare Web Analytics itself, because the
// GraphQL API needs a secret API token. This Worker holds that token,
// asks for the last 7 days of visits and page views, caches the answer
// for 15 minutes, and returns only the two numbers:
//
//   GET /  ->  { "visits": 312, "pageViews": 1045, "since": "2026-10-14T..." }
//
// Deploy: `npx wrangler@4 deploy` from this folder (wrangler.toml).
// Secret: CF_API_TOKEN, an API token with "Account Analytics: Read".

const ACCOUNT_TAG = 'a7b10a5a17a521687023643e4d8bd20d';
const SITE_TAG = '2a65f3cfd5ca4d6fbb93c07828dc317e';
const CACHE_SECONDS = 15 * 60;
const ALLOWED_ORIGINS = ['https://neuralmasteryai.com', 'http://localhost:5173', 'http://localhost:4173'];

const QUERY = `query ($account: String!, $site: String!, $since: Time!, $until: Time!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      rumPageloadEventsAdaptiveGroups(
        limit: 1
        filter: { siteTag: $site, datetime_geq: $since, datetime_leq: $until, bot: 0 }
      ) {
        count
        sum { visits }
      }
    }
  }
}`;

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Vary': 'Origin',
  };
}

async function fetchCounts(token) {
  const until = new Date();
  const since = new Date(until.getTime() - 7 * 24 * 60 * 60 * 1000);
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { account: ACCOUNT_TAG, site: SITE_TAG, since: since.toISOString(), until: until.toISOString() },
    }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) throw new Error(JSON.stringify(body.errors ?? res.status));
  const group = body.data.viewer.accounts[0]?.rumPageloadEventsAdaptiveGroups[0];
  return { visits: group?.sum.visits ?? 0, pageViews: group?.count ?? 0, since: since.toISOString() };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(request) });

    const cache = caches.default;
    const cacheKey = new Request(new URL('/weekly', request.url).toString());
    let response = await cache.match(cacheKey);
    if (!response) {
      try {
        const counts = await fetchCounts(env.CF_API_TOKEN);
        response = new Response(JSON.stringify(counts), {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
        });
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      } catch (err) {
        return new Response(JSON.stringify({ error: 'unavailable' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
        });
      }
    }
    const out = new Response(response.body, response);
    for (const [k, v] of Object.entries(corsHeaders(request))) out.headers.set(k, v);
    return out;
  },
};
