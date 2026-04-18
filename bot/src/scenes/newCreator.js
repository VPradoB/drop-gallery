/**
 * Scene: newCreator
 * Wizard to create a new creator record in PocketBase.
 *
 * Steps:
 *   0 — Ask for name
 *   1 — Ask for bio (optional, /skip)
 *   2 — Ask for avatar photo (optional, /skip)
 *   3 — Ask for external_link (optional, /skip)
 *   4 — Confirm and create
 */

import { Scenes } from 'telegraf';
import { createCreator } from '../lib/pb.js';
import { downloadTelegramFile, compressAndSave } from '../lib/media.js';
import { slugify, mediaErrorMessage, cancelKeyboard } from '../lib/utils.js';

export const newCreatorScene = new Scenes.WizardScene(
  'newCreator',

  // Step 0: Ask for name
  async (ctx) => {
    await ctx.reply('Enter the creator\'s name:', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Step 1: Receive name, ask for bio
  async (ctx) => {
    const name = ctx.message?.text?.trim();
    if (!name || name.startsWith('/')) {
      await ctx.reply('Please enter a valid name.');
      return; // stay in step
    }

    ctx.wizard.state.name = name;
    ctx.wizard.state.slug = slugify(name);

    await ctx.reply(
      `Name: *${name}*\nSlug: \`${ctx.wizard.state.slug}\`\n\nEnter a bio (or /skip):`,
      { parse_mode: 'Markdown', ...cancelKeyboard() }
    );
    return ctx.wizard.next();
  },

  // Step 2: Receive bio, ask for avatar
  async (ctx) => {
    const text = ctx.message?.text?.trim();

    if (text && !text.startsWith('/skip')) {
      ctx.wizard.state.bio = text;
    }

    await ctx.reply(
      'Send an avatar photo (or /skip):',
      cancelKeyboard()
    );
    return ctx.wizard.next();
  },

  // Step 3: Receive avatar, ask for external_link
  async (ctx) => {
    if (ctx.message?.photo) {
      const fileId = ctx.message.photo.at(-1).file_id;
      try {
        const buffer = await downloadTelegramFile(ctx, fileId);
        const publicPath = await compressAndSave(buffer, 'avatar');
        ctx.wizard.state.avatar = publicPath;
        await ctx.reply(`Avatar saved: ${publicPath}`);
      } catch (err) {
        await ctx.reply(mediaErrorMessage(err));
        return; // stay in step — let user retry or skip
      }
    } else if (ctx.message?.text?.trim().startsWith('/skip')) {
      // no avatar
    } else {
      await ctx.reply('Please send a photo or /skip.');
      return;
    }

    await ctx.reply('Enter an external link (URL) for the creator (or /skip):', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Step 4: Receive external_link, create record
  async (ctx) => {
    const text = ctx.message?.text?.trim();

    if (text && !text.startsWith('/skip')) {
      // Basic URL validation
      try {
        new URL(text);
        ctx.wizard.state.external_link = text;
      } catch {
        await ctx.reply('That doesn\'t look like a valid URL. Please enter a valid URL or /skip.');
        return;
      }
    }

    // Build payload — omit null/undefined optional fields
    const { name, slug, bio, avatar, external_link } = ctx.wizard.state;
    const payload = { name, slug, active: true };
    if (bio) payload.bio = bio;
    if (avatar) payload.avatar = avatar;
    if (external_link) payload.external_link = external_link;

    try {
      const record = await createCreator(payload);
      await ctx.reply(
        `Creator *${record.name}* created!\nID: \`${record.id}\``,
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
      );
    } catch (err) {
      await ctx.reply(`Failed to create creator: ${err.message}`);
    }

    return ctx.scene.leave();
  }
);

newCreatorScene.command('cancel', async (ctx) => {
  await ctx.reply('Cancelled.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

newCreatorScene.command('skip', async (ctx) => {
  // Advance wizard when user types /skip (handled per-step above, but this
  // catches cases where step logic falls through to command handler)
  return ctx.wizard.next();
});
