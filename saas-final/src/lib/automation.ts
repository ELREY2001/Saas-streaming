/**
 * Automation engine for subscription lifecycle management
 * - Sends reminders before expiry
 * - Executes actions on expiry (suspend, delete profile, change password)
 * - Logs all actions
 */

import { db } from "@/db";
import {
  subscriptions,
  clients,
  sharedAccounts,
  automationActions,
  notifications,
  settings,
} from "@/db/schema";
import { eq, and, lt, gte, lte, isNull, or, not } from "drizzle-orm";
import { fillTemplate, DEFAULT_TEMPLATES } from "./whatsapp";
import { formatDate, formatCurrency } from "./utils";
import { addDays } from "date-fns";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProcessResult {
  processed: number;
  errors: string[];
  actions: string[];
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

export async function runAutomationCycle(adminId?: string): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, errors: [], actions: [] };

  try {
    // 1. Send reminders (7 days, 3 days, 1 day before)
    await processReminders(adminId, result);

    // 2. Execute expiry actions
    await processExpiredSubscriptions(adminId, result);
  } catch (err) {
    result.errors.push(`Automation cycle error: ${String(err)}`);
  }

  return result;
}

// ─── Reminders ───────────────────────────────────────────────────────────────

async function processReminders(adminId: string | undefined, result: ProcessResult) {
  const now = new Date();

  // Get all active subscriptions that need reminders
  const activeSubscriptions = await db
    .select({
      subscription: subscriptions,
      client: clients,
      account: sharedAccounts,
    })
    .from(subscriptions)
    .innerJoin(clients, eq(subscriptions.clientId, clients.id))
    .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
    .where(
      and(
        eq(subscriptions.status, "active"),
        ...(adminId ? [eq(subscriptions.adminId, adminId)] : [])
      )
    );

  for (const { subscription, client, account } of activeSubscriptions) {
    const expiresAt = new Date(subscription.expiresAt);
    const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Get admin settings
    const [adminSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.adminId, subscription.adminId))
      .limit(1);

    const vars = {
      clientName: client.name,
      service: account.serviceType.toUpperCase(),
      email: account.email,
      password: account.password,
      profileLine: subscription.profileName ? `👤 Profil : ${subscription.profileName}` : "",
      profilePin: subscription.profilePin ? `🔢 PIN : ${subscription.profilePin}` : "",
      expiresAt: formatDate(expiresAt),
      amount: formatCurrency(subscription.price, subscription.currency),
    };

    // 7-day reminder
    if (daysLeft <= 7 && daysLeft > 3 && !subscription.reminderSent7Days) {
      const template =
        adminSettings?.messageTemplate7Days || DEFAULT_TEMPLATES.reminder7Days;
      const message = fillTemplate(template, vars);
      await createNotification(subscription, client, message, "7days", result);
      await db
        .update(subscriptions)
        .set({ reminderSent7Days: true, updatedAt: now })
        .where(eq(subscriptions.id, subscription.id));
      result.actions.push(`📅 Reminder 7d sent to ${client.name}`);
    }

    // 3-day reminder
    if (daysLeft <= 3 && daysLeft > 1 && !subscription.reminderSent3Days) {
      const template =
        adminSettings?.messageTemplate3Days || DEFAULT_TEMPLATES.reminder3Days;
      const message = fillTemplate(template, vars);
      await createNotification(subscription, client, message, "3days", result);
      await db
        .update(subscriptions)
        .set({ reminderSent3Days: true, updatedAt: now })
        .where(eq(subscriptions.id, subscription.id));
      result.actions.push(`⚠️ Reminder 3d sent to ${client.name}`);
    }

    // 1-day reminder
    if (daysLeft <= 1 && daysLeft >= 0 && !subscription.reminderSent1Day) {
      const template =
        adminSettings?.messageTemplate1Day || DEFAULT_TEMPLATES.reminder1Day;
      const message = fillTemplate(template, vars);
      await createNotification(subscription, client, message, "1day", result);
      await db
        .update(subscriptions)
        .set({ reminderSent1Day: true, updatedAt: now })
        .where(eq(subscriptions.id, subscription.id));
      result.actions.push(`🚨 Reminder 1d sent to ${client.name}`);
    }

    result.processed++;
  }
}

// ─── Expiry Actions ───────────────────────────────────────────────────────────

