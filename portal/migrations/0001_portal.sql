CREATE TABLE accounts (
  email TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('member', 'board')),
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'declined', 'withdrawn')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewer TEXT
);

CREATE INDEX submissions_author ON submissions (author, created_at DESC);

CREATE TABLE publications (
  kind TEXT NOT NULL CHECK (kind IN ('event', 'project', 'profile')),
  id TEXT NOT NULL,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  revision INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL,
  PRIMARY KEY (kind, id)
);
