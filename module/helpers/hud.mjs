/**
 * Toggle between the Household character HUD and Foundry's macro hotbar.
 *
 * The system normally hides the core macro hotbar (see _custom.scss) and shows
 * the Household HUD (#player-character). Adding the body class below flips that:
 * the hotbar is revealed and the HUD is hidden. A scene-control toggle button
 * (registered in household.mjs) drives this.
 */

/** Body class that reveals the macro hotbar and hides the Household HUD. */
export const MACRO_BAR_BODY_CLASS = "household-macro-bar";

/**
 * @returns {boolean} true when the macro hotbar is shown (HUD hidden).
 */
export function isMacroBarVisible() {
  return document.body.classList.contains(MACRO_BAR_BODY_CLASS);
}

/**
 * Show the macro hotbar (and hide the HUD) or vice-versa.
 * @param {boolean} visible  true → macro hotbar, false → Household HUD
 */
export function setMacroBarVisible(visible) {
  document.body.classList.toggle(MACRO_BAR_BODY_CLASS, visible);
}

/**
 * Flip between the HUD and the macro hotbar.
 * @returns {boolean} the new state (true if the macro hotbar is now visible).
 */
export function toggleMacroBar() {
  const next = !isMacroBarVisible();
  setMacroBarVisible(next);
  return next;
}
