const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function openDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

function ensureMigrationsTable(db) {
  db.exec(
    `CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`
  );
}

function applyMigrations(db) {
  ensureMigrationsTable(db);
  const applied = new Set(
    db.prepare('SELECT name FROM migrations').all().map((row) => row.name)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const insertMigration = db.prepare(
    'INSERT INTO migrations (name) VALUES (?)'
  );

  db.transaction(() => {
    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      db.exec(sql);
      insertMigration.run(file);
    }
  })();
}

module.exports = {
  openDatabase,
  applyMigrations,
};
