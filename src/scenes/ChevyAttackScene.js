// Thursday: Chevy rips the stall door off. A cutscene with no controls, in the
// same side view as the Avoid Chevy minigame. Ben shuts himself in, Chevy's
// shadow gets there first, the hinge gives out, and the whole screen goes black.
// When it's over it stays up, black, until the world has loaded the next map
// (WorldScene.playCutscene), so the bathroom never flashes back on.

const ATTACK_STALL_X = CHEVY_STALLS[CHEVY_BEN_STALL];
const ATTACK_HINGE_X = ATTACK_STALL_X - 37;     // Ben's door swings from its left edge
const ATTACK_DOOR_W = 74;
const ATTACK_DOOR_H = DOOR_BOTTOM - DOOR_TOP;
const ATTACK_BEN_FEET = DOOR_BOTTOM + 8;        // his boots show under the door
const ATTACK_BEN_UP = DOOR_BOTTOM - 8;          // standing on the toilet, boots out of sight
const ATTACK_CHEVY_SCALE = 4;
const ATTACK_CHEVY_X = 104;                     // beside the hinges, where he stops
const ATTACK_CHEVY_FEET = 172;
const ATTACK_STOMPS = 6;
const ATTACK_STEP = 25;                         // pixels per stomp
const ATTACK_STEP_MS = 380;
const ATTACK_SHADOW_LEAD = 190;                 // how far his shadow gets ahead of him
const ATTACK_SCREW_MS = [320, 260, 200, 140];   // the wait before each screw pops
const ATTACK_BLACK_MS = 1600;                   // how long the screen stays black
const STEEL = 0x9aa4a8, STEEL_DARK = 0x5a6468;

class ChevyAttackScene extends Cutscene {
  constructor() { super('ChevyAttack'); }

  create(data) {
    this.done = data.done;
    this.finished = false;
    this.text = CONTENT.cutscenes.chevyAttack;
    this.cameras.main.setBackgroundColor('#000000');
    drawStallRoom(this);
    this.buildStalls();

    this.ben = this.add.sprite(ATTACK_STALL_X, ATTACK_BEN_FEET, Ben.texture(), 'down_0').setOrigin(0.5, 1).setScale(2).setDepth(3);
    this.chevy = this.add.sprite(ATTACK_CHEVY_X - ATTACK_STOMPS * ATTACK_STEP, ATTACK_CHEVY_FEET, 'npc_chevy', 'side_0')
      .setOrigin(0.5, 1).setScale(ATTACK_CHEVY_SCALE).setDepth(10);
    // His shadow, thrown across the stalls ahead of him.
    this.shadow = this.add.sprite(this.shadowX(), DOOR_BOTTOM + 10, 'npc_chevy', 'side_0')
      .setOrigin(0.5, 1).setScale(6).setDepth(6).setTintFill(0x000000).setAlpha(0).setFlipX(true);
    this.arms = this.add.graphics().setDepth(11);
    this.lights = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0).setOrigin(0).setDepth(20);

