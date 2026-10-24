// Exécute UNE requête du challenge NetSphère sur une base jetable, dans un
// processus séparé : le serveur peut le tuer si la requête est trop lourde.
// Entrée : la requête sur stdin. Sortie : JSON { columns, rows } ou { error }.
const Database = require("better-sqlite3");
const { createHash } = require("node:crypto");

const MAX_ROWS = 50;
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

let query = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (query += c));
process.stdin.on("end", () => {
  const db = new Database(":memory:");
  db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT);
    CREATE TABLE table_super_secrete (id INTEGER PRIMARY KEY, key TEXT, value TEXT);
  `);
  db.prepare("INSERT INTO users (username, password) VALUES (?, ?), (?, ?)").run(
    "user1", sha256("password1"), "admin", sha256("secret123"),
  );
  db.prepare("INSERT INTO table_super_secrete (key, value) VALUES (?, ?), (?, ?)").run(
    "api_key_super_secrete", process.env.NETSPHERE_SECRET, "mwehehe", "hee hee hee haa",
  );

  let out;
  try {
    const stmt = db.prepare(query);
    if (!stmt.reader) {
      out = { refused: true };
    } else {
      const columns = stmt.columns().map((c) => c.name);
      const rows = [];
      for (const r of stmt.raw(true).iterate()) {
        rows.push(r.map((v) => String(v)));
        if (rows.length >= MAX_ROWS) break;
      }
      out = { columns, rows };
    }
  } catch (e) {
    out = { error: e && e.message ? e.message : String(e) };
  }
  process.stdout.write(JSON.stringify(out));
});
