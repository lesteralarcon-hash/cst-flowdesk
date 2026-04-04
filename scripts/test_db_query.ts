import { db } from "./src/db";
import { projects as projectsTable, timelineTemplates as timelineTemplatesTable } from "./src/db/schema";
import { eq, desc, or, like } from "drizzle-orm";

async function testQuery() {
    try {
        console.log("Testing Drizzle Query for Projects...");
        const userId = "test-user-id";
        const userRole = "admin";
        const isAdmin = (userRole?.toLowerCase() === "admin");
        
        let whereClause = undefined;
        if (!isAdmin) {
           whereClause = or(
             eq(projectsTable.userId, userId),
             like(projectsTable.assignedIds, `%${userId}%`)
           );
        }

        const data = await db.select({
            id: projectsTable.id,
            name: projectsTable.name,
        })
        .from(projectsTable)
        .leftJoin(timelineTemplatesTable, eq(projectsTable.templateId, timelineTemplatesTable.id))
        .where(whereClause)
        .limit(5);

        console.log("Query Successful! Results count:", data.length);
        process.exit(0);
    } catch (error) {
        console.error("Query Failed:", error);
        process.exit(1);
    }
}

testQuery();
