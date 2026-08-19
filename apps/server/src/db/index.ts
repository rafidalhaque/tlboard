import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dbSchema from "./schema.js";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema: dbSchema });
export { dbSchema as schema };
