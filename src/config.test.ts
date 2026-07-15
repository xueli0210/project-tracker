import { homedir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { dataFilePath, docsRoot } from './config.js';

describe('dataFilePath', () => {
  it('defaults to a hidden dir in home', () => {
    expect(dataFilePath({})).toBe(join(homedir(), '.project-tracker', 'data.json'));
  });

  it('honors PROJECT_TRACKER_HOME', () => {
    expect(dataFilePath({ PROJECT_TRACKER_HOME: '/tmp/pt' })).toBe('/tmp/pt/data.json');
  });
});

describe('docsRoot', () => {
  it('defaults to a visible folder under ~/Documents', () => {
    expect(docsRoot({})).toBe(join(homedir(), 'Documents', 'project-tracker'));
  });

  it('keeps docs beside the data when an isolated home is set', () => {
    expect(docsRoot({ PROJECT_TRACKER_HOME: '/tmp/pt' })).toBe('/tmp/pt/DOCS');
  });

  it('lets PROJECT_TRACKER_DOCS override everything', () => {
    expect(
      docsRoot({ PROJECT_TRACKER_DOCS: '/somewhere/else', PROJECT_TRACKER_HOME: '/tmp/pt' }),
    ).toBe('/somewhere/else');
  });
});
