import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cryptoAssetsTable = pgTable("crypto_assets", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull().unique(),
  name: text("name").notNull(),
  price: numeric("price", { precision: 20, scale: 8 }).notNull().default("0"),
  priceChange24h: numeric("price_change_24h", { precision: 20, scale: 8 }).notNull().default("0"),
  priceChangePercent24h: numeric("price_change_percent_24h", { precision: 10, scale: 4 }).notNull().default("0"),
  marketCap: numeric("market_cap", { precision: 30, scale: 2 }).notNull().default("0"),
  volume24h: numeric("volume_24h", { precision: 30, scale: 2 }).notNull().default("0"),
  circulatingSupply: numeric("circulating_supply", { precision: 30, scale: 2 }).notNull().default("0"),
  rank: integer("rank").notNull().default(0),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCryptoAssetSchema = createInsertSchema(cryptoAssetsTable).omit({ id: true, updatedAt: true });
export type InsertCryptoAsset = z.infer<typeof insertCryptoAssetSchema>;
export type CryptoAsset = typeof cryptoAssetsTable.$inferSelect;
