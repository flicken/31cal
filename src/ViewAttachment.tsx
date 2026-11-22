import React from 'react';
import { Attachment } from './models/types';

/** Only Google Drive/Docs previews are embedded; anything else is a plain link. */
const EMBEDDABLE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);

export function embeddableUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !EMBEDDABLE_HOSTS.has(u.hostname)) return;
    u.pathname = u.pathname.replace(/\/view$/, '/preview');
    return u.toString();
  } catch {
    return;
  }
}

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function ViewAttachmentInner({ url }: { url: string }) {
  if (url.startsWith('?')) {
    const gmailUrl = `https://mail.google.com/mail/?${url.replace(/.*\?/, '')}`;
    return (
      <div>
        Gmail attachment:{' '}
        <ExternalLink href={gmailUrl}>open in Gmail</ExternalLink>
      </div>
    );
  }
  const embed = embeddableUrl(url);
  if (!embed) {
    return /^https?:/i.test(url) ? (
      <div>
        <ExternalLink href={url}>{url}</ExternalLink>
      </div>
    ) : (
      <div>{url}</div>
    );
  }
  return (
    <iframe
      title="Attachment preview"
      style={{ width: '100%', aspectRatio: '1 / 1', border: '1px solid #ccc' }}
      sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      allowFullScreen
      src={embed}
      loading="lazy"
    />
  );
}

export function ViewAttachment({ attachment }: { attachment: Attachment }) {
  return (
    <div>
      {attachment.title ? <h3>{attachment.title}</h3> : undefined}
      <ViewAttachmentInner url={attachment.fileUrl} />
    </div>
  );
}
