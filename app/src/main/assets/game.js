/* global Phaser */

import { createAnimations } from "./animations.js"

const config = {
  type: Phaser.AUTO,
  width: 256,
  height: 244,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
  },
  backgroundColor: '#049cd8',
  parent: 'game',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 300 },
      debug: false
    }
  },
  scene: {
    preload, // se ejecuta para precargar recursos
    create, // se ejecuta cuando el juego comienza
    update // se ejecuta en cada frame
  }
}

window.game = new Phaser.Game(config)
// this -> game -> el juego que estamos construyendo

function preload () {
  this.load.image(
    'cloud1',
    'assets/scenery/overworld/cloud1.png'
  )

  this.load.image(
    'floorbricks',
    'assets/scenery/overworld/floorbricks.png'
  )

  this.load.spritesheet(
    'mario', // <--- id
    'assets/entities/mario.png',
    { frameWidth: 18, frameHeight: 16 }
  )

  this.load.image('pipe1', 'assets/scenery/pipe1.png')
  this.load.image('block', 'assets/blocks/overworld/block.png')
  this.load.image('misteryBlock', 'assets/blocks/overworld/misteryBlock.png')
  this.load.image('flagMast', 'assets/scenery/flag-mast.png')
  this.load.image('finalFlag', 'assets/scenery/final-flag.png')
  this.load.image('castle', 'assets/scenery/castle.png')

  this.load.audio('gameover', 'assets/sound/music/gameover.mp3')
  this.load.audio('theme', 'assets/sound/music/overworld/theme.mp3')
  this.load.audio('win', 'assets/sound/music/win.wav')
} // 1.

function create () {
  var levelWidth = 2304
  var floorY = config.height - 16

  // Fondo repetido durante todo el nivel
  for (var cloudX = 100; cloudX < levelWidth; cloudX += 280) {
    this.add.image(cloudX, 45 + ((cloudX / 280) % 2) * 28, 'cloud1')
      .setOrigin(0, 0)
      .setScale(0.15)
  }

  // Piso continuo: cada textura mide 128 px
  this.floor = this.physics.add.staticGroup()
  for (var floorX = 0; floorX < levelWidth; floorX += 128) {
    this.floor.create(floorX, floorY, 'floorbricks')
      .setOrigin(0, 0.5)
      .refreshBody()
  }

  // Obstaculos y plataformas
  this.obstacles = this.physics.add.staticGroup()
  var pipePositions = [430, 820, 1240, 1650]
  for (var p = 0; p < pipePositions.length; p++) {
    this.obstacles.create(pipePositions[p], floorY - 39, 'pipe1')
      .setOrigin(0, 0.5)
      .refreshBody()
  }

  var blockPositions = [260, 292, 324, 620, 652, 1010, 1042, 1074, 1450, 1482]
  for (var b = 0; b < blockPositions.length; b++) {
    var key = (b % 3 === 1) ? 'misteryBlock' : 'block'
    this.obstacles.create(blockPositions[b], floorY - 70 - ((b % 5 === 4) ? 32 : 0), key)
      .setOrigin(0, 0.5)
      .refreshBody()
  }

  // Meta del nivel
  this.add.image(levelWidth - 210, floorY - 84, 'flagMast').setOrigin(0.5, 0.5)
  this.add.image(levelWidth - 218, floorY - 145, 'finalFlag').setOrigin(0.5, 0.5)
  this.add.image(levelWidth - 95, floorY - 40, 'castle').setOrigin(0.5, 0.5)

  this.mario = this.physics.add.sprite(50, 100, 'mario')
    .setOrigin(0, 1)
    .setCollideWorldBounds(true)
    .setGravityY(300)

  this.physics.world.setBounds(0, 0, levelWidth, config.height)
  this.physics.add.collider(this.mario, this.floor)
  this.physics.add.collider(this.mario, this.obstacles)

  this.cameras.main.setBounds(0, 0, levelWidth, config.height)
  this.cameras.main.startFollow(this.mario)

  this.levelWidth = levelWidth
  this.hasWon = false
  this.themeMusic = this.sound.add('theme', { volume: 0.25, loop: true })

  createAnimations(this)

  this.keys = this.input.keyboard.createCursorKeys()

  // Unlock audio on first touch/click (mobile requirement)
  this.input.once('pointerdown', () => {
    if (this.sound.context && this.sound.context.state === 'suspended') {
      this.sound.context.resume()
    }
    if (this.themeMusic && !this.themeMusic.isPlaying) {
      this.themeMusic.play()
    }
  })
}

function update () { // 3. continuamente
  if (this.mario.isDead) return

  // Combinar teclado + controles tactiles (window.touchControls)
  var tc = window.touchControls || {}
  var goLeft = this.keys.left.isDown || tc.left
  var goRight = this.keys.right.isDown || tc.right
  var goJump = this.keys.up.isDown || tc.jump

  if (goLeft) {
    this.mario.anims.play('mario-walk', true)
    this.mario.x -= 2
    this.mario.flipX = true
  } else if (goRight) {
    this.mario.anims.play('mario-walk', true)
    this.mario.x += 2
    this.mario.flipX = false
  } else {
    this.mario.anims.play('mario-idle', true)
  }

  if (goJump && this.mario.body.touching.down) {
    this.mario.setVelocityY(-300)
    this.mario.anims.play('mario-jump', true)
  }

  if (!this.hasWon && this.mario.x >= this.levelWidth - 245) {
    this.hasWon = true
    this.mario.setVelocity(0, 0)
    if (this.themeMusic && this.themeMusic.isPlaying) this.themeMusic.stop()
    this.sound.play('win', { volume: 0.35 })
    this.add.text(this.cameras.main.scrollX + config.width / 2, 85, 'NIVEL COMPLETADO', {
      fontFamily: 'Arial', fontSize: '16px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0)
    setTimeout(() => { this.scene.restart() }, 4500)
    return
  }

  if (this.mario.y >= config.height) {
    this.mario.isDead = true
    this.mario.anims.play('mario-dead')
    this.mario.setCollideWorldBounds(false)
    this.sound.add('gameover', { volume: 0.2 }).play()

    setTimeout(() => {
      this.mario.setVelocityY(-350)
    }, 100)

    setTimeout(() => {
      this.scene.restart()
    }, 2000)
  }
}