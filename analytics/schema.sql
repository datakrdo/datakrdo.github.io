CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,          -- ms epoch (client clock)
  vid TEXT, sid TEXT,           -- visitor (localStorage) / session (sessionStorage)
  type TEXT NOT NULL, name TEXT, props TEXT,
  path TEXT, hash TEXT, referrer TEXT, utm TEXT,
  lang TEXT, theme TEXT, vw INTEGER, vh INTEGER, ua TEXT,
  country TEXT, region TEXT, city TEXT, tz TEXT, asn INTEGER, org TEXT,
  bot INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS events_ts ON events (ts);
CREATE INDEX IF NOT EXISTS events_vid ON events (vid);
CREATE INDEX IF NOT EXISTS events_org ON events (org);
