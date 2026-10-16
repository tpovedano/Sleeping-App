// Crea la tabla en Neon: DATABASE_URL=... npm run db:migrate
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Falta DATABASE_URL");
  process.exit(1);
}
const sql = neon(url);
const statements = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
for (const statement of statements) await sql.query(statement);
console.log("Esquema aplicado ✔");
