import { useLayoutEffect, useRef, useState } from 'react';
import instructions from '../../examples/chatbot-instruction.md?raw';

export function ChatbotInstructions() {
  const [status, setStatus] = useState('');
  const [showFallback, setShowFallback] = useState(false);
  const fallback = useRef<HTMLPreElement>(null);
  useLayoutEffect(() => {
    if (showFallback) fallback.current?.focus();
  }, [showFallback]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(instructions);
      setStatus(
        'Instructions copied. Paste them into ChatGPT or another chatbot with your current resume.',
      );
    } catch {
      setShowFallback(true);
      fallback.current?.focus();
      setStatus('Select and copy the instructions below.');
    }
  }
  return (
    <details className="format-help" open>
      <summary>Start with your chatbot</summary>
      <div className="help-content">
        <ol>
          <li>
            Copy the instructions below. Paste them into ChatGPT or another chatbot together with
            your current resume.
          </li>
          <li>
            Ask the chatbot to format your complete resume. Use its code block’s Copy button to copy
            all of the returned text.
          </li>
          <li>
            Enter your contact details, paste the six body sections into{' '}
            <strong>Your resume</strong> below, then choose <strong>Create PDF</strong>.
          </li>
        </ol>
        <button
          id="copy-instructions"
          className="secondary"
          type="button"
          onClick={() => void copy()}
        >
          Copy chatbot instructions
        </button>
        <p id="copy-status" role="status" aria-live="polite">
          {status}
        </p>
        <pre
          ref={fallback}
          id="instructions-fallback"
          tabIndex={0}
          role="region"
          aria-label="Chatbot instructions to copy"
          hidden={!showFallback}
        >
          {showFallback ? instructions : ''}
        </pre>
      </div>
    </details>
  );
}
