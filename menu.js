export class MenuScene extends Phaser.Scene {
  constructor() { super('MenuScene'); }
  preload() {
    // Tải hình ảnh nút bắt đầu
    this.load.image('startBtn', './assets/playbutton.png'); // nút bắt đầu
    this.load.image('menu', './assets/backgroundmenu.jpg'); // hình nền
    this.load.audio('bgmenu', './assets/loopmenu.mp3');     // nhạc nền menu
  }
  create() {
    // Bắt buộc: đợi người dùng tương tác trước khi phát nhạc
    this.input.once('pointerdown', () => {
      if (this.sound.context.state === 'suspended') {
        this.sound.context.resume();
      }

      this.sound.stopAll(); // dừng tất cả âm thanh đang phát (nếu có)
      this.sound.add('bgmenu', { loop: true }).play(); // phát nhạc nền menu lặp lại
    }, this);

    this.add.image(400, 300, 'menu').setDisplaySize(800, 600); // Nền menu

    // Thêm nút bắt đầu và hiệu ứng tương tác
    const start = this.add.image(400, 460, 'startBtn')
      .setInteractive()
      .setScale(0.5);
    start.on('pointerover', () => start.setScale(0.55));
    start.on('pointerout', () => start.setScale(0.5));

    // Bấm bắt đầu game
    start.on('pointerdown', () => {
      this.sound.stopAll(); // Dừng nhạc menu nếu chuyển cảnh
      this.scene.start('GameScene');
    });
  }
}
