/**
 * Register the two Household Dice So Nice presets (the default red/blue set and
 * the gold "Garden" set). Called from the `init` hook; the actual work runs when
 * Dice So Nice fires its `diceSoNiceReady` hook.
 */
export function registerDiceSoNice() {
  Hooks.once('diceSoNiceReady', (dice3d) => {
    dice3d.addSystem({ id: "household", name: "Household", group: "household" }, "default");
    dice3d.addDicePreset({
      type: 'd6',
      labels: [
        '/systems/household/assets/dice/face_1.png',
        '/systems/household/assets/dice/face_2.png',
        '/systems/household/assets/dice/face_3.png',
        '/systems/household/assets/dice/face_4.png',
        '/systems/household/assets/dice/face_5.png',
        '/systems/household/assets/dice/face_6.png'],
      bumpMaps: [
        '/systems/household/assets/dice/face_1_bump.png',
        '/systems/household/assets/dice/face_2_bump.png',
        '/systems/household/assets/dice/face_3_bump.png',
        '/systems/household/assets/dice/face_4_bump.png',
        '/systems/household/assets/dice/face_5_bump.png',
        '/systems/household/assets/dice/face_6_bump.png'],
      colorset: 'household',
      system: 'household',

    });

    dice3d.addColorset(
      {
        name: "household",
        description: "Household Default",
        category: "Colors",
        foreground: ["#0d0d0d"],
        background: ["#c5c5c5"],
        outline: ["#db1515", "#1551db"],
        material: "plastic",
        visibility: "visible",
      },
      "default",
    );

    dice3d.addSystem({ id: "household-garden", name: "Household Garden", group: "household" }, "secondary");
    dice3d.addDicePreset({
      type: 'd6',
      labels: [
        '/systems/household/assets/dice/face_1_gold.png',
        '/systems/household/assets/dice/face_2_gold.png',
        '/systems/household/assets/dice/face_3_gold.png',
        '/systems/household/assets/dice/face_4_gold.png',
        '/systems/household/assets/dice/face_5_gold.png',
        '/systems/household/assets/dice/face_6_gold.png'],
      bumpMaps: [
        '/systems/household/assets/dice/face_1_bump.png',
        '/systems/household/assets/dice/face_2_bump.png',
        '/systems/household/assets/dice/face_3_bump.png',
        '/systems/household/assets/dice/face_4_bump.png',
        '/systems/household/assets/dice/face_5_bump.png',
        '/systems/household/assets/dice/face_6_bump.png'],
      colorset: 'garden',
      system: 'household-garden',
      name: 'garden',

    });
    dice3d.addColorset(
      {
        name: "garden",
        description: "Household Garden",
        category: "Colors",
        foreground: ["white"],
        background: ["#16bb26"],
        outline: ["#078f1e", "#295525"],
        material: "chrome",
        texture: "fire",
        visibility: "visible",
      },
      "secondary",
    );
  });
}
