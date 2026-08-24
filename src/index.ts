import { env } from "bun";
import { initDb } from "./db";
import { createApp } from "./app";

const db = await initDb();
const app = createApp(db);

export default {
  port: Number(env.PORT || 3000),
  fetch: app.fetch,
};
