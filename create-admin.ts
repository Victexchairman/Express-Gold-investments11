import { db, pool } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const ADMIN_USERNAME = "expressgold_admin";
const ADMIN_EMAIL = "admin@expressgoldinvestments.com";
const ADMIN_PASSWORD = "Admin@ExpressGold2024";

async function createAdmin() {
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, ADMIN_USERNAME)).limit(1);
  if (existing.length > 0) {
    console.log("Admin user already exists.");
    await pool.end();
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await db.insert(usersTable).values({
    username: ADMIN_USERNAME,
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
  });
  console.log("✅ Admin user created!");
  console.log(`   Username: ${ADMIN_USERNAME}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  await pool.end();
  process.exit(0);
}

createAdmin().catch(err => { console.error(err); process.exit(1); });
