import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

async function forceSync() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  const client = createClient({ url, authToken });

  try {
    console.log(`🔌 Initializing Turso: ${url}`);
    
    // 1. Core Auth Tables (Guarantee these exist for login)
    const coreSql = `
      CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT,
          "email" TEXT UNIQUE,
          "emailVerified" DATETIME,
          "image" TEXT,
          "role" TEXT NOT NULL DEFAULT 'user',
          "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
          "status" TEXT NOT NULL DEFAULT 'pending'
      );
      CREATE TABLE IF NOT EXISTS "Account" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "provider" TEXT NOT NULL,
          "providerAccountId" TEXT NOT NULL,
          "refresh_token" TEXT,
          "access_token" TEXT,
          "expires_at" INTEGER,
          "token_type" TEXT,
          "scope" TEXT,
          "id_token" TEXT,
          "session_state" TEXT,
          CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionToken" TEXT NOT NULL UNIQUE,
          "userId" TEXT NOT NULL,
          "expires" DATETIME NOT NULL,
          CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `;

    console.log("🛠️ Creating Core Auth tables...");
    const coreStatements = coreSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of coreStatements) {
      await client.execute(stmt);
    }

    // 2. Load the rest of the schema from migration file
    const sqlPath = path.join(process.cwd(), 'prisma/migrations/20260326170928_init_tarkie_models/migration.sql');
    if (fs.existsSync(sqlPath)) {
      console.log("migration.sql found. Executing full schema...");
      const fullSql = fs.readFileSync(sqlPath, 'utf8');
      const statements = fullSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        try {
          await client.execute(stmt);
        } catch (e) {
          // Ignore if already exists
        }
      }
    }

    console.log("🕵️ Verification...");
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("📊 Tables now in DB:", tables.rows.map(r => r.name).join(", "));

    const users = await client.execute("SELECT count(*) as count FROM User;");
    console.log(`👤 Initial User Count: ${users.rows[0].count}`);

    console.log("✅ Turso is now synchronized and ready for login.");
  } catch (err) {
    console.error("❌ Sync Error:", err);
  } finally {
    client.close();
  }
}

forceSync();
