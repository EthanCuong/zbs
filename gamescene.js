import { globals } from './globals.js';

// Hàm tiện ích xác định hướng từ góc độ (dùng để chọn hoạt ảnh đúng theo hướng nhìn)
export function getDirectionFromAngle(angleDeg) {
    if (angleDeg >= -22.5 && angleDeg < 22.5) return 'right';
    if (angleDeg >= 22.5 && angleDeg < 67.5) return 'dr';
    if (angleDeg >= 67.5 && angleDeg < 112.5) return 'down';
    if (angleDeg >= 112.5 && angleDeg < 157.5) return 'dl';
    if (angleDeg >= 157.5 || angleDeg < -157.5) return 'left';
    if (angleDeg >= -157.5 && angleDeg < -112.5) return 'ul';
    if (angleDeg >= -112.5 && angleDeg < -67.5) return 'up';
    if (angleDeg >= -67.5 && angleDeg < -22.5) return 'ur';
    return 'down'; // hướng mặc định nếu không khớp
}

// Hàm hiển thị cảnh báo cuồng bạo
export function showRageWarning(scene) {
    const warningText = scene.add.text(scene.player.x, scene.player.y - 150, '⚠ WARRIOR MODE ⚠', {
        fontSize: '48px', fill: '#f00', stroke: '#fff', strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);

    scene.tweens.add({
        targets: warningText,
        alpha: { from: 1, to: 0 },
        duration: 400,
        yoyo: true,
        repeat: 10,
        onComplete: () => warningText.destroy()
    });

    scene.rageMode = true;
    scene.zombieSpeed += 20;
    scene.bossRate += 5;

    scene.time.delayedCall(10000, () => {
        scene.zombieSpeed -= 20;
        scene.bossRate -= 5;
        scene.rageMode = false;
    });
}

// Hàm hiển thị hiệu ứng Wave UI
export function showWaveText(scene, waveNumber) {
    const waveText = scene.add.text(scene.player.x, scene.player.y - 100, `Wave ${waveNumber}`, {
        fontSize: '32px', fill: '#ffff00'
    }).setOrigin(0.5).setDepth(100);

    scene.tweens.add({
        targets: waveText,
        alpha: 0,
        y: waveText.y - 50,
        duration: 1000,
        ease: 'Power1',
        onComplete: () => waveText.destroy()
    });
}

// Màn chơi chính
export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.isPaused = false;
        this.zombieSpeed = 40; // tốc độ ban đầu của zombie
        this.bossRate = 2;     // xác suất xuất hiện boss (%)
    }

    preload() {
        // Tải tài nguyên hình ảnh và âm thanh
        this.load.image('player', './assets/phaser-dude.png');     // người chơi
        this.load.image('background', './assets/background.png'); // nền
        this.load.spritesheet('zombie_spawn', './assets/zombie1.png', { frameWidth: 128, frameHeight: 128 }); // xuất hiện
        this.load.spritesheet('zombie_move', './assets/zombie2.png', { frameWidth: 128, frameHeight: 128 });  // di chuyển
        this.load.spritesheet('zombie_dead', './assets/zombie3.png', { frameWidth: 128, frameHeight: 128 });  // chết
        this.load.image('bullet', './assets/bullet7.png');         // đạn
        this.load.audio('bgm', './assets/loop.mp3');                // nhạc nền
        this.load.audio('shoot', './assets/shoot2.mp3');           // âm thanh bắn
    }

    create() {
        // Thiết lập kích thước bản đồ lớn để có hiệu ứng cuộn
        this.cameras.main.setBounds(0, 0, 1600, 1200);
        this.physics.world.setBounds(0, 0, 1600, 1200);

        // Nhạc nền
        this.bgm = this.sound.add('bgm', { loop: true, volume: 0.2 });
        this.bgm.play();
        this.shootSound = this.sound.add('shoot');

        // Khởi tạo máu, điểm, và thời gian chơi
        this.hp = 100;
        globals.score = 0;
        this.timer = 0;

        // Thêm hình nền và phóng lớn nó cho vừa bản đồ
        this.add.image(800, 600, 'background').setDisplaySize(1600, 1200);

        // Tạo nhân vật người chơi ở giữa map
        this.player = this.physics.add.sprite(800, 600, 'player').setScale(0.5).setCollideWorldBounds(true);
        this.cameras.main.startFollow(this.player); // Camera đi theo người chơi

        // Khi nhấp chuột: bắn theo hướng con trỏ
        this.input.on('pointerdown', pointer => {
            if (!this.isPaused) {
                const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
                this.fireBullet(angle);
            }
        });

        // Tạo nhóm zombie, boss và đạn
        this.zombies = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.bosses = this.physics.add.group();


        // Hiển thị chỉ số: máu, điểm, thời gian
        this.hpText = this.add.text(10, 10, '血が: 100', { fontSize: '20px', fill: '#fff' }).setScrollFactor(0);
        this.scoreText = this.add.text(10, 40, 'スコア: 0', { fontSize: '20px', fill: '#fff' }).setScrollFactor(0);
        this.timerText = this.add.text(10, 70, '生存時間: 0秒', { fontSize: '20px', fill: '#fff' }).setScrollFactor(0);

        // Hiển thị trạng thái Pause
        this.pauseText = this.add.text(400, 300, 'PAUSED', {
            fontSize: '64px',
            fill: '#f00'
        }).setOrigin(0.5).setScrollFactor(0).setVisible(false);

        // Lấy phím điều khiển
        this.keys = this.input.keyboard.addKeys('W,A,S,D,P');

        // Bộ đếm thời gian sống sót (1 giây)
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (!this.isPaused) {
                    this.timer++;
                    this.timerText.setText('生存時間: ' + this.timer + '秒');
                }
            },
            loop: true
        });

        // Bộ đếm spawn zombie riêng biệt
        this.time.addEvent({
            delay: 500,
            callback: () => {
                if (!this.isPaused) {
                    for (let i = 0; i < Math.floor(this.timer / 10) + 1; i++) {
                        this.spawnZombie();
                    }
                }
            },
            loop: true
        });

        this.waveCounter = 0;
        this.lastWaveTime = 0;

        // Sự kiện wave mỗi 30 giây
        this.time.addEvent({
            delay: 30000,
            callback: () => {
                this.waveCounter++;
                showWaveText(this, this.waveCounter);
                showRageWarning(this);
            },
            loop: true
        });

        // Va chạm giữa người chơi và zombie,boss
        this.physics.add.overlap(this.player, this.zombies, this.hitZombie, null, this);
        this.physics.add.overlap(this.player, this.bosses, this.hitZombie, null, this);
        // Va chạm giữa đạn và zombie,boss
        this.physics.add.overlap(this.bullets, this.zombies, this.shootZombie, null, this);
        this.physics.add.overlap(this.bullets, this.bosses, this.shootZombie, null, this);

        // Tạo các hoạt ảnh di chuyển cho zombie theo các hướng
        const directions = ['left', 'ul', 'up', 'ur', 'right', 'dr', 'down', 'dl'];
        // Hoạt ảnh zombie xuất hiện (8 frame mỗi hướng)
        directions.forEach((dir, i) => {
            this.anims.create({
                key: `zombie_spawn_${dir}`,
                frames: this.anims.generateFrameNumbers('zombie_spawn', { start: i * 8, end: i * 8 + 7 }),
                frameRate: 8,
                repeat: 0
            });
        });

        // Hoạt ảnh zombie di chuyển (20 frame mỗi hướng)
        directions.forEach((dir, i) => {
            this.anims.create({
                key: `zombie_${dir}`,
                frames: this.anims.generateFrameNumbers('zombie_move', { start: i * 20, end: i * 20 + 19 }),
                frameRate: 20,
                repeat: -1
            });
        });

        // Hoạt ảnh zombie chết (7 frame mỗi hướng)
        directions.forEach((dir, i) => {
            this.anims.create({
                key: `zombie_dead_${dir}`,
                frames: this.anims.generateFrameNumbers('zombie_dead', { start: i * 7, end: i * 7 + 6 }),
                frameRate: 7,
                repeat: 0
            });
        });

        // Nhóm hiệu ứng xuất hiện zombie
        this.spawnEffects = this.add.group();

        // Tạo zombie ban đầu
        for (let i = 0; i < 15; i++) this.spawnZombie();
    }

    update() {
        if (this.hp <= 0) return;

        // Toggle pause game bằng phím P
        if (Phaser.Input.Keyboard.JustDown(this.keys.P)) {
            this.isPaused = !this.isPaused;
            this.physics.world.isPaused = this.isPaused;
            this.pauseText.setVisible(this.isPaused);
        }

        if (this.isPaused) return;

        // Di chuyển người chơi bằng WASD hoặc phím mũi tên
        this.player.setVelocity(0);
        const cursors = this.input.keyboard.createCursorKeys();
        if (cursors.left.isDown || this.keys.A.isDown) this.player.setVelocityX(-200);
        if (cursors.right.isDown || this.keys.D.isDown) this.player.setVelocityX(200);
        if (cursors.up.isDown || this.keys.W.isDown) this.player.setVelocityY(-200);
        if (cursors.down.isDown || this.keys.S.isDown) this.player.setVelocityY(200);

        // Zombie và boss tự di chuyển về phía người chơi
        const allEnemies = [...this.zombies.getChildren(), ...this.bosses.getChildren()];
        allEnemies.forEach((z) => {
            if (!z.active) return;

            const dx = this.player.x - z.x;
            const dy = this.player.y - z.y;
            this.physics.moveToObject(z, this.player, z.isBoss ? this.zombieSpeed * 0.5 : this.zombieSpeed);

            const angle = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(z.x, z.y, this.player.x, this.player.y));
            const direction = getDirectionFromAngle(angle);

            const animKey = `zombie_${direction}`;
            if (z.anims.getName() !== animKey) z.play(animKey, true);
            z.lastDirection = direction; // Lưu hướng cuối cùng

            z.lastDirection = direction;

            // ✅ Cập nhật thanh máu boss nếu có
            if (z.isBoss && z.healthBar && z.healthBarBg) {
                const hpRatio = Phaser.Math.Clamp(z.hp / 100, 0, 1);
                z.healthBar.width = 60 * hpRatio;
                z.healthBar.x = z.x - 30;
                z.healthBar.y = z.y - 60;
                z.healthBarBg.x = z.x;
                z.healthBarBg.y = z.y - 60;
            }
        });
    }

    // Hàm bắn đạn theo hướng chuột
    fireBullet(angle) {
        const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet');
        this.physics.velocityFromRotation(angle, 400, bullet.body.velocity);
        this.shootSound.play();
    }

    // Tạo zombie và boss ngẫu nhiên gần người chơi nhưng không quá sát, phóng to zombie 0.5 và boss 1.5 lần
    spawnZombie() {
        const minDist = 200;
        const maxDist = 400;
        let angle = Phaser.Math.FloatBetween(0, 2 * Math.PI);
        let distance = Phaser.Math.Between(minDist, maxDist);
        let x = this.player.x + Math.cos(angle) * distance;
        let y = this.player.y + Math.sin(angle) * distance;

        x = Phaser.Math.Clamp(x, 0, 1600);
        y = Phaser.Math.Clamp(y, 0, 1200);

        const angleDeg = Phaser.Math.RadToDeg(Phaser.Math.Angle.Between(x, y, this.player.x, this.player.y));
        const direction = getDirectionFromAngle(angleDeg);

        const isBoss = Phaser.Math.Between(1, 100) <= this.bossRate;
        const spawnSprite = this.add.sprite(x, y, 'zombie_spawn').setScale(isBoss ? 1.5 : 0.5);
        this.spawnEffects.add(spawnSprite); // ✅ Quản lý hiệu ứng trong nhóm
        spawnSprite.play(`zombie_spawn_${direction}`);

        if (!this.anims.exists(`zombie_spawn_${direction}`)) {
            console.warn(`Animation zombie_spawn_${direction} not found`);
            this.spawnZombieDirectly(x, y, direction, isBoss);
            return;
        }

        spawnSprite.on('animationcomplete', () => {
            this.spawnEffects.remove(spawnSprite, true, true);
            const zombie = (isBoss ? this.bosses : this.zombies).create(x, y, 'zombie_move')
                .setScale(isBoss ? 1.5 : 0.5);

            zombie.lastDirection = direction;
            zombie.hp = isBoss ? 100 : 10;
            zombie.isBoss = isBoss;
            zombie.play(`zombie_${direction}`);

            // ✅ Chờ 1 frame để body tạo xong
            this.time.delayedCall(0, () => {
                if (zombie.body) {
                    zombie.body.setSize(isBoss ? 60 : 40, isBoss ? 60 : 40);
                    zombie.body.setOffset(34, 34);
                }
            });

            // Tạo thanh máu nếu là boss
            if (isBoss) {
                const barBg = this.add.rectangle(x, y - 60, 60, 6, 0x550000).setDepth(10);
                const bar = this.add.rectangle(x - 30, y - 60, 60, 6, 0xff0000).setOrigin(0, 0.5).setDepth(11);

                zombie.healthBar = bar;
                zombie.healthBarBg = barBg;
            }
        });
    }

    //hàm sinh zombie thẳng 
    spawnZombieDirectly(x, y, direction, isBoss) {
        const group = isBoss ? this.bosses : this.zombies;
        const zombie = group.create(x, y, 'zombie_move').setScale(isBoss ? 1.5 : 0.5);
        zombie.lastDirection = direction;
        zombie.hp = isBoss ? 100 : 10;
        zombie.isBoss = isBoss;
        zombie.play(`zombie_${direction}`);

        // ✅ Điều chỉnh hitbox
        this.time.delayedCall(0, () => {
            if (zombie.body) {
                zombie.body.setSize(isBoss ? 60 : 40, isBoss ? 60 : 40);// boss to hơn
                zombie.body.setOffset(34, 34);// căn giữa theo thực tế
            }
        });

        // Tạo thanh máu nếu là boss
        if (isBoss) {
            const barBg = this.add.rectangle(x, y - 60, 60, 6, 0x550000).setDepth(10);
            const bar = this.add.rectangle(x - 30, y - 60, 60, 6, 0xff0000).setOrigin(0, 0.5).setDepth(11);

            zombie.healthBar = bar;
            zombie.healthBarBg = barBg;
        }
    }

    // Khi zombie,boss đụng người chơi
    hitZombie(player, zombie) {
        zombie.destroy();
        const damage = zombie.isBoss ? 50 : 10;
        this.hp -= damage;
        this.hpText.setText('血が: ' + this.hp);
        if (this.hp <= 0) this.endGame();
        // ✅ Huỷ thanh máu nếu là boss
        if (zombie.isBoss) {
            if (zombie.healthBar) zombie.healthBar.destroy();
            if (zombie.healthBarBg) zombie.healthBarBg.destroy();
        }
    }

    // Khi đạn bắn trúng zombie
    shootZombie(bullet, zombie) {
        bullet.destroy();
        zombie.hp -= 10;

        if (zombie.hp <= 0) {
            // ✅ Huỷ thanh máu nếu là boss
            if (zombie.isBoss) {
                if (zombie.healthBar) zombie.healthBar.destroy();
                if (zombie.healthBarBg) zombie.healthBarBg.destroy();
            }

            // ✅ Ẩn zombie và hiển thị animation chết
            zombie.disableBody(true, true);
            const dead = this.add.sprite(zombie.x, zombie.y, 'zombie_dead').setScale(zombie.isBoss ? 1 : 0.5);
            const direction = zombie.lastDirection || 'down';
            dead.play(`zombie_dead_${direction}`);
            dead.on('animationcomplete', () => dead.destroy());

            // ✅ Cộng điểm
            globals.score += zombie.isBoss ? 100 : 10;
            this.scoreText.setText('スコア: ' + globals.score);
        }

        // Nếu đang phá kỷ lục thì làm chữ chớp nháy màu xanh
        if (globals.score > globals.bestScore) {
            this.scoreText.setColor('#0f0');
            this.tweens.add({
                targets: this.scoreText,
                alpha: { from: 1, to: 0.2 },
                duration: 200,
                yoyo: true,
                repeat: -1
            });
        }

        if (this.timer > globals.bestTime) {
            this.timerText.setColor('#0f0');
            this.tweens.add({
                targets: this.timerText,
                alpha: { from: 1, to: 0.2 },
                duration: 200,
                yoyo: true,
                repeat: -1
            });
        }
    }

    // Kết thúc game khi máu = 0
    endGame() {
        this.bgm.stop();
        this.scene.start('GameOverScene', { score: globals.score, time: this.timer });

    }
}

