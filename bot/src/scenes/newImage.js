/**
 * Scene: newImage
 * Wizard to upload a new image for a creator.
 *
 * Steps:
 *   0 — List creators, ask which one
 *   1 — Ask for the image photo
 *   2 — Ask for alt text (optional, /skip)
 *   3 — Ask for order (optional, /skip)
 *   4 — Create record
 */

import { Scenes } from 'telegraf';
import { listCreators, createImage } from '../lib/pb.js';
import { downloadTelegramFile, compressAndSave } from '../lib/media.js';
import { mediaErrorMessage, cancelKeyboard } from '../lib/utils.js';

export const newImageScene = new Scenes.WizardScene(
  'newImage',

  // Step 0: List creators, ask for ID
  async (ctx) => {
    let creators;
    try {
      creators = await listCreators();
    } catch (err) {
      await ctx.reply(`Failed to fetch creators: ${err.message}`);
      return ctx.scene.leave();
    }

    if (!creators.length) {
      await ctx.reply('No creators found. Create a creator first.');
      return ctx.scene.leave();
    }

    ctx.wizard.state.creators = creators;

    const lines = creators.map((c) => `• \`${c.id}\` — ${c.name}`);
    await ctx.reply(
      `*Creators:*\n${lines.join('\n')}\n\nSend the creator ID:`,
      { parse_mode: 'Markdown', ...cancelKeyboard() }
    );
    return ctx.wizard.next();
  },

  // Step 1: Receive creator ID, ask for image
  async (ctx) => {
    const id = ctx.message?.text?.trim();
    if (!id || id.startsWith('/')) {
      await ctx.reply('Please send a valid creator ID.');
      return;
    }

    const creator = ctx.wizard.state.creators.find((c) => c.id === id);
    if (!creator) {
      await ctx.reply('Creator not found. Please send a valid ID from the list.');
      return;
    }

    ctx.wizard.state.creatorId = id;
    ctx.wizard.state.creatorName = creator.name;

    await ctx.reply(
      `Adding image for *${creator.name}*.\nSend the image:`,
      { parse_mode: 'Markdown', ...cancelKeyboard() }
    );
    return ctx.wizard.next();
  },

  // Step 2: Receive photo, ask for alt text
  async (ctx) => {
    if (!ctx.message?.photo) {
      await ctx.reply('Please send a photo.');
      return;
    }

    const fileId = ctx.message.photo.at(-1).file_id;
    try {
      const buffer = await downloadTelegramFile(ctx, fileId);
      const publicPath = await compressAndSave(buffer, 'image');
      ctx.wizard.state.file = publicPath;
      await ctx.reply(`Image saved: ${publicPath}`);
    } catch (err) {
      await ctx.reply(mediaErrorMessage(err));
      return;
    }

    await ctx.reply('Enter alt text for the image (or /skip):', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Step 3: Receive alt text, ask for order
  async (ctx) => {
    const text = ctx.message?.text?.trim();
    if (text && !text.startsWith('/skip')) {
      ctx.wizard.state.alt = text;
    }

    await ctx.reply('Enter display order (number, or /skip):', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Step 4: Receive order, create record
  async (ctx) => {
    const text = ctx.message?.text?.trim();

    if (text && !text.startsWith('/skip')) {
      const order = parseInt(text, 10);
      if (isNaN(order)) {
        await ctx.reply('Please enter a valid number or /skip.');
        return;
      }
      ctx.wizard.state.order = order;
    }

    const { creatorId, file, alt, order } = ctx.wizard.state;
    const payload = { creator: creatorId, file, active: true };
    if (alt) payload.alt = alt;
    if (order !== undefined) payload.order = order;

    try {
      const record = await createImage(payload);
      await ctx.reply(
        `Image added!\nID: \`${record.id}\`\nFile: ${record.file}`,
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
      );
    } catch (err) {
      await ctx.reply(`Failed to create image: ${err.message}`);
    }

    return ctx.scene.leave();
  }
);

newImageScene.command('cancel', async (ctx) => {
  await ctx.reply('Cancelled.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});

newImageScene.command('skip', async (ctx) => {
  return ctx.wizard.next();
});
