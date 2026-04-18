/**
 * Shared utility helpers.
 */

/**
 * Convert a string to a URL-safe slug.
 * e.g. "Jane Doe" -> "jane-doe"
 */
export function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Return a user-friendly message for media download errors.
 */
export function mediaErrorMessage(err) {
  switch (err.code) {
    case 'FILE_TOO_LARGE':
      return 'The file is too large. Please send an image under 20 MB.';
    case 'UNSUPPORTED_TYPE':
      return 'Unsupported file type. Please send a JPEG, PNG, or WebP image.';
    case 'DOWNLOAD_FAILED':
    default:
      return 'Failed to download the image. Please try again.';
  }
}

/**
 * Build a keyboard with a single "Cancel" button.
 */
export function cancelKeyboard() {
  return { reply_markup: { keyboard: [[{ text: '/cancel' }]], resize_keyboard: true } };
}

/**
 * Remove custom keyboard.
 */
export function removeKeyboard() {
  return { reply_markup: { remove_keyboard: true } };
}

/**
 * Build an inline keyboard from an array of { label, value } items.
 * Splits into rows of `perRow` buttons.
 */
export function inlineKeyboard(items, perRow = 1) {
  const rows = [];
  for (let i = 0; i < items.length; i += perRow) {
    rows.push(
      items.slice(i, i + perRow).map((item) => ({
        text: item.label,
        callback_data: item.value,
      }))
    );
  }
  return { reply_markup: { inline_keyboard: rows } };
}

/**
 * Truncate a string to maxLen characters, appending '…' if truncated.
 */
export function truncate(str, maxLen = 30) {
  if (!str || str.length <= maxLen) return str ?? '';
  return str.slice(0, maxLen - 1) + '…';
}
