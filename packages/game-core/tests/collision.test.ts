import { describe, it, expect } from 'vitest';
import {
  checkAABBOverlap,
  computeHurtboxAABB,
  computeDirectionalHitboxAABB,
} from '../src/collision/aabb.js';

describe('Collision and AABB', () => {
  it('detects intersecting bounding boxes correctly', () => {
    const boxA = { x: 100, y: 100, width: 50, height: 50 };
    const boxB = { x: 120, y: 120, width: 50, height: 50 };
    expect(checkAABBOverlap(boxA, boxB)).toBe(true);
    expect(checkAABBOverlap(boxB, boxA)).toBe(true);
  });

  it('detects disjoint bounding boxes as non-intersecting', () => {
    const boxA = { x: 100, y: 100, width: 50, height: 50 };
    const boxB = { x: 200, y: 200, width: 50, height: 50 };
    expect(checkAABBOverlap(boxA, boxB)).toBe(false);
  });

  it('computes directional hitboxes correctly based on facing direction', () => {
    const position = { x: 300, y: 500 };
    const rightBox = computeDirectionalHitboxAABB(position, 'right', 60, 40, 30, 0);
    // When facing right: x is position.x + offsetX = 330
    expect(rightBox.x).toBe(330);
    expect(rightBox.width).toBe(60);

    const leftBox = computeDirectionalHitboxAABB(position, 'left', 60, 40, 30, 0);
    // When facing left: x is position.x - offsetX - width = 300 - 30 - 60 = 210
    expect(leftBox.x).toBe(210);
    expect(leftBox.width).toBe(60);
  });

  it('computes centered hurtbox correctly', () => {
    const position = { x: 500, y: 560 };
    const hurtbox = computeHurtboxAABB(position, 40, 80);
    expect(hurtbox.x).toBe(480); // 500 - 40/2
    expect(hurtbox.y).toBe(480); // 560 - 80
    expect(hurtbox.width).toBe(40);
    expect(hurtbox.height).toBe(80);
  });
});
