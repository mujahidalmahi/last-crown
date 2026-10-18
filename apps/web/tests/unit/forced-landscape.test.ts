import { describe, it, expect } from 'vitest';
import { ForcedLandscapeView } from '../../src/components/layout/ForcedLandscapeView';

describe('ForcedLandscapeView Component', () => {
  it('exports ForcedLandscapeView successfully as a React component function', () => {
    expect(ForcedLandscapeView).toBeDefined();
    expect(typeof ForcedLandscapeView).toBe('function');
  });
});
