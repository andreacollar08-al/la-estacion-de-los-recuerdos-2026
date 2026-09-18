CREATE TABLE IF NOT EXISTS payment_reservations (
  reference TEXT PRIMARY KEY,
  request_key TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  state TEXT NOT NULL,
  session_id TEXT UNIQUE,
  expires_at INTEGER NOT NULL,
  data TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS occupied_payment_slot
  ON payment_reservations(date, time) WHERE state IN ('held', 'processing', 'paid');
CREATE TABLE IF NOT EXISTS payment_released_slots (
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  PRIMARY KEY (date, time)
);
CREATE TABLE IF NOT EXISTS processed_stripe_events (
  id TEXT PRIMARY KEY,
  processed_at INTEGER NOT NULL
);
