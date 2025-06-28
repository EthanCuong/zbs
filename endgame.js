import { globals } from './globals.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore = data.score;
    this.finalTime = data.time;
  }

  create() {
    // Cập nhật kỷ lục nếu vượt qua
    if (this.finalScore > globals.bestScore) {
      globals.bestScore = this.finalScore;
      localStorage.setItem('bestScore', globals.bestScore);
    }

    if (this.finalTime > globals.bestTime) {
      globals.bestTime = this.finalTime;
      localStorage.setItem('bestTime', globals.bestTime);
    }

    // Hiển thị thông tin kết thúc
    this.add.text(250, 200, '死んだ！', { fontSize: '48px', fill: '#f33' });
    this.add.text(260, 270, `スコア: ${this.finalScore}`, { fontSize: '24px', fill: '#fff' });
    this.add.text(260, 310, `時間: ${this.finalTime}秒`, { fontSize: '24px', fill: '#fff' });

    // kỷ lục 
    this.add.text(260, 350, `最長記録: ${globals.bestTime}秒`, { fontSize: '24px', fill: '#0ff' });
    this.add.text(260, 390, `最高スコア: ${globals.bestScore}`, { fontSize: '24px', fill: '#0ff' });

    // Nút chơi lại
    const restart = this.add.text(280, 430, 'クリックして再チャレンジ', {
      fontSize: '28px',
      fill: '#0f0'
    }).setInteractive();

    restart.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
