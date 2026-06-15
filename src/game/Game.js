import { TILE_SIZE, WORLD_WIDTH, WORLD_HEIGHT, SURFACE_Y, TILE_TYPES } from './constants.js';
import { World } from './world.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Renderer } from './renderer.js';
import { UIManager } from './ui.js';
import { ParticleSystem } from './particles.js';
import { HazardManager } from './hazards.js';
import { TeleportSystem } from './teleport.js';
import { InputHandler } from './InputHandler.js';
import { GameState } from './GameState.js';
import { UpdateManager } from './UpdateManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.ui = new UIManager(this);

    this.gameState = new GameState();
    this.inputHandler = new InputHandler();

    this.particles = new ParticleSystem();
    this.hazards = new HazardManager();
    this.teleport = new TeleportSystem();

    this.baseBuildingX = Math.floor(WORLD_WIDTH / 2) - 3;
    this.bullets = [];

    this._setupInputHandler();
    this.init();
  }

  _setupInputHandler() {
    this.inputHandler.setup({
      onTeleport: () => this.tryTeleport(),
      onCancelTeleport: () => this.cancelTeleport(),
      onToggleShop: () => this._toggleShop(),
      isRunning: () => this.gameState.running,
      isTeleporting: () => this.teleport.isTeleporting()
    });
  }

  _toggleShop() {
    if (this.ui.isShopOpen()) {
      this.ui.closeShop();
    } else {
      this.ui.openShop();
    }
  }

  init() {
    const seed = Date.now();
    this.world = new World(seed);

    const startX = Math.floor(WORLD_WIDTH / 2);
    const startY = SURFACE_Y - 1;

    for (let dy = 0; dy < 5; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = startX + dx;
        const ty = SURFACE_Y + dy;
        if (this.world.inBounds(tx, ty)) {
          const idx = this.world.getIndex(tx, ty);
          this.world.tiles[idx] = TILE_TYPES.EMPTY;
          this.world.tileHealth[idx] = 0;
          this.world.dugTiles[idx] = 1;
        }
      }
    }

    this.player = new Player(startX, startY);
    this.enemies = new EnemyManager();
    this.bullets = [];
    this.particles.clear();
    this.hazards.clear();
    this.teleport = new TeleportSystem();
    this.gameState.resetStats();

    this.updateManager = new UpdateManager({
      player: this.player,
      world: this.world,
      enemies: this.enemies,
      bullets: this.bullets,
      particles: this.particles,
      hazards: this.hazards,
      teleport: this.teleport,
      input: this.inputHandler,
      gameState: this.gameState,
      renderer: this.renderer,
      ui: this.ui,
      baseBuildingX: this.baseBuildingX
    });
  }

  get paused() {
    return this.gameState.paused;
  }

  set paused(value) {
    this.gameState.paused = value;
  }

  get running() {
    return this.gameState.running;
  }

  set running(value) {
    this.gameState.running = value;
  }

  get stats() {
    return this.gameState.stats;
  }

  get input() {
    return this.inputHandler.keys;
  }

  tryTeleport() {
    if (!this.gameState.running || this.gameState.paused) return;
    const depth = Math.max(0, this.player.tileY - SURFACE_Y);
    if (depth < 2) {
      this.ui.showWarning('已在地面，无需传送', 1500);
      return;
    }

    const result = this.teleport.start(this.player);
    if (result.success) {
      this.ui.showWarning(`传送启动中...消耗 $${result.cost}`, 1500, 'text-purple-300');
      this.particles.spawnCircle(this.player.x, this.player.y, '#9B59B6', 15, 4);
    } else {
      this.ui.showWarning(`传送失败: ${result.reason}`, 2000);
    }
  }

  cancelTeleport() {
    if (this.teleport.cancel()) {
      this.ui.showWarning('传送已取消', 1000);
    }
  }

  start() {
    this.gameState.start();
    this.ui.showHUD();
    this.ui.hideGameOver();
    this.loop();
  }

  loop() {
    if (!this.gameState.running) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.gameState.lastTime) / 1000);
    this.gameState.lastTime = now;

    if (!this.gameState.paused) {
      this.updateManager.update(dt);
    }

    this.renderer.render(
      dt,
      this.world,
      this.player,
      this.enemies.enemies,
      this.bullets,
      this.particles,
      this.baseBuildingX,
      this.hazards,
      this.teleport
    );

    this.ui.updateHUD();

    if (this.player.health <= 0) {
      this.gameOver();
      return;
    }

    requestAnimationFrame(() => this.loop());
  }

  gameOver() {
    this.gameState.stop();
    this.ui.hideHUD();
    this.ui.showGameOver({
      gold: this.player.gold,
      maxDepth: this.player.maxDepth,
      enemiesKilled: this.gameState.stats.enemiesKilled,
      blocksDug: this.gameState.stats.blocksDug
    });
  }

  restart() {
    this.init();
    this.ui.hideGameOver();
    this.start();
  }
}
