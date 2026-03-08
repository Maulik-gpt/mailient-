import cron from "node-cron";
import fetch from "node-fetch";
import { exec } from "child_process";

cron.schedule("*/60 * * * *", async () => {
  console.log("Running refresh job");
  await fetch(`${process.env.HOST}/api/refresh`, { method: "POST", headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` }});
});