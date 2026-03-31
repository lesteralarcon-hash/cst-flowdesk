/**
 * CST FlowDesk — Drizzle Database Client
 * 
 * Replaces src/lib/prisma.ts as the canonical database connection.
 * Uses the same @libsql/client and environment variables.
 * No Rust engine, no cold-start penalty, no schema metadata drift.
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const globalForDb = global as unknown as { db: ReturnType<typeof createDrizzle> };

function createDrizzle() {
  const url = process.env.DATABASE_URL || "file:./dev.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;

  console.log("⚡ Initializing Drizzle Client...");

  const client = createClient({ url, authToken });
  return drizzle(client, { schema });
}

export const db = globalForDb.db || createDrizzle();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
