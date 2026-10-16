import { useLayoutEffect, useRef } from 'react';
import type { PdfArtifact } from './useResumePdf.ts';

export function PdfResult({ artifact }: { artifact: PdfArtifact | undefined }) {
  const download = useRef<HTMLAnchorElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const deliveredUrl = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    // Delivery runs only after the link is committed, once per artifact even if
    // React replays effects during development lifecycle checks.
    if (!artifact || deliveredUrl.current === artifact.url) return;
    deliveredUrl.current = artifact.url;
    download.current?.click();
    title.current?.focus();
  }, [artifact]);
  const inlinePreview = navigator.pdfViewerEnabled;
  return (
    <div className="document-preview">
      <section id="preview-empty" aria-labelledby="preview-empty-title" hidden={!!artifact}>
        <h2 id="preview-empty-title">Document preview</h2>
        <p>Your PDF will appear here after you create it.</p>
      </section>
      <section id="result" className="result" aria-labelledby="result-title" hidden={!artifact}>
        <div className="result-top">
          <div>
            <h2 ref={title} id="result-title" tabIndex={-1}>
              Your resume PDF
            </h2>
          </div>
          <a
            ref={download}
            id="download"
            className="download"
            href={artifact?.url}
            download={artifact?.filename}
          >
            Download PDF <span aria-hidden="true">↓</span>
          </a>
        </div>
        {!inlinePreview && (
          <p id="preview-note">Your browser cannot show PDFs here. Use Download PDF.</p>
        )}
        <iframe
          id="preview"
          title="Your generated resume PDF"
          aria-describedby={inlinePreview ? undefined : 'preview-note'}
          hidden={!inlinePreview}
          src={inlinePreview ? artifact?.url : undefined}
        />
      </section>
    </div>
  );
}
