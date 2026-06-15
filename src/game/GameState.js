export class GameState {
  constructor() {
    this.paused = false;
    this.running = false;
    this.lastTime = 0;

    this.stats = {
      blocksDug: 0,
      enemiesKilled: 0
    };

    this.collapseTimer = 0;

    this._fuelWarned = false;
    this._oxyWarned = false;
  }

  resetStats() {
    this.stats = { blocksDug: 0, enemiesKilled: 0 };
    this.collapseTimer = 0;
    this._fuelWarned = false;
    this._oxyWarned = false;
  }

  start() {
    this.running = true;
    this.lastTime = performance.now();
  }

  stop() {
    this.running = false;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  incrementBlocksDug() {
    this.stats.blocksDug++;
  }

  incrementEnemiesKilled(count = 1) {
    this.stats.enemiesKilled += count;
  }

  isRunning() {
    return this.running && !this.paused;
  }

  getStats() {
    return { ...this.stats };
  }

  checkAndSetFuelWarned() {
    if (!this._fuelWarned) {
      this._fuelWarned = true;
      setTimeout(() => {
        this._fuelWarned = false;
      }, 5000);
      return true;
    }
    return false;
  }

  checkAndSetOxyWarned() {
    if (!this._oxyWarned) {
      this._oxyWarned = true;
      setTimeout(() => {
        this._oxyWarned = false;
      }, 5000);
      return true;
    }
    return false;
  }
}
