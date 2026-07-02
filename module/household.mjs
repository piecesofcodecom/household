// Document classes (Actor, Item, Combat, Combatant).
import { HouseholdActor, HouseholdItem, HouseholdCombat, HouseholdCombatant } from './documents/_module.mjs';
// Applications (sheets, combat tracker, player HUD).
import {
  HouseholdActorSheet,
  HouseholdGardenActorSheet,
  HouseholdNPCActorSheet,
  HouseholdItemSheet,
  HouseholdCombatTracker,
  HouseholdCharacterCreation,
  renderCharacter,
} from './applications/_module.mjs';
// Data models.
import {
  HouseholdCharacter, HouseholdOpponent,
  HouseholdGear, HouseholdGadget, HouseholdWeapon, HouseholdMove, HouseholdContract,
  HouseholdTrait, HouseholdProfession, HouseholdVocation, HouseholdCompanion, HouseholdFolk,
} from './data/_module.mjs';
// Helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { HOUSEHOLD } from './helpers/config.mjs';
import { registerHandlebarsHelpers } from './helpers/handlebars.mjs';
import { rollItemMacro } from './helpers/macros.mjs';
import { migrateCompanions, migrateProfessions, migrateVocations, migrateWeapons, migrateFolks, migrateAll } from './helpers/migrations.mjs';
import { registerWhatsNewSetting, showWhatsNew } from './helpers/whatsnew.mjs';
import { registerSettings } from './helpers/settings.mjs';
import { registerStatusEffects, registerConditionSyncHooks } from './helpers/conditions.mjs';
import { isGm } from './helpers/utils.mjs';
// Pure roll-logic helpers (exposed at game.household.roll for testing/macros).
import * as HouseholdRoll from './dice/roll.mjs';
// Dice setup (importing dice-term.mjs registers the custom d6 term as a side effect).
import './dice/dice-term.mjs';
import { registerDiceSoNice } from './dice/dice-so-nice.mjs';
// Hook registration.
import { registerHooks, registerHotbarHooks } from "./hooks/_module.mjs";

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  CONFIG.Actor.documentClass = HouseholdActor;
  CONFIG.Item.documentClass = HouseholdItem;
  // Register actor data models (schemas live here; template.json mirrors them).
  CONFIG.Actor.dataModels.character = HouseholdCharacter;
  CONFIG.Actor.dataModels.opponent = HouseholdOpponent;
  // Deprecated alias: `npc` was merged into `opponent`. It is kept registered
  // (mapped to the Opponent model) only so leftover npc actors in existing
  // worlds still load and can be migrated to `opponent` in the `ready` hook.
  // Remove this, the npc template.json type, and the npc sheet registration in
  // a future release once worlds have migrated.
  CONFIG.Actor.dataModels.npc = HouseholdOpponent;
  // Register item data models (schemas live here; template.json mirrors them).
  CONFIG.Item.dataModels.item = HouseholdGear;
  CONFIG.Item.dataModels.gadget = HouseholdGadget;
  CONFIG.Item.dataModels.weapon = HouseholdWeapon;
  CONFIG.Item.dataModels.move = HouseholdMove;
  CONFIG.Item.dataModels.contract = HouseholdContract;
  CONFIG.Item.dataModels.trait = HouseholdTrait;
  CONFIG.Item.dataModels.profession = HouseholdProfession;
  CONFIG.Item.dataModels.vocation = HouseholdVocation;
  CONFIG.Item.dataModels.companion = HouseholdCompanion;
  CONFIG.Item.dataModels.folk = HouseholdFolk;
  // Unregister old sheets if needed
  foundry.documents.collections.Actors.unregisterSheet("household", foundry.applications.sheets.ActorSheet);
  // Register your new V2 sheet
  foundry.documents.collections.Actors.registerSheet("household", HouseholdActorSheet, {
    types: ["character"], // whatever actor types you support
    makeDefault: true,
    label: "HOUSEHOLD.SheetLabels.Actor"
  });
  // Optional "Garden" variant — same sheet, garden palette. Non-default; the GM
  // can pick it as the character default and players can override per actor.
  foundry.documents.collections.Actors.registerSheet("household", HouseholdGardenActorSheet, {
    types: ["character"],
    makeDefault: false,
    label: "HOUSEHOLD.SheetLabels.Garden"
  });
  foundry.documents.collections.Actors.registerSheet("household", HouseholdNPCActorSheet, {
    types: ["opponent", "npc"], // `npc` kept only so legacy actors load until migrated to `opponent`
    makeDefault: true,
    label: "HOUSEHOLD.SheetLabels.Actor"
  });
  foundry.documents.collections.Items.registerSheet("household", HouseholdItemSheet, {
    types: ["item", "weapon", "gadget", "move", "contract", "trait", "folk", "companion", "profession", "vocation"], // all your item types
    makeDefault: true,
    label: "HOUSEHOLD.SheetLabels.Item"
  });
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.household = {
    HouseholdActor,
    HouseholdItem,
    HouseholdCharacterCreation,
    rollItemMacro,
    roll: HouseholdRoll,
    migrations: {
      companions: migrateCompanions,
      professions: migrateProfessions,
      vocations: migrateVocations,
      weapons: migrateWeapons,
      folks: migrateFolks,
      all: migrateAll,
    },
  };

  $("body.game").append('<div id="player-character"></div>');
  $("body.game").append('<div id="party"></div>');

  // Records the last system version whose "What's New" dialog was dismissed.
  registerWhatsNewSetting();
  // Character-creation source settings (world vs. compendium).
  registerSettings();

  // Add custom constants for configuration.
  CONFIG.HOUSEHOLD = HOUSEHOLD;
  const premium = game.modules.get("household-premium");
  if (premium && premium.active) {
    HOUSEHOLD.premium = true;
  }

  // --------combats
  CONFIG.Combat.initiative.formula = '1';
  CONFIG.Combat.documentClass = HouseholdCombat;
  CONFIG.ui.combat = HouseholdCombatTracker;
  CONFIG.Combatant.documentClass = HouseholdCombatant;

  // Active Effects are never copied to the Actor, but will still apply to the
  // Actor from within the Item if the transfer property is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Handlebars helpers, Dice So Nice presets, and live hooks.
  registerHandlebarsHelpers();
  registerDiceSoNice();
  registerHooks();
  // Keep system.conditions.* in sync with condition ActiveEffects (both directions).
  registerConditionSyncHooks();

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  registerHotbarHooks();

  // Register the character conditions as Foundry status effects (needs i18n,
  // which is ready by now). Toggling a condition then applies a real ActiveEffect.
  registerStatusEffects();

  // One-time migration: the `npc` actor type was merged into `opponent`.
  // Convert any leftover npc actors so they keep working. Idempotent: once
  // converted there are no npc actors left, so this no-ops on later loads.
  if (game.user.isGM) {
    // `npc` is kept registered (as an Opponent-model alias) so these actors load
    // normally into game.actors and can be updated here. Updating an off-collection
    // (invalid) document does not work in v14, so registration is what makes this
    // migration possible.
    const legacyNpcs = game.actors.filter((a) => a.type === "npc");
    for (const actor of legacyNpcs) {
      try {
        // Changing a Document's type requires force-replacing the `system` field.
        // Carry over the existing source data; the Opponent model fills in any
        // new defaults (e.g. threat.level). Passing { recursive: false } makes
        // Foundry wrap each provided root key (type, system) in a
        // ForcedReplacement operator *after* cleaning — the only update form v14
        // accepts for a type change. (Building the operator by hand and using the
        // default recursive update does not work: update() cleans it away before
        // the type-change check runs.)
        const sourceSystem = actor.toObject().system ?? {};
        await actor.update(
          { type: "opponent", system: sourceSystem },
          { recursive: false, diff: false }
        );
      } catch (err) {
        console.error(`Household | Failed to migrate npc actor "${actor.name}" to opponent.`, err);
      }
    }
    if (legacyNpcs.length > 0) {
      ui.notifications.info(`Household: migrated ${legacyNpcs.length} NPC actor(s) to Opponent.`);
    }
  }

  // One-time-per-version notice nudging the GM to run the item migration.
  // Not awaited so it doesn't block the rest of the ready hook.
  showWhatsNew();

  if (!isGm()) {
    await renderCharacter();
  }

  if (isGm()) {
    const config = game.settings.get("core", "combatTrackerConfig");

    if (config?.turnMarker?.enabled == true) {
      // Update the turnMarker.enabled property
      const newConfig = {
        ...config,
        turnMarker: {
          ...config.turnMarker,
          enabled: false
        }
      };

      // Save it back to the world settings
      await game.settings.set("core", "combatTrackerConfig", newConfig);

      ui.notifications.warn("Turn marker has been disabled. Household Combat does not support that configuration.");
    }
    $("#players").removeClass("hidden");
  } else {
    $("#players").addClass("hidden");
  }
});
