/*
* Register every Household hook that should be live from system load (i.e. the
* old top-level `Hooks.on(...)` calls in household.mjs). The hotbar-drop hook is
* registered separately on `ready` — see registerHotbarHooks.
*/

import { registerChatHooks } from "./chat.mjs";
import { registerCombatHooks } from "./combat.mjs";
import { registerHudHooks } from "./hud.mjs";
import { registerSceneControlHooks } from "./scene-controls.mjs";
import { registerHotbarHooks } from "./hotbar.mjs";

export { registerHotbarHooks };
export function registerHooks() {
  registerChatHooks();
  registerCombatHooks();
  registerHudHooks();
  registerSceneControlHooks();
}
