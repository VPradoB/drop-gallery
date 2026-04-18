/**
 * drops-gallery Telegram bot
 * Admin panel over Telegram — manage creators and images in PocketBase.
 */

import 'dotenv/config';
import { Telegraf, session, Scenes } from 'telegraf';
import { getToken } from './lib/pb.js';
import { newCreatorScene } from './scenes/newCreator.js';
import { editCreatorScene } from './scenes/editCreator.js';
import { newImageScene } from './scenes/newImage.js';
import { toggleCreatorScene } from './scenes/toggleCreator.js';
import { toggleImageScene } from './scenes/toggleImage.js';

// ─── Validate required environment variables ──────────────────────────────────

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('BOT_TOKEN environment variable is required');
  process.exit(1);
}

const ALLOWED_USERS_RAW = process.env.ALLOWED_USER_ID || process.env.ALLOWED_USERS || '';
const ALLOWED_USERS = new Set(
  ALLOWED_USERS_RAW.split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
);

if (ALLOWED_USERS.size === 0) {
  console.warn('[warn] ALLOWED_USER_ID is empty — bot will reject all users!');
}

// ─── Authenticate with PocketBase at startup ──────────────────────────────────

console.log('[boot] Connecting to PocketBase...');
await getToken();
console.log('[boot] PocketBase ready');

// ─── Bot setup ────────────────────────────────────────────────────────────────

const bot = new Telegraf(BOT_TOKEN);

// Stage
const stage = new Scenes.Stage([
  newCreatorScene,
  editCreatorScene,
  newImageScene,
  toggleCreatorScene,
  toggleImageScene,
]);

// ─── Middleware order (CRITICAL: authGuard FIRST) ─────────────────────────────

// 1. Auth guard — FIRST, before session or scene state
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;
  if (!userId || !ALLOWED_USERS.has(userId)) {
    if (ctx.callbackQuery) {
      await ctx.answerCbQuery('Unauthorized').catch(() => {});
    } else {
      await ctx.reply('Unauthorized.').catch(() => {});
    }
    return; // do NOT call next()
  }
  return next();
});

// 2. Session middleware
bot.use(session());

// 3. Stage / scene middleware
bot.use(stage.middleware());

// ─── Commands ─────────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  await ctx.reply(
    `Welcome to *drops-gallery* admin bot!\n\nAvailable commands:\n` +
      `/new\\_creator — Create a new creator\n` +
      `/edit\\_creator — Edit an existing creator\n` +
      `/new\\_image — Upload an image for a creator\n` +
      `/toggle\\_creator — Enable/disable a creator\n` +
      `/toggle\\_image — Enable/disable an image\n` +
      `/help — Show this message`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `*Commands:*\n` +
      `/new\\_creator — Create a new creator\n` +
      `/edit\\_creator — Edit an existing creator\n` +
      `/new\\_image — Upload an image for a creator\n` +
      `/toggle\\_creator — Enable/disable a creator\n` +
      `/toggle\\_image — Enable/disable an image`,
    { parse_mode: 'Markdown' }
  );
});

bot.command('new_creator', (ctx) => ctx.scene.enter('newCreator'));
bot.command('edit_creator', (ctx) => ctx.scene.enter('editCreator'));
bot.command('new_image', (ctx) => ctx.scene.enter('newImage'));
bot.command('toggle_creator', (ctx) => ctx.scene.enter('toggleCreator'));
bot.command('toggle_image', (ctx) => ctx.scene.enter('toggleImage'));

// Global cancel outside any scene
bot.command('cancel', async (ctx) => {
  await ctx.reply('Nothing to cancel.', { reply_markup: { remove_keyboard: true } });
});

// ─── Error handler ────────────────────────────────────────────────────────────

bot.catch(async (err, ctx) => {
  console.error(`[error] Update ${ctx.update?.update_id}:`, err);
  try {
    await ctx.reply('An unexpected error occurred. Please try again.');
  } catch {}
});

// ─── Launch ───────────────────────────────────────────────────────────────────

bot.launch({
  dropPendingUpdates: true,
});

console.log('[bot] Bot is running');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
