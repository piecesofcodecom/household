/*
 * Conditions ↔ ActiveEffects.
 *
 * Household conditions (system.conditions.*) are registered as Foundry status
 * effects, following the punkapocalyptic pattern of rebuilding CONFIG.statusEffects
 * from a config map. Toggling a condition then creates/removes a real ActiveEffect
 * (with a token icon) via Actor#toggleStatusEffect — see actor.toggleCondition.
 *
 * The status effect is the source of truth; the system.conditions boolean is a
 * mirror kept in sync by createActiveEffect/deleteActiveEffect hooks, so toggling
 * from the token HUD updates the sheet and vice-versa.
 */
import { HOUSEHOLD } from "./config.mjs";

/**
 * Replace CONFIG.statusEffects with the Household conditions (preserving the core
 * "dead" status so combat defeat marking keeps working). Must run after i18n is
 * ready (call from the `ready`/`i18nInit` hook), since labels are localized here.
 */
export function registerStatusEffects() {
  // Keep the core "dead" effect (CONFIG.specialStatusEffects.DEFEATED → "dead").
  const dead = CONFIG.statusEffects.find(e => e.id === "dead");

  const effects = Object.keys(HOUSEHOLD.statusEffects).map(id => ({
    id,
    name: game.i18n.localize(HOUSEHOLD.statusEffects[id]),
    img: HOUSEHOLD.statusEffectImages[id],
    changes: [],
    flags: { household: { condition: true } }
  }));

  if (dead) effects.push(dead);
  CONFIG.statusEffects = effects;
}

/** The Household condition id carried by an effect, or null if it isn't one. */
function conditionIdOf(effect) {
  for (const id of (effect.statuses ?? [])) {
    if (id in HOUSEHOLD.statusEffects) return id;
  }
  return null;
}

/**
 * Keep the system.conditions.* boolean in sync when a condition ActiveEffect is
 * created or deleted (from the token HUD, a macro, etc.). Registered in `init`.
 */
export function registerConditionSyncHooks() {
  const sync = async (effect, active, userId) => {
    // CRUD hooks fire on every client; only the initiating user writes the
    // mirror (they own the actor, since they just toggled the effect).
    if (userId !== game.user.id) return;
    const actor = effect.parent;
    if (!(actor instanceof Actor)) return;
    const id = conditionIdOf(effect);
    if (!id) return;
    const path = `system.conditions.${id}`;
    // Only actors that actually have this condition field (characters); skip if
    // already in the desired state to avoid redundant updates.
    const current = foundry.utils.getProperty(actor, path);
    if (current === undefined || current === active) return;
    await actor.update({ [path]: active });
  };

  Hooks.on("createActiveEffect", (effect, options, userId) => sync(effect, true, userId));
  Hooks.on("deleteActiveEffect", (effect, options, userId) => sync(effect, false, userId));
}
