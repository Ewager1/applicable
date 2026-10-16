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
      <p id="preview-note">
        {inlinePreview
          ? 'Preview the same file you download. If your browser cannot show the preview, use Download PDF to open it.'
          : 'Your browser does not display PDFs here. Use Download PDF to open your resume.'}
      </p>
      <iframe
        id="preview"
        title="Your generated resume PDF"
        aria-describedby="preview-note"
        hidden={!inlinePreview}
        src={inlinePreview ? artifact?.url : undefined}
      />
    </section>
  );
}
