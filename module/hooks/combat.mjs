/*
* Combat-related hooks: the action/reaction turn overlay, and force-disabling
* Foundry's core turn marker (which conflicts with Household combat).
*/
import { showHouseholdTurnOverlay } from "../applications/combat/overlay.mjs";

export function registerCombatHooks() {
  Hooks.on("updateCombat", (combat, change, data) => {
    if (data?.action != 'update') return;
    showHouseholdTurnOverlay(combat.currentTurnType);
  });

  Hooks.on("updateSetting", async (setting, data, options, userId) => {
    // Check if it's the combat tracker config
    if (!game.user.isGM) return;
    if (options?.action == "update") {
      if (setting?.key === "core.combatTrackerConfig") {
        const value = setting?.value?.turnMarker?.enabled;
        if (value) {
          const newConfig = {
            ...setting.value,
            turnMarker: {
              ...setting.value.turnMarker,
              enabled: false
            }
          };

          // Save it back to the world settings
          await game.settings.set("core", "combatTrackerConfig", newConfig);
          ui.notifications.warn("Turn marker has been disabled. Household Combat does not support that configuration.");
        }

      }
    }
  });
}
