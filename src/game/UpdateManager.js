import { TILE_SIZE, TILE_TYPES, TILE_COLORS, SURFACE_Y } from './constants.js';
import { CollisionDetector } from './CollisionDetector.js';

export class UpdateManager {
  constructor(deps) {
    this.player = deps.player;
    this.world = deps.world;
    this.enemies = deps.enemies;
    this.bullets = deps.bullets;
    this.particles = deps.particles;
    this.hazards = deps.hazards;
    this.teleport = deps.teleport;
    this.input = deps.input;
    this.gameState = deps.gameState;
    this.renderer = deps.renderer;
    this.ui = deps.ui;
    this.baseBuildingX = deps.baseBuildingX;

    this._triggerCollapse = this._triggerCollapse.bind(this);
  }

  update(dt) {
    if (!this.teleport.isTeleporting()) {
      this.player.update(dt, this.world, this.input.getState());
    }

    this.teleport.update(dt, this.player, this.world, this.particles, (cost) => {
      this.ui.showWarning(`✨ 传送成功！消耗 $${cost}`, 2000, 'text-cyan-300');
      this.particles.spawnCircle(this.player.x, this.player.y, '#FFD700', 25, 5);
      this.renderer.shake(2, 0.3);
    });

    this.enemies.update(dt, this.player, this.world);
    this._handleDigging(dt);
    this._handleShooting(dt);
    this._updateBullets(dt);
    this.particles.update(dt);
    this.hazards.update(dt, this.world, this.player, (type, damage) => {
      if (type === 'poison') {
        this.player.takeDamage(damage);
        if (Math.random() < 0.2) {
          this.particles.spawnTrail(this.player.x, this.player.y, '#7CFC00');
        }
      }
    });
    this._checkHazards(dt);
    this._checkCollapses(dt);
    this._checkEnemyKills();
    this._checkLowResources();
  }

  _handleDigging(dt) {
    if (!this.input.getState().dig || this.teleport.isTeleporting()) return;

    const target = this.player.getDigTarget();
    const result = this.world.digTile(target.x, target.y, this.player.drillPower);

    if (result.success) {
      if (result.damaged) {
        this.particles.spawn(
          target.x * TILE_SIZE + TILE_SIZE / 2,
          target.y * TILE_SIZE + TILE_SIZE / 2,
          this._getDustColor(this.world.getTile(target.x, target.y)),
          2,
          1
        );
      }

      if (result.broke) {
        this.gameState.incrementBlocksDug();
        this.renderer.shake(1, 0.1);

        if (result.ore) {
          if (this.player.addOre(result.ore)) {
            this.particles.spawn(
              target.x * TILE_SIZE + TILE_SIZE / 2,
              target.y * TILE_SIZE + TILE_SIZE / 2,
              this._getOreColor(result.ore),
              10,
              3
            );
            this.particles.spawnCircle(
              target.x * TILE_SIZE + TILE_SIZE / 2,
              target.y * TILE_SIZE + TILE_SIZE / 2,
              this._getOreColor(result.ore),
              6,
              2
            );
          } else {
            this.ui.showWarning('📦 货仓已满！返回地面出售矿石', 2000);
          }
        } else {
          this.particles.spawn(
            target.x * TILE_SIZE + TILE_SIZE / 2,
            target.y * TILE_SIZE + TILE_SIZE / 2,
            this._getDustColor(this.world.getTile(target.x, target.y)),
            6,
            2
          );
        }

        if (result.hazard === 'poison') {
          this.hazards.spawnPoisonClouds(
            target.x * TILE_SIZE + TILE_SIZE / 2,
            target.y * TILE_SIZE + TILE_SIZE / 2,
            5
          );
          this.ui.showWarning('☠️ 毒气释放！小心绿色毒云', 2500);
        }

        if (result.hazard === 'instability') {
          this.hazards.addCollapseWarning(target.x, target.y);
          setTimeout(() => this._triggerCollapse(target.x, target.y), 1000);
        }

        this.player.fuel -= this.player.fuelConsumption * 0.5 * dt * 60;
        this.player.addHeat(this.player.heatGeneration * 0.3 * dt * 60);
      }
    } else if (result.tooHard) {
      this.ui.showWarning('⛏️ 钻头等级不够，无法挖掘此方块！', 1000);
      this.input.resetDig();
    }
  }

