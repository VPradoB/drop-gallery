/**
 * Scene: toggleCreator
 * BaseScene — list creators with inline toggle buttons.
 * Toggles the `active` boolean on a creator via inline keyboard.
 */

import { Scenes } from 'telegraf';
import { listCreators, updateCreator } from '../lib/pb.js';

export const toggleCreatorScene = new Scenes.BaseScene('toggleCreator');

async function showCreatorList(ctx) {
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

  const buttons = creators.map((c) => [
    {
      text: `${c.active ? '✅' : '❌'} ${c.name}`,
      callback_data: `toggle:${c.id}:${c.active ? '0' : '1'}`,
    },
  ]);
  buttons.push([{ text: '« Done', callback_data: 'done' }]);

  await ctx.reply('Tap a creator to toggle active status:', {
    reply_markup: { inline_keyboard: buttons },
  });
}

toggleCreatorScene.enter(showCreatorList);

toggleCreatorScene.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery?.data;

  if (data === 'done') {
    await ctx.answerCbQuery('Done');
    await ctx.editMessageReplyMarkup(undefined);
    await ctx.reply('Exited.', { reply_markup: { remove_keyboard: true } });
    return ctx.scene.leave();
  }

  if (data?.startsWith('toggle:')) {
    const [, id, newActiveStr] = data.split(':');
    const newActive = newActiveStr === '1';

    try {
      const updated = await updateCreator(id, { active: newActive });
      await ctx.answerCbQuery(`${updated.name} is now ${newActive ? 'active' : 'inactive'}`);
      // Refresh the list
      await showCreatorList(ctx);
    } catch (err) {
      await ctx.answerCbQuery(`Error: ${err.message}`, { show_alert: true });
    }
    return;
  }

  await ctx.answerCbQuery();
});

toggleCreatorScene.command('cancel', async (ctx) => {
  await ctx.reply('Exited.', { reply_markup: { remove_keyboard: true } });
  return ctx.scene.leave();
});
