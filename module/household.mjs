// Import document classes.
import { HouseholdActor } from './documents/actor.mjs';
import { HouseholdItem } from './documents/item.mjs';
// Import sheet classes.
import { HouseholdActorSheet } from './sheets/actor-sheet.mjs';
import { HouseholdNPCActorSheet } from './sheets/actor-npc-sheet.mjs';
import { HouseholdItemSheet } from './sheets/item-sheet.mjs';
// Import data models.
import { HouseholdCharacter, HouseholdOpponent } from './data/_module.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { HOUSEHOLD } from './helpers/config.mjs';
// Pure roll-logic helpers (not yet wired into the live roll path; exposed for testing).
import * as HouseholdRoll from './helpers/roll.mjs';
import { isMacroBarVisible, setMacroBarVisible } from './helpers/hud.mjs';

import { HouseholdCombat } from "./combat/HouseholdCombat.mjs";
import { HouseholdCombatant } from "./combat/HouseholdCombatant.mjs";
import { HouseholdCombatTracker } from "./combat/HouseholdCombatTracker.mjs";
import { showHouseholdTurnOverlay } from "./combat/overlay.mjs";

import {
  getCharacter,
  characterData,
} from "./sheets/actor-hud.mjs";
import * as actions from "./helpers/actions.mjs";
import { isGm, capitalizeFirstLetter, skills_list } from "./helpers/utils.mjs";
import { move } from 'fs-extra';

