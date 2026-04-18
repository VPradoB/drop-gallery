/**
 * Scene: editCreator
 * Wizard to edit an existing creator record.
 *
 * Steps:
 *   0 — Show list of creators, ask user to pick one by ID
 *   1 — Ask what field to edit (name / bio / avatar / external_link / active)
 *   2 — Receive new value and apply PATCH
 */

import { Scenes } from 'telegraf';
import { listCreators, updateCreator } from '../lib/pb.js';
import { downloadTelegramFile, compressAndSave } from '../lib/media.js';
import { slugify, mediaErrorMessage, cancelKeyboard, inlineKeyboard, truncate } from '../lib/utils.js';

const EDITABLE_FIELDS = ['name', 'bio', 'avatar', 'external_link', 'active'];

export const editCreatorScene = new Scenes.WizardScene(
  'editCreator',

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
      await ctx.reply('No creators found.');
      return ctx.scene.leave();
    }

    ctx.wizard.state.creators = creators;

    const lines = creators.map(
      (c) => `• \`${c.id}\` — ${c.name} (${c.active ? 'active' : 'inactive'})`
    );
    await ctx.reply(
      `*Creators:*\n${lines.join('\n')}\n\nSend the creator ID to edit:`,
      { parse_mode: 'Markdown', ...cancelKeyboard() }
    );
    return ctx.wizard.next();
  },

  // Step 1: Receive creator ID, ask which field
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

    const fieldButtons = EDITABLE_FIELDS.map((f) => ({ label: f, value: `field:${f}` }));

    await ctx.reply(
      `Editing *${creator.name}*.\nWhich field do you want to edit?`,
      { parse_mode: 'Markdown', ...inlineKeyboard(fieldButtons) }
    );
    return ctx.wizard.next();
  },

  // Step 2: Receive field selection (callback_query), ask for new value
  async (ctx) => {
    // Handle inline button press
    if (ctx.callbackQuery?.data?.startsWith('field:')) {
      const field = ctx.callbackQuery.data.replace('field:', '');
      ctx.wizard.state.field = field;
      await ctx.answerCbQuery();

      if (field === 'avatar') {
        await ctx.reply('Send the new avatar photo:', cancelKeyboard());
      } else if (field === 'active') {
        await ctx.reply(
          'Send `true` or `false`:',
          { parse_mode: 'Markdown', ...cancelKeyboard() }
        );
      } else {
        await ctx.reply(`Send the new value for *${field}*:`, {
          parse_mode: 'Markdown',
          ...cancelKeyboard(),
        });
      }
      return ctx.wizard.next();
    }

    // If they typed text instead of pressing a button
    await ctx.reply('Please tap one of the field buttons above.');
  },

  // Step 3: Receive new value and PATCH
  async (ctx) => {
    const { creatorId, creatorName, field } = ctx.wizard.state;
    let newValue;

    if (field === 'avatar') {
      if (!ctx.message?.photo) {
        await ctx.reply('Please send a photo.');
        return;
      }
      const fileId = ctx.message.photo.at(-1).file_id;
      try {
        const buffer = await downloadTelegramFile(ctx, fileId);
        newValue = await compressAndSave(buffer, 'avatar');
      } catch (err) {
        await ctx.reply(mediaErrorMessage(err));
        return;
      }
    } else {
      const text = ctx.message?.text?.trim();
      if (!text || text.startsWith('/')) {
        await ctx.reply('Please send a value.');
        return;
      }

      if (field === 'name') {
        newValue = text;
        // Also update slug when name changes
        ctx.wizard.state.extraFields = { slug: slugify(text) };
      } else if (field === 'active') {
        if (text !== 'true' && text !== 'false') {
          await ctx.reply('Please send `true` or `false`.', { parse_mode: 'Markdown' });
          return;
        }
        newValue = text === 'true';
      } else if (field === 'external_link') {
        try {
          new URL(text);
          newValue = text;
        } catch {
          await ctx.reply('Please enter a valid URL.');
          return;
        }
      } else {
        newValue = text;
      }
    }

    const patch = { [field]: newValue, ...(ctx.wizard.state.extraFields ?? {}) };

    try {
      await updateCreator(creatorId, patch);
      await ctx.reply(
        `Updated *${creatorName}* — \`${field}\` changed.`,
        { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
      );
    } catch (err) {
      await ctx.reply(`Failed to update creator: ${err.message}`);
    }

    return ctx.scene.leave();
  }
);

editCreatorScene.command('cancel', async (ctx) => {
  await ctx.reply('Cancelled.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});
