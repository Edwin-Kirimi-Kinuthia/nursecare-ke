import "dotenv/config";
import { db } from "./index";

/**
 * Seed skeleton. Populated in M1 with demo accounts (patient, doctor, nurse,
 * pharmacy, admin) reusing the Kenyan sample data from the original scaffold.
 * For now it just verifies the connection and reports the user count.
 */
async function main() {
  console.log("→ CareBora seed: checking database connection...");
  const count = await db.user.count();
  console.log(`✓ Connected. Users currently in DB: ${count}`);
  console.log("ℹ Demo-account seeding is implemented in milestone M1.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
