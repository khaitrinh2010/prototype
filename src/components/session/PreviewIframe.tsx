"use client";

interface PreviewIframeProps {
  html: string;
}

export function PreviewIframe({ html }: PreviewIframeProps) {
  return (
    <iframe
      srcDoc={html}
      title="UI Preview"
      sandbox="allow-scripts allow-same-origin"
      className="h-full w-full border-0"
    />
  );
}
