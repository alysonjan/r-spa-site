import { getActivePackages, getAllPackages } from "./lib/packages-db";

async function check() {
  const active = await getActivePackages();
  const all = await getAllPackages();
  console.log("Active packages:", active.length);
  console.log("All packages:", all.length);
  console.log("All packages details:", JSON.stringify(all, null, 2));
}

check();
