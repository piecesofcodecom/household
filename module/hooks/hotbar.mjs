/*
* Register the hotbar-drop hook that turns a dropped owned Item into a roll
* macro. Registered on `ready` (not `init`) so modules can register earlier.
*/

import { createItemMacro } from "../helpers/macros.mjs";

export function registerHotbarHooks() {
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
}
