import { SURFACE_Y } from './constants.js';

export class InputHandler {
  constructor() {
    this.keys = {
      left: false,
      right: false,
      up: false,
      down: false,
      dig: false,
      shoot: false,
      teleport: false
    };

    this._handlers = {
      onTeleport: null,
      onCancelTeleport: null,
      onToggleShop: null,
      isRunning: null,
      isTeleporting: null
    };

    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundKeyUp = this._handleKeyUp.bind(this);
  }

  setup(handlers) {
    this._handlers = { ...this._handlers, ...handlers };
    window.addEventListener('keydown', this._boundKeyDown);
    window.addEventListener('keyup', this._boundKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this._boundKeyDown);
    window.removeEventListener('keyup', this._boundKeyUp);
  }

  _handleKeyDown(e) {
    if (!this._handlers.isRunning || !this._handlers.isRunning()) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keys.left = true;
        this._tryCancelTeleport();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keys.right = true;
        this._tryCancelTeleport();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.keys.up = true;
        this._tryCancelTeleport();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.keys.down = true;
        this._tryCancelTeleport();
        break;
      case ' ':
        this.keys.dig = true;
        this._tryCancelTeleport();
        e.preventDefault();
        break;
      case 'x':
      case 'X':
        this.keys.shoot = true;
        this._tryCancelTeleport();
        break;
      case 't':
      case 'T':
        if (this._handlers.onTeleport) {
          this._handlers.onTeleport();
        }
        break;
      case 'Escape':
        if (this._handlers.onToggleShop) {
          this._handlers.onToggleShop();
        }
        e.preventDefault();
        break;
    }
  }

  _handleKeyUp(e) {
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.keys.left = false;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.keys.right = false;
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.keys.up = false;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.keys.down = false;
        break;
      case ' ':
        this.keys.dig = false;
        break;
      case 'x':
      case 'X':
        this.keys.shoot = false;
        break;
    }
  }

  _tryCancelTeleport() {
    if (this._handlers.isTeleporting && this._handlers.isTeleporting()) {
      if (this._handlers.onCancelTeleport) {
        this._handlers.onCancelTeleport();
      }
    }
  }

  resetDig() {
    this.keys.dig = false;
  }

  getState() {
    return { ...this.keys };
  }
}
