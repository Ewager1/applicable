import { existsSync } from 'node:fs';
import husky from 'husky';

// Source ZIPs have no Git metadata; CI does not need local commit hooks.
if (!process.env.CI && process.env.HUSKY !== '0' && existsSync('.git')) {
  const error = husky();
  if (error) throw new Error(error);
}
