import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://cst-flow-juanlohika.aws-ap-northeast-1.turso.io',
});

async function main() {
  console.log('--- STARTING MANUAL DB SYNC ---');
  
  const tables = [
    `CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      emailVerified DATETIME,
      image TEXT,
      role TEXT DEFAULT 'user',
      isSuperAdmin BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'pending',
      profileRole TEXT,
      inviteToken TEXT,
      invitedBy TEXT,
      invitedAt DATETIME,
      canAccessArchitect BOOLEAN DEFAULT 0,
      canAccessBRD BOOLEAN DEFAULT 0,
      canAccessTimeline BOOLEAN DEFAULT 0,
      canAccessTasks BOOLEAN DEFAULT 1,
      canAccessCalendar BOOLEAN DEFAULT 1,
      canAccessMeetings BOOLEAN DEFAULT 0,
      canAccessAccounts BOOLEAN DEFAULT 0,
      canAccessSolutions BOOLEAN DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS Account (
      id TEXT PRIMARY KEY,
      userId TEXT,
      type TEXT,
      provider TEXT,
      providerAccountId TEXT,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS Session (
      id TEXT PRIMARY KEY,
      sessionToken TEXT UNIQUE,
      userId TEXT,
      expires DATETIME,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )`
  ];

  for (const sql of tables) {
    console.log(`Executing check for table...`);
    await client.execute(sql);
  }

  console.log('--- DATABASE TABLES INITIALIZED ---');
}

main().catch(console.error);
