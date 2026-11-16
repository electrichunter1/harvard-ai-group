CREATE INDEX submissions_pending_queue ON submissions (created_at, id) WHERE status = 'pending';
CREATE INDEX publications_feed ON publications (kind, updated_at, id);
