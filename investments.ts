import { pgTable, serial, text, numeric, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const investmentTierEnum = pgEnum("investment_tier", ["starter", "pro", "vip"]);
export const investmentStatusEnum = pgEnum("investment_status", ["active", "completed", "cancelled"]);

export const investmentPlansTable = pgTable("investment_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tier: investmentTierEnum("tier").notNull(),
  minAmount: numeric("min_amount", { precision: 20, scale: 2 }).notNull(),
  maxAmount: numeric("max_amount", { precision: 20, scale: 2 }),
  durationDays: integer("duration_days").notNull(),
  roiPercent: numeric("roi_percent", { precision: 6, scale: 2 }).notNull(),
  description: text("description").notNull(),
  features: text("features").array().notNull().default([]),
});

export const userInvestmentsTable = pgTable("user_investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  planId: integer("plan_id").notNull().references(() => investmentPlansTable.id),
  amount: numeric("amount", { precision: 20, scale: 8 }).notNull(),
  accumulatedRoi: numeric("accumulated_roi", { precision: 20, scale: 8 }).notNull().default("0"),
  status: investmentStatusEnum("status").notNull().default("active"),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInvestmentSchema = createInsertSchema(userInvestmentsTable).omit({ id: true, createdAt: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type UserInvestmentRow = typeof userInvestmentsTable.$inferSelect;
export type InvestmentPlanRow = typeof investmentPlansTable.$inferSelect;
