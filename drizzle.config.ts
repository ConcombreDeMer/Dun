import { defineConfig } from "drizzle-kit";

/*
 * Local database schema (expo-sqlite). `npm run db:generate` writes the
 * migrations embedded in the app to `src/data/migrations`; never edit them by
 * hand.
 */
export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  schema: "./src/data/schema.ts",
  out: "./src/data/migrations",
  casing: "snake_case",
});
