import { describe, it, expect } from 'vitest';
import { Button } from '../../src/components/ui/Button.js';
import { Badge } from '../../src/components/ui/Badge.js';
import { Card } from '../../src/components/ui/Card.js';

describe('Web UI Components', () => {
  it('exports Button component successfully', () => {
    expect(Button).toBeDefined();
  });

  it('exports Badge component successfully', () => {
    expect(Badge).toBeDefined();
  });

  it('exports Card component successfully', () => {
    expect(Card).toBeDefined();
  });
});
