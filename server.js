const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new Database(path.join(__dirname, 'data', 'events.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dept TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT,
    target TEXT,
    status TEXT DEFAULT '籌備中',
    note TEXT
  )
`);

app.use(express.json());
app.use(express.static('public'));

// GET all events
app.get('/api/events', (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY date').all();
  res.json(events);
});

// POST new event
app.post('/api/events', (req, res) => {
  const { id, name, dept, date, type, target, status, note } = req.body;
  const stmt = db.prepare(
    'INSERT INTO events (id, name, dept, date, type, target, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, name, dept, date, type || '', target || '', status || '籌備中', note || '');
  res.json({ ok: true });
});

// PUT update event
app.put('/api/events/:id', (req, res) => {
  const { name, dept, date, type, target, status, note } = req.body;
  const stmt = db.prepare(
    'UPDATE events SET name=?, dept=?, date=?, type=?, target=?, status=?, note=? WHERE id=?'
  );
  stmt.run(name, dept, date, type || '', target || '', status || '籌備中', note || '', req.params.id);
  res.json({ ok: true });
});

// DELETE event
app.delete('/api/events/:id', (req, res) => {
  db.prepare('DELETE FROM events WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// POST import (bulk)
app.post('/api/events/import', (req, res) => {
  const { events: imported, mode } = req.body;
  if (mode === 'overwrite') {
    db.prepare('DELETE FROM events').run();
  }
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO events (id, name, dept, date, type, target, status, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertMany = db.transaction((items) => {
    for (const e of items) {
      stmt.run(e.id, e.name, e.dept, e.date, e.type || '', e.target || '', e.status || '籌備中', e.note || '');
    }
  });
  insertMany(imported);
  const count = db.prepare('SELECT COUNT(*) as c FROM events').get().c;
  res.json({ ok: true, count });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
