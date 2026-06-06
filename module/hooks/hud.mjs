/*
* Keep the floating player HUD (#player-character) in sync: re-render it on the
* custom token-update request, on actor/owned-item updates for the displayed
* character, and (for GMs) on token control / refresh / delete.
*/

import { renderCharacter, getCharacter } from "../applications/hud/player-hud.mjs";
import { isGm } from "../helpers/utils.mjs";

export function registerHudHooks() {
  Hooks.on("household.onUpdateTokenRequest", async function () {
    if (!game.user.isGM)
      await renderCharacter();
  })

  Hooks.on("updateActor", async function (actor) {
    if (actor.id === getCharacter()?.id) {
      await renderCharacter();
    }
  });

  Hooks.on("updateOwnedItem", async function (actor, _, diff) {
    if (actor.id !== getCharacter()?.id) {
      return;
    }

    // Wait a little bit so the item is updated and can be rendered
    // correctly in the actions list.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await renderCharacter();
  });

  Hooks.on('controlToken', async function () {
    if (!isGm()) return;
    await renderCharacter();
  });

  Hooks.on('refreshToken', async function () {
    if (!isGm()) return;
    await renderCharacter();
  });


  Hooks.on('deleteToken', async function () {
    if (!isGm()) return;
    await renderCharacter();
  })
}
