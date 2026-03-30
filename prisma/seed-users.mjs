import { createClient } from '@libsql/client';

async function seedUsers() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("❌ Missing DATABASE_URL or DATABASE_AUTH_TOKEN");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  try {
    console.log(`🔌 Connecting to Turso for seeding: ${url}`);

    const users = [
      {
        id: "admin-lester",
        email: "lester.alarcon@mobileoptima.com",
        name: "Lester Alarcon",
        role: "admin",
        isSuperAdmin: 1, // LibSQL uses 1/0 for boolean
        status: "approved"
      },
      {
        id: "dev-admin",
        email: "admin@cst.com",
        name: "Dev Admin",
        role: "admin",
        isSuperAdmin: 0,
        status: "approved"
      }
    ];

    for (const user of users) {
      console.log(`👤 Seeding user: ${user.email}`);
      await client.execute({
        sql: `INSERT OR REPLACE INTO "User" (id, email, name, role, isSuperAdmin, status) 
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [user.id, user.email, user.name, user.role, user.isSuperAdmin, user.status]
      });
    }

    console.log("✅ Admin users seeded successfully!");
    
    // Final check
    const result = await client.execute("SELECT email, role, status FROM User");
    console.log("📊 Current Users in Turso:");
    console.table(result.rows);

  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    client.close();
  }
}

seedUsers();
