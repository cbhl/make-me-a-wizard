CREATE TABLE IF NOT EXISTS Photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  create_timestamp DATETIME,
  update_timestamp DATETIME,
  publish_timestamp DATETIME,
  moderated_timestamp DATETIME,
  original_r2_object_path TEXT,
  original_r2_url TEXT,
  phase1_replicate_prediction TEXT,
  phase1_replicate_url TEXT,
  phase1_r2_object_path TEXT,
  phase1_r2_url TEXT,
  phase2_replicate_prediction TEXT,
  phase2_replicate_url TEXT,
  phase2_r2_object_path TEXT,
  phase2_r2_url TEXT,
  phase3_replicate_prediction TEXT,
  phase3_replicate_url TEXT,
  phase3_r2_object_path TEXT,
  phase3_r2_url TEXT,
  is_public BOOLEAN,
  is_moderated BOOLEAN
);

CREATE TABLE IF NOT EXISTS PhotoFaceSwapComparisons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL,
  model TEXT NOT NULL,
  prediction TEXT,
  replicate_url TEXT,
  r2_object_path TEXT,
  r2_url TEXT,
  status TEXT NOT NULL,
  error TEXT,
  create_timestamp DATETIME NOT NULL,
  update_timestamp DATETIME NOT NULL
);
