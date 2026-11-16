CREATE TABLE accounts_next (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('member', 'board', 'manager', 'fellow')),
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO accounts_next (email, role, added_at) SELECT email, role, added_at FROM accounts;
DROP TABLE accounts;
ALTER TABLE accounts_next RENAME TO accounts;

CREATE TABLE site_copy (
  area TEXT PRIMARY KEY,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  revision INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE submissions_next (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  scope TEXT NOT NULL DEFAULT 'website' CHECK (scope IN ('website', 'fellowship')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'approved', 'declined', 'withdrawn')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewer TEXT
);

INSERT INTO submissions_next (id, author, payload, status, created_at, reviewed_at, reviewer)
  SELECT id, author, payload, status, created_at, reviewed_at, reviewer FROM submissions;
DROP TABLE submissions;
ALTER TABLE submissions_next RENAME TO submissions;

CREATE INDEX submissions_author ON submissions (author, created_at DESC);
CREATE INDEX submissions_pending_queue ON submissions (scope, created_at, id) WHERE status = 'pending';
