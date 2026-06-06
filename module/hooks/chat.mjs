/*
* Wire the single chat-card render dispatch. The dispatch itself (and all card
* render/re-roll logic) lives in dice/roll-card.mjs.
*/

import { handleRenderChatMessage } from "../dice/roll-card.mjs";

export function registerChatHooks() {
  Hooks.on("renderChatMessageHTML", handleRenderChatMessage);
}
