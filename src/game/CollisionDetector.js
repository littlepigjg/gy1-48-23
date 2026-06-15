import { TILE_SIZE, TILE_TYPES } from './constants.js';

export class CollisionDetector {
  static pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx - rw / 2 && px <= rx + rw / 2 &&
           py >= ry - rh / 2 && py <= ry + rh / 2;
  }

  static circleCollision(x1, y1, r1, x2, y2, r2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < r1 + r2;
  }

  static distance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static bulletHitsWorld(bullet, world) {
    const tileX = Math.floor(bullet.x / TILE_SIZE);
    const tileY = Math.floor(bullet.y / TILE_SIZE);
    return world.isSolid(tileX, tileY);
  }

  static bulletHitsEnemy(bullet, enemy) {
    const dx = bullet.x - enemy.x;
    const dy = bullet.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < enemy.width / 2 + 4;
  }

  static checkNearbyTiles(playerTileX, playerTileY, world, radius = 1) {
    const results = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = playerTileX + dx;
        const ty = playerTileY + dy;
        const tile = world.getTile(tx, ty);
        results.push({ x: tx, y: ty, tile });
      }
    }
    return results;
  }

  static getLavaHeat(playerTileX, playerTileY, world) {
    const nearby = this.checkNearbyTiles(playerTileX, playerTileY, world, 1);
    const lavaTiles = nearby.filter(t => t.tile === TILE_TYPES.LAVA);
    return lavaTiles.length;
  }

  static collapseDamage(playerX, playerY, collapseX, collapseY) {
    const dx = (collapseX + 0.5) * TILE_SIZE - playerX;
    const dy = (collapseY + 0.5) * TILE_SIZE - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < TILE_SIZE * 1.8) {
      return dist < TILE_SIZE ? 20 : 10;
    }
    return 0;
  }

  static pointInTile(px, py, tileX, tileY) {
    const left = tileX * TILE_SIZE;
    const right = (tileX + 1) * TILE_SIZE;
    const top = tileY * TILE_SIZE;
    const bottom = (tileY + 1) * TILE_SIZE;
    return px >= left && px < right && py >= top && py < bottom;
  }
}
