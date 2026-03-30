import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portfolioTable = pgTable("portfolio", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  quantity: numeric("quantity", { precision: 20, scale: 8 }).notNull(),
  averageBuyPrice: numeric("average_buy_price", { precision: 20, scale: 8 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioSchema = createInsertSchema(portfolioTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type Portfolio = typeof portfolioTable.$inferSelect;
