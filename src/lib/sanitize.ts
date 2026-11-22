import DOMPurify from 'dompurify';

/**
 * Event descriptions come from anyone who can invite you, so render them with
 * a conservative profile: no forms or inputs (fake login prompts), no remote
 * images (tracking pixels), no styles; links open in a new tab without a
 * referrer.
 */
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeDescription(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: [
      'form',
      'input',
      'button',
      'textarea',
      'select',
      'img',
      'style',
      'svg',
      'math',
      'iframe',
    ],
    FORBID_ATTR: ['style', 'srcset'],
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:)/i,
  });
}