    this.input.keyboard.on('keydown', e => { if (DEBUG && e.code === 'BracketRight') this.goBlack(); });
    this.run();
  }

  // Ben's stall with the back wall and toilet showing, his door, and the two doors beside it.
  buildStalls() {
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x2f423b).fillRect(ATTACK_HINGE_X, DOOR_TOP, ATTACK_DOOR_W, ATTACK_DOOR_H + 10);
    g.fillStyle(0x181425).fillRect(149, 83, 22, 37);
    g.fillStyle(0xe8ece8).fillRect(150, 84, 20, 18).fillRect(150, 103, 20, 16);
    g.fillStyle(0xb8c4c0).fillRect(150, 100, 20, 2).fillRect(153, 110, 14, 1);

    this.farDoors = CHEVY_STALLS.filter((x, i) => i !== CHEVY_BEN_STALL).map(x => this.add.container(x, DOOR_TOP, [
      this.add.rectangle(-37, 0, ATTACK_DOOR_W, ATTACK_DOOR_H, 0x6a8a80).setOrigin(0, 0).setStrokeStyle(1, 0x2a4a40),
      this.add.rectangle(24, 34, 6, 3, 0x40a040),
    ]).setDepth(5));

    this.lock = this.add.rectangle(61, 34, 6, 3, 0x40a040);
    const hinges = this.add.graphics().fillStyle(STEEL).fillRect(0, 8, 5, 6).fillRect(0, ATTACK_DOOR_H - 14, 5, 6);
    this.door = this.add.container(ATTACK_HINGE_X, DOOR_TOP, [
      this.add.rectangle(0, 0, ATTACK_DOOR_W, ATTACK_DOOR_H, 0x6a8a80).setOrigin(0, 0).setStrokeStyle(1, 0x2a4a40),
      this.lock, hinges,
    ]).setDepth(5);
    this.door.scaleX = 0.12;   // starts wide open
  }

  async run() {
    this.cameras.main.fadeIn(300);
    await this.wait(500);
    await this.shutDoor();
    await this.chevyComesIn();
    await this.standoff();
    await this.hinge();
    await this.doorGone();
    await this.bearHug();
    await this.goBlack();
  }

  // Ben pulls the door shut and locks it.
  async shutDoor() {
    Sound.creak();
    await this.tween({ targets: this.door, scaleX: 1, duration: 550, ease: 'Sine.easeInOut' });
    Sound.kick();
    await this.wait(250);
    this.lock.setFillStyle(0xc8323a);
    Sound.tick();
    await this.wait(300);
    await this.say('ben', ATTACK_STALL_X, 18, this.text.safe, 700);
    await this.wait(400);
  }

  shadowX() {
    return Math.min(ATTACK_STALL_X, this.chevy.x + ATTACK_SHADOW_LEAD);
  }

  // One heavy step: he lifts and comes down, the floor shakes and the lights dip.
  stomp() {
    Sound.stomp();
    this.cameras.main.shake(110, 0.003);
    this.lights.setFillStyle(0x000000, 0.14);
    this.tweens.add({ targets: this.lights, fillAlpha: 0, duration: 200 });
    this.tweens.add({ targets: this.chevy, y: ATTACK_CHEVY_FEET - 6, duration: 110, yoyo: true, ease: 'Sine.easeOut' });
  }

  // Stomps from off screen. His shadow crosses the stalls before he shows up.
  async chevyComesIn() {
    Sound.creak();    // the bathroom door
    this.tweens.add({ targets: this.shadow, alpha: 0.42, duration: 600 });
    await this.wait(700);
    Music.play('tense');
    for (let i = 0; i < ATTACK_STOMPS; i++) {
      this.stomp();
      this.tweens.add({
        targets: this.chevy, x: this.chevy.x + ATTACK_STEP, duration: 220, ease: 'Sine.easeOut',
        onUpdate: () => this.shadow.setX(this.shadowX()),
      });
      await this.wait(ATTACK_STEP_MS);
    }
  }

  async knock() {
    for (let i = 0; i < 2; i++) {
      Sound.knock();
      this.door.x = ATTACK_HINGE_X + 1;
      await this.wait(70);
      this.door.x = ATTACK_HINGE_X;
      await this.wait(160);
    }
  }

  // He stops at the door and the music cuts out. Ben pulls his feet up, then the knock.
  async standoff() {
    const bubbleX = this.chevy.x - 58, bubbleY = 92;
    Music.stop();
    this.chevy.setFrame('up_0');
    await this.wait(500);
    await this.say('chevy', bubbleX, bubbleY, this.text.call, 300);
    await this.tween({ targets: this.ben, y: ATTACK_BEN_UP, duration: 140, ease: 'Quad.easeOut' });
    await this.wait(450);
    await this.knock();
    await this.say('chevy', bubbleX, bubbleY, this.text.knock, 400);
    await this.say('ben', ATTACK_STALL_X, 18, this.text.occupied, 600);
    await this.say('chevy', bubbleX, bubbleY, this.text.know, 300);
    Sound.kick();
    this.door.x = ATTACK_HINGE_X + 1;
    await this.wait(250);
  }

  // Close-up of the top hinge: the door jerks and the screws pop out.
  async hinge() {
    const view = this.add.container(0, 0).setDepth(50);
    const back = this.add.graphics();
    back.fillStyle(0x101818).fillRect(0, 0, GAME_W, GAME_H);
    back.fillStyle(0x4a6a60).fillRect(0, 0, 130, GAME_H);
    for (let y = 12; y < GAME_H; y += 24) back.fillStyle(0x3a5a50).fillRect(0, y, 130, 2);
    back.fillStyle(STEEL_DARK).fillRect(94, 42, 38, 96);
    back.fillStyle(STEEL).fillRect(96, 44, 34, 92);
    for (const y of [60, 112]) this.drawScrew(back, 112, y);
    back.fillStyle(STEEL_DARK).fillRect(128, 38, 12, 104);   // the hinge barrel
    back.fillStyle(0xc8d0d4).fillRect(131, 38, 3, 104);
    view.add(back);

    const door = this.add.container(0, 0);
    const face = this.add.graphics();
    face.fillStyle(0x6a8a80).fillRect(138, 0, GAME_W, GAME_H);
    face.fillStyle(0x5a7a70).fillRect(138, 0, 3, GAME_H);
    face.fillStyle(STEEL_DARK).fillRect(138, 42, 38, 96);
    face.fillStyle(STEEL).fillRect(138, 44, 36, 92);
    door.add(face);
    const screws = [60, 82, 104, 126].map(y => {
      const g = this.add.graphics({ x: 156, y });
      this.drawScrew(g, 0, 0);
      door.add(g);
      return g;
    });
    view.add(door);

    Sound.groan(0.8);
    for (let i = 0; i < screws.length; i++) {
      await this.wait(ATTACK_SCREW_MS[i]);
      Sound.ping(1500 + i * 350);
      this.cameras.main.shake(70, 0.004);
      door.x += 4 + i * 2;
      this.popScrew(view, screws[i]);
    }
    await this.wait(120);
    Sound.kick();
    await this.tween({ targets: door, x: GAME_W, duration: 130, ease: 'Quad.easeIn' });
    view.destroy();
  }

  drawScrew(g, x, y) {
    g.fillStyle(0x303840).fillCircle(x, y, 7);
    g.fillStyle(0xc8d0d4).fillCircle(x, y, 6);
    g.fillStyle(0x303840).fillRect(x - 5, y - 1, 10, 2);
  }

  // A screw flies off the plate.
  popScrew(view, screw) {
    const at = screw.getWorldTransformMatrix();
    screw.parentContainer.remove(screw);
    view.add(screw);
    screw.setPosition(at.tx, at.ty);
    this.tweens.add({
      targets: screw, x: at.tx + Phaser.Math.Between(-90, 90), y: at.ty - Phaser.Math.Between(40, 90),
      angle: 900, alpha: 0, duration: 340, ease: 'Quad.easeOut',
    });
  }

  // A burst of little squares of dust.
  dust(parent, x, y, count, reach) {
    for (let i = 0; i < count; i++) {
      const bit = this.add.rectangle(x, y, 2, 2, 0xd0d8d0);
      parent.add(bit);
      this.tweens.add({
        targets: bit, x: x + Phaser.Math.Between(-reach, reach), y: y + Phaser.Math.Between(-reach, reach),
        alpha: 0, duration: Phaser.Math.Between(250, 500), onComplete: () => bit.destroy(),
      });
    }
  }

  // Chevy's arms, up beside his head to the door he's holding.
  drawArms(top) {
    const bottom = ATTACK_CHEVY_FEET - 42;
    const g = this.arms.clear();
    for (const x of [this.chevy.x - 30, this.chevy.x + 20]) {
      g.fillStyle(0x181425).fillRect(x - 1, top, 12, bottom - top + 1);
      g.fillStyle(0xe8b890).fillRect(x, top, 10, bottom - top);
      g.fillStyle(0x2c2c34).fillRect(x, bottom - 12, 10, 12);
    }
  }

  // Back to the wide shot: the door is over Chevy's head and Ben has nowhere to
  // go. One screw bounces away, then the door goes across the room.
  async doorGone() {
    const overhead = { x: this.chevy.x - 37, y: 6 };
    this.door.setPosition(overhead.x, overhead.y).setAngle(-3).setDepth(12);
    this.drawArms(overhead.y + ATTACK_DOOR_H - 4);
    this.shadow.setVisible(false);
    this.ben.setX(ATTACK_STALL_X + 6);
    const alert = this.add.bitmapText(this.ben.x - 4, ATTACK_BEN_UP - 62, 'fontLight', '!').setScale(2).setDepth(21).setTint(0xffd040);
    const scene = this.add.container(0, 0).setDepth(21);
    this.dust(scene, ATTACK_HINGE_X, DOOR_TOP + 10, 6, 18);

    const screw = this.add.graphics({ x: ATTACK_HINGE_X, y: DOOR_TOP + 12 }).setScale(0.3).setDepth(21);
    this.drawScrew(screw, 0, 0);
    this.tweens.add({ targets: screw, y: 150, duration: 320, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: screw, x: ATTACK_HINGE_X + 50, angle: 720, duration: 900, ease: 'Sine.easeOut' });
    Sound.ping(2600);
    await this.wait(200);
    Sound.ping(2600);
    await this.wait(600);

    alert.destroy();
    this.arms.clear();
    this.chevy.setFrame('side_0');
    Sound.whoosh();
    await this.tween({ targets: this.door, x: 256, y: 46, angle: 190, duration: 340, ease: 'Quad.easeIn' });
    Sound.crash();
    this.cameras.main.shake(250, 0.01);
    this.dust(scene, 262, 70, 12, 40);
    this.farDoors[1].setAngle(4);
    await this.tween({ targets: this.door, y: 150, angle: 262, duration: 240, ease: 'Quad.easeIn' });
    Sound.kick();
    await this.wait(450);
    await this.say('chevy', this.chevy.x - 12, 68, this.text.gotcha, 250);
  }

  // Ben's view from the toilet: Chevy charges in and fills the stall.
  async bearHug() {
    const view = this.add.container(0, 0).setDepth(30);
    const g = this.add.graphics();
    g.fillStyle(0x7aa890).fillRect(0, 0, GAME_W, 130);
    g.fillStyle(0x5a8a72);
    for (let y = 3; y < 130; y += 12) g.fillRect(0, y, GAME_W, 1);
    g.fillStyle(0xb8c4c0).fillRect(0, 130, GAME_W, 50);
    g.fillStyle(0x4a6a60).fillRect(0, 0, 30, GAME_H).fillRect(GAME_W - 30, 0, 30, GAME_H);
    view.add(g);
    const chevy = this.add.sprite(GAME_W / 2, GAME_H + 40, 'npc_chevy', 'down_0').setOrigin(0.5, 1).setScale(7);
    view.add(chevy);
    this.say('ben', GAME_W / 2, 150, this.text.no, 2000);
    await this.wait(220);
    await this.tween({ targets: chevy, scale: 16, duration: 420, ease: 'Cubic.easeIn' });
  }

  // Everything stops. The whole screen is black.
  async goBlack() {
    if (this.finished) return;
    this.finished = true;
    Music.stop();
    this.cameras.main.resetFX();
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000).setOrigin(0).setDepth(100);
    Sound.stomp();
    await this.wait(ATTACK_BLACK_MS);
    this.done();
  }
}
