import React from 'react';
import { Attachment } from './models/types';

function ViewAttachmentInner({ url }: { url: string }) {
  const [showAnyway, setShowAnyway] = React.useState(false);
  const viewShowAnyway = (
    <a
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        setShowAnyway(true);
        e.preventDefault();
      }}
    >
      show anyway
    </a>
  );
  if (url.startsWith('?') && !showAnyway) {
    const maybeUrl = `http://mail.google.com/?${url.replace(/.*\?/, '')}`;
    return (
      <div>
        Unlikely to be able to view Gmail attachment{' '}
        <a href={maybeUrl}>{url}</a>, {viewShowAnyway}?
      </div>
    );
  }
  if (url.startsWith('https://mail.google.com') && !showAnyway) {
    return (
      <div>
        Unlikely to be able to view Gmail attachment <a href={url}>{url}</a>,{' '}
        {viewShowAnyway}?
      </div>
    );
  }
  return (
    <iframe
      style={{ width: '50vw', height: '50vw' }}
      allowFullScreen={true}
      src={url.replaceAll('view', 'preview')}
      loading="lazy"
    />
  );
}



export function ViewAttachment({ attachment }: { attachment: Attachment; }) {
  return (
    <div>
      {attachment.title ? <h1>{attachment.title}</h1> : undefined}
      <ViewAttachmentInner url={attachment.fileUrl} />
    </div>
  );
}
