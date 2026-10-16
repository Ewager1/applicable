import { useLayoutEffect, useRef } from 'react';
import type { ValidationError } from '../resume/types.ts';

export function ErrorSummary({ errors }: { errors: ValidationError[] | undefined }) {
  const summary = useRef<HTMLElement>(null);
  useLayoutEffect(() => { if (errors) summary.current?.focus(); }, [errors]);
  return <section ref={summary} id="error-summary" className="errors" tabIndex={-1} role="alert" aria-labelledby="error-title" hidden={!errors}>
    <h2 id="error-title">A few details need your attention</h2>
    <ul id="error-list">{errors?.map((error, index) => <li key={index}>{error.line ? `Line ${error.line}: ${error.message}` : error.message}</li>)}</ul>
  </section>;
}

export function Status({ message }: { message: string }) {
  return <p id="status" className="status" role="status" aria-live="polite" aria-atomic="true">{message}</p>;
}