function preparediceToChat(dice_poll, cancel_face = 0) {
  const success_label = {
    '2': 'basic',
    '3': 'critical',
    '4': 'extreme',
    '5': 'impossible',
    '6': 'jackpot'
  };
  let dice_to_chat = [];
  for (let [key, value] of Object.entries(dice_poll)) {
    if (value > 0) {
      for (let j = 0; j < value; j++) {
        dice_to_chat.push({
          face: Number(key),
          success: value > 1 ? success_label[value] : 'none',
          locked: dice_poll[key] > 1 ? true : false,
          face_display: Number(key) === Number(cancel_face) ? 0 : Number(key),
        })
      }
    }
  }
  return dice_to_chat;
}

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function () {
  CONFIG.Actor.documentClass = HouseholdActor;
  CONFIG.Item.documentClass = HouseholdItem;
  // Register actor data models (schemas live here; template.json mirrors them).
  CONFIG.Actor.dataModels.character = HouseholdCharacter;
  CONFIG.Actor.dataModels.opponent = HouseholdOpponent;
  // Unregister old sheets if needed
  foundry.documents.collections.Actors.unregisterSheet("household", foundry.applications.sheets.ActorSheet);
  // Register your new V2 sheet
  foundry.documents.collections.Actors.registerSheet("household", HouseholdActorSheet, {
    types: ["character"], // whatever actor types you support
    makeDefault: true,
    label: "HOUSEHOLD.SheetLabels.Actor"
  });
  foundry.documents.collections.Actors.registerSheet("household", HouseholdNPCActorSheet, {
    types: ["opponent"], // the old `npc` type was merged into `opponent`
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
    rollItemMacro,
    roll: HouseholdRoll,
  };



  $("body.game").append('<div id="player-character"></div>');
  $("body.game").append('<div id="party"></div>');

  // await loadTemplates([

  // ]);

  //activatePlayerListeners();
  //activatePartyListeners();

  // Add custom constants for configuration.
  CONFIG.HOUSEHOLD = HOUSEHOLD;
  const premium = game.modules.get("household-premium");
  if (premium && premium.active) {
    HOUSEHOLD.premium = true;
  }

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  // CONFIG.Combat.initiative = {
  //   formula: '1d20',
  //   decimals: 2,
  // };

  // --------combats
  CONFIG.Combat.initiative.formula = '1';
  CONFIG.Combat.documentClass = HouseholdCombat;
  CONFIG.ui.combat = HouseholdCombatTracker;
  CONFIG.Combatant.documentClass = HouseholdCombatant;


  // Define custom Document classes
  // CONFIG.Actor.documentClass = HouseholdActor;
  // CONFIG.Item.documentClass = HouseholdItem;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes V1
  // foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
  // foundry.documents.collections.Actors.registerSheet('household', HouseholdActorSheet, {
  //   makeDefault: true,
  //   label: 'HOUSEHOLD.SheetLabels.Actor',
  // });
  // foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
  // foundry.documents.collections.Items.registerSheet('household', HouseholdItemSheet, {
  //   makeDefault: true,
  //   label: 'HOUSEHOLD.SheetLabels.Item',
  // });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */
Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("range", function (n, block) {
  let accum = "";
  for (let i = 0; i < n; ++i) {
    accum += block.fn(i);
  }
  return accum;
});
Handlebars.registerHelper("last", function (array) {
  if (!Array.isArray(array) || array.length === 0) {
    return null;
  }
  return array[array.length - 1];
});
// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

Handlebars.registerHelper('doCheck', function (data) {
  if (data) return "checked";
  return "";
});

Handlebars.registerHelper('getSuitFromField', function (raw_data) {
  const field = raw_data.trim().toLowerCase();
  if (field === 'society' || field === 'heart') return 'heart';
  if (field === 'academia' || field === 'diamond') return 'diamond';
  if (field === 'war' || field === 'club') return 'club';
  if (field === 'street' || field === 'spade') return 'spade';
  return "empty-set";
});

Handlebars.registerHelper('getWeaponTypeIcon', function (raw_data) {
  const type = raw_data.trim().toLowerCase();
  if (type.includes('melee')) return 'fa-hand-back-fist';
  if (type.includes('ranged')) return 'fa-bullseye';
  if (type.includes('dueling')) return 'fa-swords';
  return "empty-set";
});


Handlebars.registerHelper('getFieldColor', function (raw_data) {
  const field = raw_data.trim().toLowerCase();
  if (field === 'society' || field === 'heart' || skills_list["society"].includes(field)) return '#fd5c63';
  if (field === 'academia' || field === 'diamond' || skills_list["academia"].includes(field)) return '#7CB9E8';
  if (field === 'war' || field === 'club' || skills_list["war"].includes(field)) return '#32de84';
  if (field === 'street' || field === 'spade' || skills_list["street"].includes(field)) return '#343434';
  return "#343434";
});

Handlebars.registerHelper('doCheckIf', function (operand_1, operator, operand_2) {

  let operators = {                     //  {{#when <operand1> 'eq' <operand2>}}
    'eq': (l, r) => l == r,              //  {{/when}}
    'noteq': (l, r) => l != r,
    'gt': (l, r) => (+l) > (+r),                        // {{#when var1 'eq' var2}}
    'gteq': (l, r) => ((+l) > (+r)) || (l == r),        //               eq
    'lt': (l, r) => (+l) < (+r),                        // {{else when var1 'gt' var2}}
    'lteq': (l, r) => ((+l) < (+r)) || (l == r),        //               gt
    'or': (l, r) => l || r,                             // {{else}}
    'and': (l, r) => l && r,                            //               lt
    '%': (l, r) => (l % r) === 0,
    'in': (l, r) => r.split(',').includes(l)                        // {{/when}
  }

  let result = operators[operator](operand_1, operand_2);
  if (result) return "checked";
  return "";
});


Handlebars.registerHelper('reduceBy', function (value, rd) {
  return Number(value) - Number(rd);
});

Handlebars.registerHelper('increaseBy', function (value, rd) {
  return Number(value) + Number(rd);
});

Handlebars.registerHelper("multipleOf", function (value, multipler, options) {
  if ((Number(value) % Number(multipler)) == 0) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('stressPercentage', function (stress) {
  if (!stress || stress.max === 0) {
    return 1;
  } 
  const percentage = ((stress.max - stress.value) / stress.max);
  return percentage; // Clamping the value between 0 and 100
});

Handlebars.registerHelper('getOpacyDecorum', function (decorum) {
  // Example logic: adjust as needed

  if (decorum == 1) {
    return 1; // Fully opaque
  }
  if (decorum == 2) {
    return 0.7; // Semi-opaque
  }
  if (decorum == 3) {
    return 0.5 // Mostly transparent
  }
  if (decorum == 4) {
    return 0.3 // Mostly transparent
  }
  if (decorum == 5) {
    return 0 // Mostly transparent
  }
});

Handlebars.registerHelper("when", function (operand_1, operator, operand_2, options) {
  let operators = {                     //  {{#when <operand1> 'eq' <operand2>}}
    'eq': (l, r) => l == r,              //  {{/when}}
    'noteq': (l, r) => l != r,
    'gt': (l, r) => (+l) > (+r),                        // {{#when var1 'eq' var2}}
    'gteq': (l, r) => ((+l) > (+r)) || (l == r),        //               eq
    'lt': (l, r) => (+l) < (+r),                        // {{else when var1 'gt' var2}}
    'lteq': (l, r) => ((+l) < (+r)) || (l == r),        //               gt
    'or': (l, r) => l || r,                             // {{else}}
    'and': (l, r) => l && r,                            //               lt
    '%': (l, r) => (l % r) === 0,
    'in': (l, r) => r.split(',').includes(String(l))                          // {{/when}}
  }

  let result = operators[operator](operand_1, operand_2);
  if (result) return options.fn(this);
  return options.inverse(this);
});

Handlebars.registerHelper('numLoop', function (num, options) {
  let ret = ''

  for (let i = 1, j = num; i <= j; i++) {
    ret = ret + options.fn(i)
  }

  return ret
});

Handlebars.registerHelper('hasSuccess', function (obj, options) {
  let initialValue = 0;
  Object.entries(obj).reduce(
    (accumulator, [key, currentValue]) => { obj[key].locked ? initialValue += 1 : 0 },
    {},
  );
  if (initialValue)
    return options.fn(this);
  return options.inverse(this);
});

Handlebars.registerHelper('hasNoSuccess', function (obj, options) {
  let initialValue = 0;
  Object.entries(obj).reduce(
    (accumulator, [key, currentValue]) => { !obj[key].locked ? initialValue += 1 : 0 },
    {},
  );
  if (initialValue)
    return options.fn(this);
  return options.inverse(this);
});

Handlebars.registerHelper("ifNotEmpty", (input, block) => {
  if (
    input &&
    ((input.length && input.length > 0) || (input.size && input.size > 0))
  ) {
    return block.fn(this);
  }
});

const actionTypeNames = {
  action: "actions",
  bonus: "bonus_actions",
  reaction: "reactions",
  crew: "crew_actions",
  weapon: "weapons",
  spell: "spells",
  active: "active",
  inactive: "inactive"
};

Handlebars.registerHelper('trimString', function (str, maxSize) {
  if (str.length > maxSize) {
    return str.substring(0, maxSize) + '...';  // Append ellipsis if truncated
  } else {
    return str;
  }
});

Handlebars.registerHelper('ifLength', function (array, length, options) {
  if (array.length === length) {
    return options.fn(this); // block executes
  }
  return options.inverse(this); // else block
});

Handlebars.registerHelper("actionTypeName", (type) => {
  const key = actionTypeNames[type] || "other_actions";
  return game.i18n.localize(`HOUSEHOLD.${key}`);
});

Handlebars.registerHelper("modifier", (x) => (x < 0 ? x : `+${x}`));

Handlebars.registerHelper("abilityName", (id) =>
  game.i18n.localize(`HOUSEHOLD.Ability${id.titleCase()}Abbr`)
);

Handlebars.registerHelper("firstWord", (str) => str.split(" ")[0]);

Handlebars.registerHelper('math', function (a, operator, b) {
  a = Number(a);
  b = Number(b);

  switch (operator) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return b !== 0 ? a / b : 0;
    default:
      throw new Error(`Unknown operator: ${operator}`);
  }
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

// Hooks.on("preCreateItem", (item, data, options, userId) => {

// });

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

Hooks.once('ready', async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

  // One-time migration: the `npc` actor type was merged into `opponent`.
  // Convert any leftover npc actors so they keep working. Idempotent: once
  // converted there are no npc actors left, so this no-ops on later loads.
  if (game.user.isGM) {
    const legacyNpcs = game.actors.filter((a) => a.type === "npc");
    for (const actor of legacyNpcs) {
      try {
        // Changing a Document's type requires force-replacing the system field.
        // Carry over the existing source data; the Opponent model fills in any
        // new defaults (e.g. threat.level). Prefer the v14 ForcedReplacement
        // operator, falling back to the legacy "==" key on older v13 builds.
        const sourceSystem = actor.toObject().system ?? {};
        const ForcedReplacement = foundry.data?.operators?.ForcedReplacement;
        const changes = ForcedReplacement
          ? { type: "opponent", system: ForcedReplacement.create(sourceSystem) }
          : { type: "opponent", "==system": sourceSystem };
        await actor.update(changes);
      } catch (err) {
        console.error(`Household | Failed to migrate npc actor "${actor.name}" to opponent.`, err);
      }
    }
    if (legacyNpcs.length > 0) {
      ui.notifications.info(`Household: migrated ${legacyNpcs.length} NPC actor(s) to Opponent.`);
    }
  }

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

/**
 * Message Hooks
 */

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

/**
 * Wire the interactive skill-roll card (the `customCss` flavor): field /
 * difficulty / modifier pickers, the roll button, re-roll buttons and the
 * give-up dice. Only the actor's owner (or a GM) may act on it.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function wireSkillRollCard(message, html) {
  const parser = new DOMParser();
  const actor = game.actors.get(message.speaker.actor);
  const level = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;

  if (!((actor?.ownership?.[game.user.id] ?? 0) >= level) && !game.user.isGM) {
    return;

  }


  // convert html string into DOM
  const documentRoll = parser.parseFromString(message.flavor, "text/html");
  const fieldOption = html.querySelector('.field-option');
  const difficultyOption = html.querySelector('.difficulty-option');
  const modifierOption = html.querySelector('.modifier-option');
  const rollAbility = html.querySelector('.roll-ability');
  const rerollButtons = html.querySelectorAll('.reroll-button') || [];
  const giveUp = html.querySelectorAll('.give_up') || [];
  const open_items = html.querySelectorAll('.open-item') || [];
  if (open_items.length > 0) {
    open_items.forEach(open_item => {
      open_item.addEventListener('click', async event => {
        event.preventDefault();
        const dataset = event.target.closest('.open-item').dataset;
        const item = actor.items.get(dataset.itemId);
        if (item) {
          item.sheet.render(true);
        }
      })
    })
    
  }
  if (fieldOption) {
    fieldOption.click(event => {
      event.preventDefault();
      const dataset = event.target.dataset;
      const collection = documentRoll.getElementsByClassName('field-option')
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].id == event.target.id) {
          collection[i].setAttribute('checked', 'checked');
        } else {
          collection[i].removeAttribute('checked');
        }
      }
      const serializer = new XMLSerializer();
      const serializedString = serializer.serializeToString(documentRoll);
      message.update({ flavor: serializedString, flags: { customCss: true } });
    });
  }
  if (difficultyOption) {
    difficultyOption.on('change', event => {
      event.preventDefault();
      //const element = event.target;
      //const dataset = event.target.dataset;
      const collection = documentRoll.getElementsByClassName('difficulty-option')
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].id == event.target.id) {
          collection[i].placeholder = event.target.value;
          collection[i].value = '';
          if (event.target.value > 0) {
            collection[i].classList.add('option-selected')
            collection[i].classList.remove('option-empty')
          } else {
            collection[i].classList.remove('option-selected')
            collection[i].classList.add('option-empty')

          }
        }
      }
      const serializer = new XMLSerializer();
      const serializedString = serializer.serializeToString(documentRoll);
      message.update({ flavor: serializedString, flags: { customCss: true } });
    });
  }

  if (modifierOption) {
    modifierOption.click(event => {
      event.preventDefault();
      const dataset = event.target.dataset;
      const collection = documentRoll.getElementsByClassName('modifier-option')
      for (let i = 0; i < collection.length; i++) {
        if (collection[i].id == event.target.id) {
          collection[i].setAttribute('checked', 'checked');
        } else {
          collection[i].removeAttribute('checked');
        }
      }
      const serializer = new XMLSerializer();
      const serializedString = serializer.serializeToString(documentRoll);
      message.update({ flavor: serializedString, flags: { customCss: true } });
    });
  }


  if (rollAbility) {
    rollAbility.click(event => {
      event.preventDefault();
      const element = documentRoll.getElementById('roll-button');

      let mod = 0;
      const modifier_collection = documentRoll.getElementsByClassName('modifier-option')
      for (let i = 0; i < modifier_collection.length; i++) {
        if (modifier_collection[i].checked) {
          mod = Number(modifier_collection[i].getAttribute('value'));
        }
      }

      let field = '';
      const field_collection = documentRoll.getElementsByClassName('field-option')
      for (let i = 0; i < field_collection.length; i++) {
        if (field_collection[i].checked) {
          field = field_collection[i].getAttribute('data-key');
        }
      }
      const difficulty = {
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0
      }
      const difficulty_collection = documentRoll.getElementsByClassName('difficulty-option')
      for (let i = 0; i < difficulty_collection.length; i++) {
        const key = String(difficulty_collection[i].getAttribute('data-key'))
        difficulty[key] = difficulty_collection[i].getAttribute('placeholder')
      }

      const dataset = element.dataset;
      const skill = dataset.key
      actor.onSkillRoll(field, skill, mod, difficulty);
    });
  }

  if (rerollButtons.length > 0) {
    rerollButtons.forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        const dataset = event.target.dataset;
        const reroll_type = dataset.rerolltype;

        let free_reroll = false;
        let normal_reroll = false;
        let all_in = false;
        if (reroll_type === 'normal') {
          normal_reroll = true;
        } else if (reroll_type == 'allin') {
          all_in = true;
        } else {
          free_reroll = true;
        }
        const poll_difficulty = JSON.parse(dataset.poll_difficulty)
        const current_poll = JSON.parse(dataset.currentpoll)
        const current_success = JSON.parse(dataset.current_success)
        const keep_success = item => (
          Object
            .keys(item)
            .filter(key => item[key] > 1)
            .reduce((newObj, key) => {
              newObj[key] = item[key];
              return newObj;
            }, {})
        );
        const keep_poll = keep_success(current_poll);
        const message_id = dataset.messageId;
        actor.onSkillRoll(dataset.field, dataset.skill, Number(dataset.mod), poll_difficulty, keep_poll, normal_reroll, free_reroll, all_in, current_success, message_id)
      });
    });
  }

  if (giveUp.length > 0) {
    giveUp.forEach(button => {
      button.addEventListener('click', async event => {
        event.preventDefault();
        // TODO refazer essa parte
        const dataset = event.target.dataset;
        const dice_list = event.target.closest('.dice-list').dataset;
        const face_gave_up = dataset.face;
        const current_poll = JSON.parse(dataset.currentpoll)
        let clone_current_poll = { ...current_poll }
        clone_current_poll[face_gave_up] = 0;
        const poll_difficulty = JSON.parse(dataset.poll_difficulty);
        const evaluation = actor.evaluatePoll(clone_current_poll, poll_difficulty);
        const dice = preparediceToChat(current_poll, Number(face_gave_up));
        const successes = actor.prepareSuccessToChat(evaluation.poll_successes);

        const templateData = {
          ability: capitalizeFirstLetter(dice_list.abilityName),
          skill: dataset.ability,
          field: capitalizeFirstLetter(dice_list.fieldName),
          modifierroll: 1,
          actor: actor,
          dice: dice,
          currentpoll: JSON.stringify(current_poll),
          dice_string: JSON.stringify(dice),
          poll_difficulty: JSON.stringify(poll_difficulty),
          poll_success: JSON.stringify({}),
          successes: successes,
          reroll: 0,
          allin: 0,
          reroll_message: "Rolling",
          give_up: "give_up",
          give_up_face: face_gave_up,
          outcome: evaluation.outcome,
          message_id: message._id
        };
        const html = await foundry.applications.handlebars.renderTemplate("systems/household/templates/chat/skill-roll-card.hbs", templateData);
        if (game.version.includes('11.')) {
          if (message.author.id !== game.user.id && !game.user.isGM) {
            // Disable or hide input fields
            html.querySelector("input, select, textarea, label").prop("disabled", true);
          }
        } else {
          if (message.author.id !== game.user.id && !game.user.isGM) {
            // Disable or hide input fields
            html.querySelector("input, select, textarea, label").prop("disabled", true);
          }
        }
        message.update({ flavor: html, flags: { customCss: true } });



      });
    });
  }

}

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.household.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'household.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

/** HUD FUNCTIUONS */
Hooks.on("household.onUpdateTokenRequest", async function () {
  if (!game.user.isGM)
    await renderCharacter();
})
// Hooks.on("renderApplication", async function () {

// });

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

function activatePlayerListeners(elem) {
  const sheet = elem.querySelector('#player-character .sheet-open');
  sheet.addEventListener("click", actions.openSheet);
  setupHealthPointsTracker("#current-health");

  const skills = elem.querySelectorAll('#player-character .skill');

  const editvalues = elem.querySelectorAll("#player-character .editValue");
  for (let item of editvalues) {
    item.addEventListener("click", actions.editValue);
  }

  const editInputs = elem.querySelectorAll("#player-character .InputeditValue");
  for (let item of editInputs) {
    item.addEventListener("input", actions.InputeditValue);
  }

  const rollaction = elem.querySelectorAll('#player-character .roll-action');
  for (let item of rollaction) {
    item.addEventListener('click', actions.rollAction);
  }

  const itemsChat = elem.querySelectorAll('#player-character .item-chat');
  for (let item of itemsChat) {
    item.addEventListener('click', actions.itemChat);
  }

  const decorum = elem.querySelectorAll('#player-character .decorum');
  const items = elem.querySelectorAll('#player-character .item');
  for (let item of items) {
    item.addEventListener("click", actions.useItem);
  }
  const aces = elem.querySelectorAll('#player-character .aces');
  for (let ace of aces) {

    ace.addEventListener("click", actions.useAce);
  }
  //$(elem).on("click", "#player-character .item", actions.useItem);
  for (let dec of decorum) {
    dec.addEventListener("click", actions.setAttribute);
  }

  for (let skill of skills) {
    skill.addEventListener("click", actions.dialogRollSkill);
  }
  const abilities = elem.querySelectorAll('#player-character .ability')
  for (let ability of abilities) {
    ability.addEventListener("click", actions.rollAbility);
  }
  const actions_menu = elem.querySelector('#player-character .actions-toggle');
  actions_menu.addEventListener("click", toggleActions);


  const skills_menu = elem.querySelectorAll('#player-character .skills-toggle');
  skills_menu.forEach(sk => {
    sk.addEventListener("click", toggleSkills);
  });


  const stats_menu = elem.querySelector('#player-character .stats-toggle');
  if (stats_menu)
    stats_menu.addEventListener("click", toggleStats);

}

function toggleActions(e) {
  e.stopPropagation();
  $(".character-actions").toggleClass("show");
  $(".actions-toggle").toggleClass("active");
  //$(".stats-toggle").toggleClass("active");

  $(".skills-toggle").removeClass("active");
  $(".stats-toggle").removeClass("active");
  $(".character-stats").removeClass("show");
  $(".character-skills").removeClass("show");

}

function toggleStats(e) {
  e.stopPropagation();
  $(".character-stats").toggleClass("show");
  $(".stats-toggle").toggleClass("active");

  $(".skills-toggle").removeClass("active");
  $(".actions-toggle").removeClass("active");
  $(".character-actions").removeClass("show");
  $(".character-skills").removeClass("show");
}

function toggleSkills(e) {
  e.stopPropagation();
  const fields = ['society', 'war', 'academia', 'street'];
  const display_field = e.currentTarget.dataset?.display;

  $(".stats-toggle").removeClass("active");
  $(".actions-toggle").removeClass("active");
  $(".character-actions").removeClass("show");
  $(".character-stats").removeClass("show");

  if (!display_field) {
    $(".skills-toggle").toggleClass("active");
    $(".character-skills").toggleClass("show");
    return;
  }


  var index = fields.indexOf(display_field);
  if (index > -1) {
    fields.splice(index, 1);
  }

  $(`.character-skills-content-${display_field}`).toggleClass("show");

  if ($(`.character-skills-content-${display_field}`).hasClass("show")) {
    $(".character-skills").addClass("show");
    $(`.${display_field}-skills-toggle`).addClass("active");
  } else {
    $(".character-skills").removeClass("show");
    $(`.${display_field}-skills-toggle`).removeClass("active");
  }

  fields.forEach(field => {
    $(`.character-skills-content-${field}`).removeClass("show");
    $(`.${field}-skills-toggle`).removeClass("active");
  })
}

function setupHealthPointsTracker(element) {
  $(document).on("focus", element, function () {
    this.value = "";
  });

  $(document).on("blur", element, function () {
    this.value = this.dataset.value;
  });

  $(document).on("keyup", element, function (e) {
    if (e.keyCode !== 13) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const actor = game.actors.get(this.dataset.id);
    if (!actor) {
      return;
    }

    const current = this.dataset.value;
    const text = this.value.trim();

    let dmg;
    if (text.startsWith("+") || text.startsWith("-")) {
      dmg = -Number(text);
    } else {
      const num = Number(text);
      dmg = num > current ? -(num - current) : current - num;
    }

    if (!isNaN(dmg)) {
      actor.applyDamage(dmg);
    }
  });
}

async function renderCharacter() {
  const elem = document.getElementById("player-character");
  if (!elem) return;


  const character = getCharacter();
  if (!character) {
    elem.parentNode.removeChild(elem);
    $("body.game").append('<div id="player-character"></div>');
    return;
  }

  let actor = character;
  if (character instanceof TokenDocument || character instanceof foundry.canvas.placeables.Token) {
    actor = character.actor;
  }
  const data = characterData(actor, character.id);
  if (!data) return;
  let scroll_1 = $('.character-actions-content').scrollTop();
  if (!scroll_1) {
    scroll_1 = $('.npc-actions-content').scrollTop();
  }
  const scroll_2 = $('.character-stats-content').scrollTop();
  const scroll_3 = $('.character-skills-content-society').scrollTop();
  const scroll_4 = $('.character-skills-content-academia').scrollTop();
  const scroll_5 = $('.character-skills-content-war').scrollTop();
  const scroll_6 = $('.character-skills-content-street').scrollTop();
  data["tabs"] = {
    characterSkills: $(".character-skills").length > 0 ? ($(".character-skills").attr("class")).replace("character-skills", "") : "",
    characterStats: $(".character-stats").length > 0 ? ($(".character-stats").attr("class")).replace("character-stats", "") : "",
    societySkillsToggle: $(".society-skills-toggle").length > 0 ? ($(".society-skills-toggle").attr("class")).replace("society-skills-toggle", "").replace("skills-toggle", "") : "",
    academiaSkillsToggle: $(".academia-skills-toggle").length > 0 ? ($(".academia-skills-toggle").attr("class")).replace("academia-skills-toggle", "").replace("skills-toggle", "") : "",
    warSkillsToggle: $(".war-skills-toggle").length > 0 ? ($(".war-skills-toggle").attr("class")).replace("war-skills-toggle", "").replace("skills-toggle", "") : "",
    streetSkillsToggle: $(".street-skills-toggle").length > 0 ? ($(".street-skills-toggle").attr("class")).replace("street-skills-toggle", "").replace("skills-toggle", "") : "",
    statsToggle: $(".stats-toggle").length > 0 ? ($(".stats-toggle").attr("class")).replace("stats-toggle", "") : "",
    actionsToggle: $(".actions-toggle").length > 0 ? ($(".actions-toggle").attr("class")).replace("actions-toggle", "") : "",
    characterActions: $(".character-actions").length > 0 ? ($(".character-actions").attr("class")).replace("character-actions", "") : "",
  }
  data["tabs"].characterSkills = data["tabs"].characterSkills.trim().replace('undefined', '')
  data["tabs"].characterStats = data["tabs"].characterStats.trim().replace('undefined', '')
  data["tabs"].societySkillsToggle = data["tabs"].societySkillsToggle.trim().replace('undefined', '')
  data["tabs"].academiaSkillsToggle = data["tabs"].academiaSkillsToggle.trim().replace('undefined', '')
  data["tabs"].warSkillsToggle = data["tabs"].warSkillsToggle.trim().replace('undefined', '')
  data["tabs"].streetSkillsToggle = data["tabs"].streetSkillsToggle.trim().replace('undefined', '')
  data["tabs"].statsToggle = data["tabs"].statsToggle.trim().replace('undefined', '')
  data["tabs"].actionsToggle = data["tabs"].actionsToggle.trim().replace('undefined', '')
  data["tabs"].characterActions = data["tabs"].characterActions.trim().replace('undefined', '')
  let tpl;


  if (actor.type == "npc" || actor.type == "opponent") {
    tpl = await foundry.applications.handlebars.renderTemplate(
      "systems/household/templates/actor/hud/hud-npc.hbs",
      data
    );
  } else {
    tpl = await foundry.applications.handlebars.renderTemplate(
      "systems/household/templates/actor/hud/hud-character.hbs",
      data
    );
  }

  elem.innerHTML = tpl;
  $('.character-actions-content').scrollTop(scroll_1);
  $('.npc-actions-content').scrollTop(scroll_1);
  $('.character-stats-content').scrollTop(scroll_2);
  $('.character-skills-content-society').scrollTop(scroll_3);
  $('.character-skills-content-academia').scrollTop(scroll_4);
  $('.character-skills-content-war').scrollTop(scroll_5);
  $('.character-skills-content-street').scrollTop(scroll_6);
  activatePlayerListeners(elem);
}
/** DICE */
export const DENOMINATION = "6";

export class HHDice extends foundry.dice.terms.Die {
  constructor(termData) {
    super({ ...termData, faces: 6 });
  }

  static DENOMINATION = "6";
}

// Register the custom die term with Foundry VTT
CONFIG.Dice.terms["6"] = HHDice;

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

/* -------------------------------------------- */
/*  Plain /roll re-roll handling (roll.mjs)     */
/* -------------------------------------------- */

/**
 * Render (or re-render) the Household card for a plain /roll into a message.
 * Plain rolls have no difficulty, so there is no pass/fail outcome — only the
 * re-roll options, scored entirely via roll.mjs (no actor / field / skill).
 * @param {ChatMessage} message
 * @param {object} opts
 * @param {Record<string, number>} opts.tally        merged face counts {1..6}
 * @param {string} opts.rollType                      HouseholdRoll.ROLL_TYPES value
 * @param {number} [opts.originalNorm=0]              normalized Successes before this roll
 * @param {number} [opts.cancelFace=0]                a Success face the player gave up (shown cancelled, dropped from the score)
 * @param {boolean} [opts.finalized=false]            true once a Success was given up: the interaction is over (no re-rolls / no give-up prompt)
 */
async function renderPlainRollCard(message, { tally, rollType, originalNorm = 0, cancelFace = 0, finalized = false }) {
  const R = HouseholdRoll;
  // When a Success was given up, drop that face before scoring.
  const scoredPoll = cancelFace ? { ...tally, [cancelFace]: 0 } : tally;
  const evaluation = R.evaluateRoll(scoredPoll, {});
  // After giving up a Success there is nothing left to do — no re-rolls, no prompt.
  const options = finalized
    ? { allowReroll: false, allowFreeReroll: false, allowAllIn: false, giveUp: false, allInFailure: false }
    : R.decideRollOptions(rollType, evaluation.normalizedSuccess, originalNorm);
  const dice = R.diceToChat(tally, cancelFace);
  const rerollable = R.hasRerollableDice(dice);

  // An all-in that did not improve wipes every Success.
  const pollSuccesses = options.allInFailure
    ? { "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 }
    : evaluation.pollSuccesses;

  const templateData = {
    dice,
    successes: R.successesToChat(pollSuccesses),
    allow_reroll: options.allowReroll && rerollable,
    allow_free_reroll: options.allowFreeReroll && rerollable,
    allow_allin: options.allowAllIn && rerollable,
    all_in_failed: options.allInFailure,
    give_up: options.giveUp ? "give_up" : "",
    currentpoll: JSON.stringify(tally),
    poll_success: JSON.stringify(pollSuccesses),
    message_id: message.id
  };
  const html = await foundry.applications.handlebars.renderTemplate(
    "systems/household/templates/chat/dice-roll.hbs",
    templateData
  );
  await message.update({
    flavor: html,
    flags: { household: { customCss: false, plainRoll: true } }
  });
}

/**
 * Re-roll a plain /roll using roll.mjs: keep the Successes, re-roll the rest,
 * merge, and re-render the card with the next set of options.
 * @param {ChatMessage} message
 * @param {string} rerollType  the button's data-rerolltype ("normal"|"free"|"allin")
 * @param {Record<string, number>} currentPoll  the face counts shown on the card
 */
async function rerollPlainRoll(message, rerollType, currentPoll) {
  const R = HouseholdRoll;
  const rollType = R.rollTypeFromButton(rerollType);

  const keep = R.keepSuccessfulFaces(currentPoll);
  const total = Object.values(currentPoll).reduce((sum, n) => sum + Number(n), 0);
  const kept = Object.values(keep).reduce((sum, n) => sum + Number(n), 0);
  const rerollCount = total - kept;
  const originalNorm = R.normalizePoll(R.countSuccesses(currentPoll));

  // Nothing to re-roll (every die is already a locked Success): do nothing
  // rather than rolling a phantom die that would grow the pool.
  if (rerollCount <= 0) return;

  const roll = new Roll(R.buildRollFormula(rerollCount, { reroll: true }));
  await roll.evaluate();
  if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);

  const merged = R.mergePolls(keep, R.tallyDiceFaces(roll.dice));
  await renderPlainRollCard(message, { tally: merged, rollType, originalNorm });
}

/**
 * Give up a Success on a plain /roll card: drop the clicked face and re-render
 * the card in its finalized state (the given-up die shown cancelled, no further
 * re-rolls). Mirrors the give-up flow on skill-roll cards, but with no
 * difficulty / outcome (plain rolls have neither).
 * @param {ChatMessage} message
 * @param {string|number} face  the Success face to give up (the die's value)
 * @param {Record<string, number>} currentPoll  the face counts shown on the card
 */
async function giveUpPlainRoll(message, face, currentPoll) {
  await renderPlainRollCard(message, {
    tally: currentPoll,
    rollType: HouseholdRoll.ROLL_TYPES.REROLL,
    cancelFace: Number(face),
    finalized: true
  });
}

/**
 * Wire the re-roll buttons (and the give-up dice) on plain /roll cards to the
 * roll.mjs flow.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
function wirePlainRollCard(message, html) {
  html.querySelectorAll(".reroll-button").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const ds = event.currentTarget.dataset;
      await rerollPlainRoll(message, ds.rerolltype, JSON.parse(ds.currentpoll));
    });
  });

  // When a re-roll did not improve, Success dice carry the .give_up class and
  // become clickable to give one up (see dice-roll.hbs / faces.html).
  html.querySelectorAll(".give_up").forEach((die) => {
    die.addEventListener("click", async (event) => {
      event.preventDefault();
      const ds = event.currentTarget.dataset;
      await giveUpPlainRoll(message, ds.face, JSON.parse(ds.currentpoll));
    });
  });
}

/* -------------------------------------------- */
/*  Chat card render dispatch (single hook)     */
/* -------------------------------------------- */

// One MutationObserver keeps the chat log pinned to the bottom as messages (and
// their async card updates) change its height. Created once and reused — the
// previous code attached a fresh observer on every message render, leaking one
// per message.
let _chatLogObserver = null;
function pinChatLogToBottom() {
  if (_chatLogObserver) return;
  const chatLog = document.querySelector("#chat-log");
  if (!chatLog) return;
  _chatLogObserver = new MutationObserver(() => {
    chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
  });
  _chatLogObserver.observe(chatLog, { childList: true });
}

/** Whether the current user may interact with (re-roll on) a message's card. */
function canActOnMessage(message) {
  return message.author?.id === game.user.id || game.user.isGM;
}

/** Whether a whisper hides this message from the current user. */
function isMessageHidden(message) {
  return message.whisper.length > 0 && !message.whisper.includes(game.user.id) && !game.user.isGM;
}

/** Stamp every button on a (re-rendered) card with the real message id. */
function rewriteButtonMessageIds(message, html) {
  html.querySelectorAll("button").forEach((button) => {
    button.setAttribute("data-message-id", message._id);
  });
}

/** Reveal the content of a plain (non-card) chat message. */
function revealMessageContent(html) {
  html.classList.add("show-content");
  const content = html.querySelector(".message-content");
  if (content) content.style.setProperty("display", "block", "important");
}

/**
 * Turn a brand-new plain `/roll` of pure d6s into a Household plain-roll card.
 * Other rolls (a numeric modifier, non-d6 dice) are left untouched.
 * @param {ChatMessage} message
 * @returns {Promise<boolean>}  true if the message was rendered as a card
 */
async function tryRenderPlainRoll(message) {
  if (!message.rolls.length) return false;
  const roll = message.rolls[0];
  if (!(roll instanceof Roll)) return false;
  const pureD6 = roll.terms.every(
    (term) => term?.faces == 6 || term instanceof foundry.dice.terms.OperatorTerm
  );
  if (!pureD6) return false;

  // A plain /roll of d6s is treated as an initial Household roll with an unknown
  // difficulty: scored for Successes and offered re-roll options, but with no
  // pass/fail outcome. See renderPlainRollCard / rerollPlainRoll.
  const tally = HouseholdRoll.tallyDiceFaces(roll.dice);
  await renderPlainRollCard(message, {
    tally,
    rollType: HouseholdRoll.ROLL_TYPES.INITIAL,
    originalNorm: 0
  });
  return true;
}

/**
 * Single entry point for rendering Household chat cards, dispatching by the
 * message's `household` flags:
 *   - `customCss` → the interactive skill-roll card,
 *   - `plainRoll` → the interactive plain /roll card,
 *   - neither     → a fresh message: maybe convert a pure-d6 /roll into a card,
 *                   otherwise just reveal its content.
 * Replaces the four separate renderChatMessageHTML hooks this file used to have.
 */
Hooks.on("renderChatMessageHTML", async (message, html) => {
  const flags = message.flags?.household ?? {};

  // Always: mark custom cards and keep the log scrolled to the bottom.
  if (flags.customCss) html.classList.add("household-custom-chat");
  pinChatLogToBottom();

  // Interactive skill-roll card (wireSkillRollCard does its own ownership check).
  if (flags.customCss) {
    rewriteButtonMessageIds(message, html);
    wireSkillRollCard(message, html);
    return;
  }

  // Interactive plain /roll card.
  if (flags.plainRoll) {
    if (canActOnMessage(message) && !isMessageHidden(message)) wirePlainRollCard(message, html);
    return;
  }

  // A fresh message with no Household flags. Respect blind/whisper before
  // turning a /roll into a card or revealing plain content.
  if (message.blind === true && !canActOnMessage(message)) return;
  if (isMessageHidden(message)) return;
  if (!flags.noChanges && await tryRenderPlainRoll(message)) return;
  revealMessageContent(html);
});





