const { createClient } = require("@libsql/client");

const url = "libsql://cst-flow-juanlohika.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzQ4Njk5NzIsImlkIjoiMDE5ZDNjYjktNmYwMS03YTgwLWJmMGMtODZkNjk5ZmRkOGZmIiwicmlkIjoiZjRhM2E2ZmUtMjEyMS00MTI4LWJjMmQtMWMxMDE0YjE2NDlkIn0.gkkigRIP7XWO5XPb5hV4nnI-51sIoyHYneeGP06tXCG30bmEPjT2AhCg0HpFUY5LSMKQDya_EuC2S22g-7b8AA";

async function migrate() {
    const client = createClient({ url, authToken });
    
    try {
        console.log("⚡ Starting Padding & Share Migration...");

        // 1. Projects Table
        await client.execute("ALTER TABLE Project ADD COLUMN defaultPaddingDays INTEGER DEFAULT 3");
        console.log("✅ Column 'defaultPaddingDays' added to Project.");
        
        await client.execute("ALTER TABLE Project ADD COLUMN shareToken TEXT");
        console.log("✅ Column 'shareToken' added to Project.");

        // 2. TimelineItem Table
        await client.execute("ALTER TABLE TimelineItem ADD COLUMN paddingDays INTEGER");
        console.log("✅ Column 'paddingDays' added to TimelineItem.");
        
        await client.execute("ALTER TABLE TimelineItem ADD COLUMN externalPlannedEnd TEXT");
        console.log("✅ Column 'externalPlannedEnd' added to TimelineItem.");

        console.log("\n🚀 Migration successful.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error.message);
        process.exit(1);
    }
}

migrate();