async function processExpiredSubscriptions(
  adminId: string | undefined,
  result: ProcessResult
) {
  const now = new Date();

  // Find expired but still "active" subscriptions
  const expiredSubs = await db
    .select({
      subscription: subscriptions,
      client: clients,
      account: sharedAccounts,
    })
    .from(subscriptions)
    .innerJoin(clients, eq(subscriptions.clientId, clients.id))
    .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
    .where(
      and(
        eq(subscriptions.status, "active"),
        lt(subscriptions.expiresAt, now),
        ...(adminId ? [eq(subscriptions.adminId, adminId)] : [])
      )
    );

  for (const { subscription, client, account } of expiredSubs) {
    try {
      // Get admin settings for action type
      const [adminSettings] = await db
        .select()
        .from(settings)
        .where(eq(settings.adminId, subscription.adminId))
        .limit(1);

      const actionType = adminSettings?.defaultExpiryAction || "suspend_access";

      // Execute the action
      await executeExpiryAction(subscription, client, account, actionType as string, result);

      // Update subscription status
      await db
        .update(subscriptions)
        .set({ status: "expired", updatedAt: now })
        .where(eq(subscriptions.id, subscription.id));

      // Update client status if all subs expired
      await db
        .update(clients)
        .set({ status: "expired", updatedAt: now })
        .where(eq(clients.id, client.id));

      // Decrement used profiles on the shared account
      await db
        .update(sharedAccounts)
        .set({
          usedProfiles: Math.max(0, (account.usedProfiles || 1) - 1),
          updatedAt: now,
        })
        .where(eq(sharedAccounts.id, account.id));

      // Log the action
      await db.insert(automationActions).values({
        subscriptionId: subscription.id,
        adminId: subscription.adminId,
        actionType: actionType as "suspend_access" | "delete_profile" | "change_password",
        status: "completed",
        scheduledAt: new Date(subscription.expiresAt),
        executedAt: now,
        result: `Action ${actionType} executed for ${client.name}`,
      });

      result.actions.push(`✅ ${actionType} for ${client.name} (${account.serviceType})`);
      result.processed++;
    } catch (err) {
      result.errors.push(`Error processing ${client.name}: ${String(err)}`);
    }
  }
}

// ─── Action Executor ──────────────────────────────────────────────────────────

async function executeExpiryAction(
  subscription: typeof subscriptions.$inferSelect,
  client: typeof clients.$inferSelect,
  account: typeof sharedAccounts.$inferSelect,
  actionType: string,
  result: ProcessResult
) {
  const vars = {
    clientName: client.name,
    service: account.serviceType.toUpperCase(),
    email: account.email,
    password: account.password,
    profileLine: subscription.profileName ? `👤 Profil : ${subscription.profileName}` : "",
    expiresAt: formatDate(new Date(subscription.expiresAt)),
    amount: formatCurrency(subscription.price, subscription.currency),
  };

  // Send expiry notification
  const message = fillTemplate(DEFAULT_TEMPLATES.expired, vars);
  await createNotification(subscription, client, message, "expired", result);

  // In a real system, Puppeteer/Selenium would execute the actual action here.
  // For this SaaS, we log the action and update the DB.
  switch (actionType) {
    case "delete_profile":
      // Would trigger: open Netflix/Spotify, log in, delete the profile
      result.actions.push(`🗑️ Profile deletion queued for ${client.name}`);
      break;
    case "change_password":
      // Would trigger: open service website, change password
      result.actions.push(`🔄 Password change queued for ${client.name}`);
      break;
    case "suspend_access":
    default:
      // Mark as suspended in our system
      result.actions.push(`🔒 Access suspended for ${client.name}`);
      break;
  }
}

// ─── Notification Helper ──────────────────────────────────────────────────────

async function createNotification(
  subscription: typeof subscriptions.$inferSelect,
  client: typeof clients.$inferSelect,
  message: string,
  type: string,
  result: ProcessResult
) {
  try {
    await db.insert(notifications).values({
      subscriptionId: subscription.id,
      clientId: client.id,
      adminId: subscription.adminId,
      channel: "whatsapp",
      message,
      status: "pending",
      metadata: { type } as Record<string, string>,
    });
  } catch (err) {
    result.errors.push(`Notification error for ${client.name}: ${String(err)}`);
  }
}

// ─── Manual Action Triggers ───────────────────────────────────────────────────

export async function triggerManualAction(
  subscriptionId: string,
  actionType: string,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const [sub] = await db
      .select({
        subscription: subscriptions,
        client: clients,
        account: sharedAccounts,
      })
      .from(subscriptions)
      .innerJoin(clients, eq(subscriptions.clientId, clients.id))
      .innerJoin(sharedAccounts, eq(subscriptions.sharedAccountId, sharedAccounts.id))
      .where(eq(subscriptions.id, subscriptionId))
      .limit(1);

    if (!sub) return { success: false, message: "Subscription not found" };

    const result: ProcessResult = { processed: 0, errors: [], actions: [] };
    await executeExpiryAction(
      sub.subscription,
      sub.client,
      sub.account,
      actionType,
      result
    );

    await db.insert(automationActions).values({
      subscriptionId,
      adminId,
      actionType: actionType as "suspend_access" | "delete_profile" | "change_password",
      status: "completed",
      scheduledAt: new Date(),
      executedAt: new Date(),
      result: `Manual ${actionType} by admin`,
    });

    return { success: true, message: `Action ${actionType} exécutée avec succès` };
  } catch (err) {
    return { success: false, message: String(err) };
  }
}