  _handleShooting(dt) {
    if (!this.input.getState().shoot || this.teleport.isTeleporting()) return;

    const now = performance.now();
    let dirX = 0, dirY = 0;
    switch (this.player.facing) {
      case 'up': dirY = -1; break;
      case 'down': dirY = 1; break;
      case 'left': dirX = -1; break;
      case 'right': dirX = 1; break;
    }

    const bullet = this.player.shoot(now, dirX, dirY);
    if (bullet) {
      this.bullets.push(bullet);
      this.particles.spawn(
        this.player.x + dirX * TILE_SIZE * 0.5,
        this.player.y + dirY * TILE_SIZE * 0.5,
        '#FFD700',
        3,
        2,
        { gravity: 0, lifeMin: 8, lifeMax: 15 }
      );
    }
  }

  _updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life -= dt * 60;

      if (CollisionDetector.bulletHitsWorld(b, this.world)) {
        this.particles.spawn(b.x, b.y, '#FFD700', 4, 2, { gravity: 0, lifeMin: 5, lifeMax: 10 });
        this.bullets.splice(i, 1);
        continue;
      }

      if (this.enemies.checkBulletCollision(b)) {
        this.particles.spawnCircle(b.x, b.y, '#FF4444', 8, 3);
        this.renderer.shake(0.5, 0.1);
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }
  }

  _getDustColor(tile) {
    const colors = TILE_COLORS[tile];
    if (colors && colors.length > 0) return colors[0];
    return '#8B4513';
  }

  _getOreColor(oreType) {
    const colorMap = {
      coal: '#2F2F2F',
      iron: '#B87333',
      gold: '#FFD700',
      emerald: '#50C878',
      ruby: '#E0115F',
      diamond: '#00CED1'
    };
    return colorMap[oreType] || '#FFFFFF';
  }

  _checkHazards(dt) {
    const px = this.player.tileX;
    const py = this.player.tileY;
    const lavaCount = CollisionDetector.getLavaHeat(px, py, this.world);
    if (lavaCount > 0) {
      this.player.addHeat(2 * dt * 60);
    }
  }

  _checkCollapses(dt) {
    this.gameState.collapseTimer += dt;
    if (this.gameState.collapseTimer < 0.5) return;
    this.gameState.collapseTimer = 0;

    const collapses = this.world.checkCollapse(this.player.tileX, this.player.tileY);
    for (const c of collapses) {
      const tile = this.world.getTile(c.x, c.y);
      if (tile !== TILE_TYPES.EMPTY && tile !== TILE_TYPES.CAVE) {
        this.hazards.addCollapseWarning(c.x, c.y);
        const delay = 500 + Math.random() * 500;
        setTimeout(() => this._triggerCollapse(c.x, c.y), delay);
      }
    }
  }

  _triggerCollapse(x, y) {
    if (!this.world.inBounds(x, y)) return;
    const tile = this.world.getTile(x, y);
    if (tile === TILE_TYPES.BEDROCK || tile === TILE_TYPES.EMPTY || tile === TILE_TYPES.CAVE) return;

    this.ui.showWarning('💥 塌方！', 800);
    this.renderer.shake(3, 0.5);

    const damage = CollisionDetector.collapseDamage(this.player.x, this.player.y, x, y);
    if (damage > 0) {
      this.player.takeDamage(damage);
    }

    this.enemies.damageEnemyAt(
      (x + 0.5) * TILE_SIZE,
      (y + 0.5) * TILE_SIZE,
      TILE_SIZE * 1.5,
      50
    );

    const idx = this.world.getIndex(x, y);
    this.world.tiles[idx] = TILE_TYPES.EMPTY;
    this.world.tileHealth[idx] = 0;
    this.world.dugTiles[idx] = 1;

    this.particles.spawnCircle(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      this._getDustColor(tile),
      20,
      4
    );
    this.particles.spawn(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      this._getDustColor(tile),
      15,
      5
    );
  }

  _checkEnemyKills() {
    const before = this.enemies.enemies.length;
    const killedEnemies = this.enemies.enemies.filter(e => e.health <= 0);

    for (const e of killedEnemies) {
      this.particles.spawnCircle(e.x, e.y, e.color, 12, 4);
      this.particles.spawn(e.x, e.y, '#FFD700', 6, 3, { gravity: -0.05 });
      this.gameState.incrementEnemiesKilled();
    }

    this.enemies.enemies = this.enemies.enemies.filter(e => e.health > 0);
  }

  _checkLowResources() {
    const p = this.player;
    const depth = p.tileY - SURFACE_Y;

    if (depth > 10) {
      if (p.fuel < p.maxFuel * 0.1) {
        this.gameState.checkAndSetFuelWarned();
      }
      if (p.oxygen < p.maxOxygen * 0.1) {
        this.gameState.checkAndSetOxyWarned();
      }
    }
  }

  setBulletsRef(bullets) {
    this.bullets = bullets;
  }

  setPlayerRef(player) {
    this.player = player;
  }

  setWorldRef(world) {
    this.world = world;
  }
}
