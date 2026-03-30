/**
 * Daily Earnings Job — run at 8:00 AM every day via Replit Scheduled Deployments
 * Schedule: "Run every day at 8 AM" (natural language)
 *
 * What it does:
 * 1. For every active investment: apply compounded daily ROI to user balance
 * 2. Pay 5% of each investor's daily earnings to their inviter (referral commission)
 * 3. For savings balances: apply 5% daily compounded interest
 * 4. Mark completed investments
 * 5. Log each transaction
 */

import { db, pool } from "@workspace/db";
import { usersTable, userInvestmentsTable, investmentPlansTable, transactionsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import nodemailer from "nodemailer";

const SAVINGS_DAILY_RATE = 0.05;
const REFERRAL_COMMISSION_RATE = 0.05;

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}
const FROM = process.env.SMTP_FROM ?? "Express Gold Investments <noreply@expressgoldinvestments.com>";
const emailEnabled = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

async function sendReferralCommissionEmail(toEmail: string, toName: string, referredUsername: string, amount: number) {
  if (!emailEnabled()) return;
  try {
    const t = createTransport();
    await t.sendMail({
      from: FROM,
      to: toEmail,
      subject: "💰 Daily Referral Commission Credited — Express Gold Investments",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0600;color:#fff;padding:32px;border-radius:12px;border:1px solid #92400e;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="background:#f59e0b;color:#000;display:inline-block;padding:8px 20px;border-radius:8px;font-weight:900;font-size:18px;letter-spacing:2px;">EG</div>
            <h2 style="color:#f59e0b;margin:12px 0 4px;">EXPRESS GOLD INVESTMENTS</h2>
          </div>
          <h3 style="color:#fcd34d;">💰 Daily Referral Commission</h3>
          <p>Dear <strong>${toName}</strong>,</p>
          <p>Your referral <strong style="color:#fcd34d;">${referredUsername}</strong> earned their daily returns today and you've received your 5% commission!</p>
          <div style="background:#1a0e00;border:1px solid #92400e;border-radius:8px;padding:20px;margin:20px 0;text-align:center;">
            <p style="color:#f59e0b;margin:0 0 4px;font-size:13px;">TODAY'S COMMISSION</p>
            <p style="color:#4ade80;font-size:32px;font-weight:900;margin:0;">$${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            <p style="color:#78716c;font-size:12px;margin:4px 0 0;">Added to your balance</p>
          </div>
          <div style="text-align:center;margin:24px 0;">
            <a href="https://expressgoldinvestments.com/dashboard" style="background:#f59e0b;color:#000;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">View My Dashboard</a>
          </div>
          <hr style="border-color:#92400e;margin:24px 0;">
          <p style="color:#78716c;font-size:12px;text-align:center;">Express Gold Investment Limited · Company No. 01387452 · Surrey, UK</p>
        </div>
      `,
    });
  } catch (e) { console.error("[Email] Daily commission email failed:", e); }
}

async function runDailyEarnings() {
  console.log(`[${new Date().toISOString()}] Starting daily earnings job...`);
  const now = new Date();

  const activeInvestments = await db
    .select({
      invId: userInvestmentsTable.id,
      userId: userInvestmentsTable.userId,
      amount: userInvestmentsTable.amount,
      accumulatedRoi: userInvestmentsTable.accumulatedRoi,
      endDate: userInvestmentsTable.endDate,
      roiPercent: investmentPlansTable.roiPercent,
      durationDays: investmentPlansTable.durationDays,
    })
    .from(userInvestmentsTable)
    .leftJoin(investmentPlansTable, eq(userInvestmentsTable.planId, investmentPlansTable.id))
    .where(and(eq(userInvestmentsTable.status, "active")));

  let processedInvestments = 0;

  for (const inv of activeInvestments) {
    if (!inv.userId) continue;
    const principal = parseFloat(inv.amount);
    const alreadyEarned = parseFloat(inv.accumulatedRoi ?? "0");
    const compoundBase = principal + alreadyEarned;
    const dailyRate = parseFloat(inv.roiPercent ?? "0") / 100;
    const dailyEarning = compoundBase * dailyRate;
    const endDate = new Date(inv.endDate);
    const isCompleted = now >= endDate;

    await db.update(userInvestmentsTable)
      .set({
        accumulatedRoi: sql`${userInvestmentsTable.accumulatedRoi} + ${dailyEarning}`,
        ...(isCompleted ? { status: "completed" } : {}),
      })
      .where(eq(userInvestmentsTable.id, inv.invId));

    // On completion: credit daily earnings + return the original principal to balance
    // activeDeposits is decremented so dashboard reflects the completed investment correctly
    const balanceCredit = isCompleted ? dailyEarning + principal : dailyEarning;

    await db.update(usersTable)
      .set({
        balance: sql`${usersTable.balance} + ${balanceCredit}`,
        totalEarnings: sql`${usersTable.totalEarnings} + ${dailyEarning}`,
        todayEarnings: String(dailyEarning),
        earningsUpdatedAt: now,
        ...(isCompleted ? { activeDeposits: sql`GREATEST(0, ${usersTable.activeDeposits} - ${principal})` } : {}),
      })
      .where(eq(usersTable.id, inv.userId));

    await db.insert(transactionsTable).values({
      userId: inv.userId,
      type: "earnings",
      amount: String(dailyEarning),
      status: "completed",
      notes: `Daily compounded ROI — ${dailyRate * 100}% on $${compoundBase.toFixed(2)}`,
    });

    // On maturity: log principal return and keep everything else intact permanently
    if (isCompleted) {
      await db.insert(transactionsTable).values({
        userId: inv.userId,
        type: "deposit",
        amount: String(principal),
        status: "completed",
        notes: `Investment matured — principal of $${principal.toFixed(2)} returned to available balance`,
      });
      console.log(`  Investment #${inv.invId} matured — $${principal.toFixed(2)} principal + $${dailyEarning.toFixed(2)} final ROI returned to user #${inv.userId}`);
    }

    // --- REFERRAL COMMISSION: 5% of daily earnings to inviter ---
    const [investor] = await db.select({
      username: usersTable.username,
      referredBy: usersTable.referredBy,
    }).from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);

    if (investor?.referredBy) {
      const [inviter] = await db.select().from(usersTable)
        .where(eq(usersTable.referralCode, investor.referredBy)).limit(1);

      if (inviter) {
        const commission = dailyEarning * REFERRAL_COMMISSION_RATE;

        await db.update(usersTable)
          .set({ balance: sql`${usersTable.balance} + ${commission}` })
          .where(eq(usersTable.id, inviter.id));

        await db.insert(transactionsTable).values({
          userId: inviter.id,
          type: "bonus",
          amount: String(commission),
          status: "completed",
          notes: `Daily referral commission — 5% of ${investor.username}'s $${dailyEarning.toFixed(2)} earnings`,
        });

        sendReferralCommissionEmail(
          inviter.email, inviter.username, investor.username, commission
        ).catch(() => {});
      }
    }

    processedInvestments++;
    if (isCompleted) {
      console.log(`  Investment #${inv.invId} completed and credited.`);
    }
  }

  // --- SAVINGS INTEREST ---
  const allUsers = await db.select({
    id: usersTable.id,
    savingsBalance: usersTable.savingsBalance,
  }).from(usersTable).where(sql`${usersTable.savingsBalance} > 0`);

  let processedSavings = 0;

  for (const user of allUsers) {
    const savings = parseFloat(user.savingsBalance);
    if (savings <= 0) continue;
    const interest = savings * SAVINGS_DAILY_RATE;
    await db.update(usersTable)
      .set({
        savingsBalance: sql`${usersTable.savingsBalance} + ${interest}`,
        totalEarnings: sql`${usersTable.totalEarnings} + ${interest}`,
        todayEarnings: sql`COALESCE(${usersTable.todayEarnings}::numeric, 0) + ${interest}`,
        earningsUpdatedAt: now,
      })
      .where(eq(usersTable.id, user.id));

    await db.insert(transactionsTable).values({
      userId: user.id,
      type: "savings_interest",
      amount: String(interest),
      status: "completed",
      notes: `5% daily savings interest (compounded)`,
    });

    processedSavings++;
  }

  console.log(`✅ Done. Investments processed: ${processedInvestments}, Savings processed: ${processedSavings}`);
  await pool.end();
  process.exit(0);
}

runDailyEarnings().catch(err => {
  console.error("Daily earnings job failed:", err);
  process.exit(1);
});
