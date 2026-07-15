import { randomBytes } from 'node:crypto';

/** Short, collision-resistant id with a type prefix, e.g. `p_1a2b3c4d`. */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(4).toString('hex')}`;
}
