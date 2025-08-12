import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { readFileSync } from 'fs';
import { join } from 'path';

neonConfig.webSocketConstructor = ws;

// Load environment variables from .env file
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  try {
    const envFile = readFileSync(join(process.cwd(), '.env'), 'utf-8');
    const envMatch = envFile.match(/DATABASE_URL="([^"]+)"/);
    if (envMatch) {
      DATABASE_URL = envMatch[1];
    }
  } catch (error) {
    // .env file doesn't exist or can't be read
  }
}

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: DATABASE_URL });
export const db = drizzle({ client: pool, schema });