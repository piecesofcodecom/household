/*
* Add the Household token-layer scene controls: the HUD macro-bar toggle
* (every user) and a GM-only "Next Round" button.
*/

import { isMacroBarVisible, setMacroBarVisible } from "../helpers/hud.mjs";

export function registerSceneControlHooks() {
  Hooks.on("getSceneControlButtons", (controls) => {
    const tokens = controls.tokens;
    if (!tokens) return;

    // HUD <-> macro hotbar toggle, available to every user.
    controls.tokens.tools.householdHudToggle = {
      name: "householdHudToggle",
      title: "Toggle HUD / Macro Bar",
      icon: "fa-solid fa-grip",
      order: Object.keys(controls.tokens.tools).length,
      toggle: true,
      active: isMacroBarVisible(),
      visible: true,
      onChange: (event, active) => setMacroBarVisible(active)
    };

    if (!game.user.isGM) return controls;

    controls.tokens.tools.nextRound = {
      name: "nextRound",
      title: "Next Round",
      icon: "fa-solid fa-forward-step",
      order: Object.keys(controls.tokens.tools).length,
      button: true,
      visible: game.user.isGM,
      onChange: async () => {
        if (game?.combat)
          await game.combat.nextTurn();
      }
    };
  });
}
