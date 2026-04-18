/**
 * Scene: toggleImage
 * BaseScene — pick a creator, then toggle images active/inactive via inline keyboard.
 */

import { Scenes } from 'telegraf';
import { listCreators, listImages, updateImage } from '../lib/pb.js';
import { truncate } from '../lib/utils.js';

export const toggleImageScene = new Scenes.BaseScene('toggleImage');

async function showCreatorPicker(ctx) {
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

  ctx.scene.state.creators = creators;

  const buttons = creators.map((c) => [
    { text: c.name, callback_data: `creator:${c.id}` },
  ]);
  buttons.push([{ text: '« Cancel', callback_data: 'cancel' }]);

  await ctx.reply('Select a creator to manage their images:', {
    reply_markup: { inline_keyboard: buttons },
  });
}

async function showImageList(ctx, creatorId) {
  let images;
  try {
    images = await listImages(creatorId);
  } catch (err) {
    await ctx.answerCbQuery(`Failed to fetch images: ${err.message}`, { show_alert: true });
    return;
  }

  if (!images.length) {
    await ctx.answerCbQuery('No images found for this creator.');
    await ctx.editMessageText('No images found for this creator.');
    return;
  }

  ctx.scene.state.creatorId = creatorId;

  const buttons = images.map((img) => {
    const label = truncate(img.alt || img.file || img.id, 28);
    return [
      {
        text: `${img.active ? '✅' : '❌'} ${label}`,
        callback_data: `toggle:${img.id}:${img.active ? '0' : '1'}`,
      },
    ];
  });
  buttons.push([{ text: '« Back', callback_data: 'back' }]);
  buttons.push([{ text: '« Done', callback_data: 'done' }]);

  const text = 'Tap an image to toggle active status:';
  try {
    await ctx.editMessageText(text, { reply_markup: { inline_keyboard: buttons } });
  } catch {
    await ctx.reply(text, { reply_markup: { inline_keyboard: buttons } });
  }
}

toggleImageScene.enter(showCreatorPicker);

toggleImageScene.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data;

  if (data === 'cancel' || data === 'done') {
    await ctx.answerCbQuery(data === 'done' ? 'Done' : 'Cancelled');
    try { await ctx.editMessageReplyMarkup(undefined); } catch {}
    await ctx.reply('Exited.', { reply_markup: { remove_keyboard: true } });
    return ctx.scene.leave();
  }

  if (data === 'back') {
    await ctx.answerCbQuery();
    await showCreatorPicker(ctx);
    return;
  }

  if (data?.startsWith('creator:')) {
    const creatorId = data.replace('creator:', '');
    await ctx.answerCbQuery();
    await showImageList(ctx, creatorId);
    return;
  }

  if (data?.startsWith('toggle:')) {
    const [, id, newActiveStr] = data.split(':');
    const newActive = newActiveStr === '1';

    try {
      await updateImage(id, { active: newActive });
      await ctx.answerCbQuery(`Image is now ${newActive ? 'active' : 'inactive'}`);
      // Refresh image list
      await showImageList(ctx, ctx.scene.state.creatorId);
    } catch (err) {
      await ctx.answerCbQuery(`Error: ${err.message}`, { show_alert: true });
    }
    return;
  }

  await ctx.answerCbQuery();
});

toggleImageScene.command('cancel', async (ctx) => {
  await ctx.reply('Exited.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});
