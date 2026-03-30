import { db, pool, investmentPlansTable } from "@workspace/db";

const plans = [
  {
    name: "Starter Plan",
    tier: "starter" as const,
    minAmount: "1000.00",
    maxAmount: "10000.00",
    durationDays: 3,
    roiPercent: "5.00",
    description: "5% Daily for 3 Days",
    features: [
      "Invest $1,000 – $10,000",
      "3-day investment period",
      "5% daily ROI",
      "Included in profit",
      "24/7 support",
    ],
  },
  {
    name: "Pro Plan",
    tier: "pro" as const,
    minAmount: "10000.00",
    maxAmount: "20000.00",
    durationDays: 2,
    roiPercent: "12.50",
    description: "12.5% Daily for 2 Days",
    features: [
      "Invest $10,000 – $20,000",
      "2-day investment period",
      "12.5% daily ROI",
      "Included in profit",
      "Priority account manager",
    ],
  },
  {
    name: "VIP Plan",
    tier: "vip" as const,
    minAmount: "20000.00",
    maxAmount: null,
    durationDays: 1,
    roiPercent: "20.00",
    description: "20% After 1 Day",
    features: [
      "Invest $20,000 – Unlimited",
      "1-day investment period",
      "20% ROI after 1 day",
      "Included in profit",
      "VIP account manager",
      "Priority withdrawals",
    ],
  },
];

async function seed() {
  console.log("Clearing existing plans...");
  await pool.query("TRUNCATE TABLE investment_plans RESTART IDENTITY CASCADE");
  console.log("Seeding investment plans...");
  for (const plan of plans) {
    await db.insert(investmentPlansTable).values(plan);
  }
  console.log(`Seeded ${plans.length} investment plans.`);
  await pool.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
