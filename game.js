import { globals } from './globals.js';
import { MenuScene } from './menu.js';
import { GameScene } from './gamescene.js';
import { GameOverScene } from './endgame.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#000',
  parent: 'game-container',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: [MenuScene, GameScene, GameOverScene]
};

let game = new Phaser.Game(config);
