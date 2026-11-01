// Game entry point: 320x180 internal resolution, stretched to fill as much of
// the window as possible (keeping the 16:9 shape) with nearest-neighbor
// scaling so pixels stay sharp.

const GAME_W = 320;
const GAME_H = 180;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Later scenes draw on top: UI over the world, the fast-forward over the game,
  // and the pause menu and settings over everything.
  scene: [BootScene, TitleScene, DayIntroScene, WorldScene, UIScene, GuitarScene, OrdersScene,
    CleanRoomScene, ZynScene, PracticeScene, FridayGameScene, DirtbikeScene, MarkersScene, AvoidChevyScene, MathScene, SamTantrumScene, ChevyAttackScene, PartySongScene, FastForwardScene, EndingScene, StatsScene, PauseScene, SettingsScene, SlotsScene],
});
