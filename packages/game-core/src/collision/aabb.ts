import { AABB, Direction, Vector2 } from '@last-crown/shared';

export function checkAABBOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function computeHurtboxAABB(position: Vector2, width: number, height: number): AABB {
  return {
    x: position.x - width / 2,
    y: position.y - height,
    width,
    height,
  };
}

export function computeDirectionalHitboxAABB(
  position: Vector2,
  facing: Direction,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number
): AABB {
  const actualX = facing === 'right' ? position.x + offsetX : position.x - offsetX - width;

  return {
    x: actualX,
    y: position.y + offsetY - height,
    width,
    height,
  };
}
