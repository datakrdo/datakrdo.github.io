# Site analytics

Cloudflare Worker + D1 (SQLite, free plan). `app.js` sends events with `navigator.sendBeacon`; `worker.js` stores them.
No IP is stored. Your own visits: open `/?notrack` once in each browser (`/?track` undoes it).

```bash
cd analytics
npx wrangler login
npx wrangler d1 create datakrdo-analytics        # paste database_id into wrangler.toml
npx wrangler d1 execute datakrdo-analytics --remote --file schema.sql
npx wrangler deploy                              # prints the *.workers.dev URL -> BEACON in app.js
```

Query / export:

```bash
npx wrangler d1 execute datakrdo-analytics --remote --json --command \
  "SELECT org, country, COUNT(DISTINCT vid) visitors FROM events WHERE type='view' AND bot=0 GROUP BY 1,2 ORDER BY 3 DESC"
npx wrangler d1 export datakrdo-analytics --remote --output events.sql
```

Time per section: `SELECT key, SUM(value)/1000 s FROM events, json_each(props) WHERE events.type='dwell' AND bot=0 GROUP BY key ORDER BY s DESC`.
