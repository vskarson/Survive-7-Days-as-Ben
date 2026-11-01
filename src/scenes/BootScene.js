// Builds every texture from code, then shows the title screen.

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    Art.buildTileset(this);
    for (const [outfit, colors] of Object.entries(BEN_OUTFITS)) {
      Art.buildStrip(this, Ben.texture(outfit), benOutfitFrames(outfit), { ...BEN_PAL, ...colors }, BEN_W, BEN_H);
    }
    Art.buildStrip(this, 'goalArrow', { down: GOAL_ARROW }, GOAL_ARROW_PAL, 9, 9);
    Art.buildStrip(this, 'hudIcons', HUD_ICONS, HUD_ICON_PAL, 7, 7);
    Art.buildStrip(this, 'heldGuitar', { guitar: HELD_GUITAR }, HELD_GUITAR_PAL, 13, 6);
    Art.buildStrip(this, 'carryGuitar', CARRY_GUITAR, CARRY_GUITAR_PAL, BEN_W, BEN_H);
    buildSongGuitar(this);
    People.build(this);
    GuitarScene.buildTextures(this);
    OrdersScene.buildTextures(this);
    Font.build(this);
    this.scene.launch('UI');
    this.scene.start('Title');
  }
}
