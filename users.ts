import { pgTable, serial, text, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  balance: numeric("balance", { precision: 20, scale: 8 }).notNull().default("0"),
  savingsBalance: numeric("savings_balance", { precision: 20, scale: 8 }).notNull().default("0"),
  totalEarnings: numeric("total_earnings", { precision: 20, scale: 8 }).notNull().default("0"),
  todayEarnings: numeric("today_earnings", { precision: 20, scale: 8 }).notNull().default("0"),
  activeDeposits: numeric("active_deposits", { precision: 20, scale: 8 }).notNull().default("0"),
  totalWithdrawn: numeric("total_withdrawn", { precision: 20, scale: 8 }).notNull().default("0"),
  earningsUpdatedAt: timestamp("earnings_updated_at"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  bitcoinWalletAddress: text("bitcoin_wallet_address"),
  isBlocked: boolean("is_blocked").notNull().default(false),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserRow = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
