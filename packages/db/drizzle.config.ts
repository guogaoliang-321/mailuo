import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/pg/schema.ts",
  out: "./src/pg/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://meridian:meridian_dev_password@localhost:5432/meridian",
  },
});
