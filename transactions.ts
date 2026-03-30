import { pgTable, serial, integer, text, numeric, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const txTypeEnum = pgEnum("tx_type", ["deposit", "withdrawal", "bonus", "earnings", "savings_interest", "savings_deposit"]);
export const txStatusEnum = pgEnum("tx_status", ["pending", "completed", "failed"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "processing", "completed", "failed"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  type: txTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  status: txStatusEnum("status").notNull().default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const withdrawalRequestsTable = pgTable("withdrawal_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  address: text("address").notNull(),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  status: withdrawalStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const depositConfirmationsTable = pgTable("deposit_confirmations", {
  id: serial("id").primaryKey(),
  txid: text("txid").notNull().unique(),
  userId: integer("user_id").references(() => usersTable.id),
  amountBtc: numeric("amount_btc", { precision: 20, scale: 8 }).notNull(),
  credited: boolean("credited").notNull().default(false),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type TransactionRow = typeof transactionsTable.$inferSelect;
export type WithdrawalRow = typeof withdrawalRequestsTable.$inferSelect;
export type DepositConfirmationRow = typeof depositConfirmationsTable.$inferSelect;
