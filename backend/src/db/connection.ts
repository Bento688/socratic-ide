import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema.js";

// create connection pool
const connectionPool = mysql.createPool(process.env.DATABASE_URL!);

// initialize Drizzle (explicitly passing in the schema to be able to use the Relational API)
const db = drizzle({
  client: connectionPool,
  schema,
  mode: "default",
});
