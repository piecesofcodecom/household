// Import document classes.
import { HouseholdActor } from './documents/actor.mjs';
import { HouseholdItem } from './documents/item.mjs';
// Import sheet classes.
import { HouseholdActorSheet } from './sheets/actor-sheet.mjs';
import { HouseholdItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { HOUSEHOLD } from './helpers/config.mjs';

import {
  getCharacter,
  characterData,
} from "./sheets/actor-hud.mjs";
import * as actions from "./helpers/actions.mjs";
import { isGm } from "./helpers/utils.mjs";

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
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.household = {
    HouseholdActor,
    HouseholdItem,
    rollItemMacro,
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
  CONFIG.Combat.initiative = {
    formula: '1d20',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = HouseholdActor;
  CONFIG.Item.documentClass = HouseholdItem;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('household', HouseholdActorSheet, {
    makeDefault: true,
    label: 'HOUSEHOLD.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('household', HouseholdItemSheet, {
    makeDefault: true,
    label: 'HOUSEHOLD.SheetLabels.Item',
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */
Handlebars.registerHelper("range", function (n, block) {
  let accum = "";
  for (let i = 0; i < n; ++i) {
    accum += block.fn(i);
  }
  return accum;
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
  if(field === 'society' || field === 'heart') return 'heart';
  if(field === 'academia' || field === 'diamond') return 'diamond';
  if(field === 'war' || field === 'club') return 'club';
  if(field === 'street' || field === 'spade') return 'spade';
  return "empty-set";
});

Handlebars.registerHelper('getWeaponTypeIcon', function (raw_data) {
  const type = raw_data.trim().toLowerCase();
  if(type.includes('melee')) return 'fa-hand-back-fist';
  if(type.includes('ranged')) return 'fa-bullseye';
  if(type.includes('dueling')) return 'fa-swords';
  return "empty-set";
});

Handlebars.registerHelper('getFieldColor', function (raw_data) {
  const field = raw_data.trim().toLowerCase();
  if(field === 'society' || field === 'heart') return 'red';
  if(field === 'academia' || field === 'diamond') return 'blue';
  if(field === 'war' || field === 'club') return 'green';
  if(field === 'street' || field === 'spade') return 'black';
  return "red";
});

Handlebars.registerHelper('doCheckIf', function (operand_1, operator, operand_2) {
  
  let operators = {                     //  {{#when <operand1> 'eq' <operand2>}}
    'eq': (l,r) => l == r,              //  {{/when}}
    'noteq': (l,r) => l != r,
    'gt': (l,r) => (+l) > (+r),                        // {{#when var1 'eq' var2}}
    'gteq': (l,r) => ((+l) > (+r)) || (l == r),        //               eq
    'lt': (l,r) => (+l) < (+r),                        // {{else when var1 'gt' var2}}
    'lteq': (l,r) => ((+l) < (+r)) || (l == r),        //               gt
    'or': (l,r) => l || r,                             // {{else}}
    'and': (l,r) => l && r,                            //               lt
    '%': (l,r) => (l % r) === 0,
    'in': (l,r) => r.split(',').includes(l)                        // {{/when}
  }
  
  let result = operators[operator](operand_1,operand_2);
  if(result) return "checked";
  return "";
});


Handlebars.registerHelper('reduceBy', function (value, rd) {
  return Number(value)-Number(rd);
});

Handlebars.registerHelper("multipleOf", function(value, multipler, options) {
  if ((Number(value) % Number(multipler)) == 0) {
    return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('stressPercentage', function(stress) {
  if (!stress || stress.max === 0) {
    return 1;
  }
  
  const percentage = 1- ((stress.max - stress.current) / stress.max);
  return percentage; // Clamping the value between 0 and 100
});

Handlebars.registerHelper('getOpacyDecorum', function(decorum) {
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

Handlebars.registerHelper("when", function(operand_1, operator, operand_2, options) {
  let operators = {                     //  {{#when <operand1> 'eq' <operand2>}}
    'eq': (l,r) => l == r,              //  {{/when}}
    'noteq': (l,r) => l != r,
    'gt': (l,r) => (+l) > (+r),                        // {{#when var1 'eq' var2}}
    'gteq': (l,r) => ((+l) > (+r)) || (l == r),        //               eq
    'lt': (l,r) => (+l) < (+r),                        // {{else when var1 'gt' var2}}
    'lteq': (l,r) => ((+l) < (+r)) || (l == r),        //               gt
    'or': (l,r) => l || r,                             // {{else}}
    'and': (l,r) => l && r,                            //               lt
    '%': (l,r) => (l % r) === 0,
    'in': (l,r) => r.split(',').includes(String(l))                          // {{/when}}
  }
  
  let result = operators[operator](operand_1,operand_2);
  if(result) return options.fn(this); 
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
      (accumulator, [key,currentValue]) => { obj[key].locked ? initialValue +=1 : 0 },
      {},
    );
  if(initialValue)
    return options.fn(this);
  return options.inverse(this);
});

Handlebars.registerHelper('hasNoSuccess', function (obj, options) {
  let initialValue = 0;
    Object.entries(obj).reduce(
      (accumulator, [key,currentValue]) => { !obj[key].locked ? initialValue +=1 : 0 },
      {},
    );
    if(initialValue)
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

Handlebars.registerHelper("actionTypeName", (type) => {
  const key = actionTypeNames[type] || "other_actions";
  return game.i18n.localize(`HOUSEHOLD.${key}`);
});

Handlebars.registerHelper("modifier", (x) => (x < 0 ? x : `+${x}`));

Handlebars.registerHelper("abilityName", (id) =>
  game.i18n.localize(`HOUSEHOLD.Ability${id.titleCase()}Abbr`)
);

Handlebars.registerHelper("firstWord", (str) => str.split(" ")[0]);



/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.on('renderChatMessage', (message, html, data) => {
  // Get the chat log element
  const chatLog = document.querySelector('#chat-log');
  if (chatLog) {
    // Scroll to the bottom
    const observer = new MutationObserver(() => {
      chatLog.scrollTo({
        top: chatLog.scrollHeight,
        behavior: 'smooth'
      });
    });
    observer.observe(chatLog, { childList: true });
  }
});

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

/**
 * Message Hooks
 */

Hooks.on('renderDialog', (dialog, html, content) => {
  html.find('.profession-select').click(async function(event) {
    const description = event.currentTarget.parentNode.querySelector('#profession-description-popup');
    let item = await fromUuid(event.target.value);

    if (item) {
      if (Object.keys(item).length > 0) {
        description.innerHTML = "";
        description.textContent = "";
        description.innerHTML = item.system.description;
      }
    }

  })
})
/*
Other Hooks */
Hooks.on('renderChatMessage', (message, html, data) => {
  // make a new parser
  if (! message.flags?.customCss) return;
  const parser = new DOMParser();
  const actor = message.speaker.actor;
  const token = message.speaker.token;
   

  // convert html string into DOM
  const documentRoll = parser.parseFromString(message.flavor, "text/html");

  html.find('.field-option').click(event => {
    event.preventDefault();
    const dataset = event.target.dataset;
    const collection = documentRoll.getElementsByClassName('field-option')
    for (let i = 0; i < collection.length; i++) {
      if(collection[i].id == event.target.id) {
        collection[i].setAttribute('checked', 'checked');
      } else {
        collection[i].removeAttribute('checked');
      }
    }
    const serializer = new XMLSerializer();
    const serializedString = serializer.serializeToString(documentRoll);
    message.update({ flavor: serializedString });
  });
  html.find('.difficulty-option').on('change', event => {
    event.preventDefault();
    //const element = event.target;
    //const dataset = event.target.dataset;
    const collection = documentRoll.getElementsByClassName('difficulty-option')
    for (let i = 0; i < collection.length; i++) {
      if(collection[i].id == event.target.id) {
        collection[i].placeholder = event.target.value;
        collection[i].value = '';
        if(event.target.value > 0 ) {
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
    message.update({ flavor: serializedString });
  });

  html.find('.modifier-option').click(event => {
    event.preventDefault();
    const dataset = event.target.dataset;
    const collection = documentRoll.getElementsByClassName('modifier-option')
    for (let i = 0; i < collection.length; i++) {
      if(collection[i].id == event.target.id) {
        collection[i].setAttribute('checked', 'checked');
      } else {
        collection[i].removeAttribute('checked');
      }
    }
    const serializer = new XMLSerializer();
    const serializedString = serializer.serializeToString(documentRoll);
    message.update({ flavor: serializedString });
  });
  
  html.find('.roll-ability').click(event => {
    event.preventDefault();
    const element = documentRoll.getElementById('roll-button');

    let mod = 0;
    const modifier_collection = documentRoll.getElementsByClassName('modifier-option')    
    for (let i = 0; i < modifier_collection.length; i++) {
      if(modifier_collection[i].checked) {
        mod = modifier_collection[i].getAttribute('value');
      }
    }
  
    let field = '';
    const field_collection = documentRoll.getElementsByClassName('field-option')
    for (let i = 0; i < field_collection.length; i++) {
      if(field_collection[i].checked) {
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
    const actor = game.actors.get(message.speaker.actor)
    const skill = dataset.key
    actor.onSkillRoll(field, skill, mod, difficulty);  
  });
  
  html.find('.reroll-button').click(event => {
      event.preventDefault();
      const dataset = event.target.dataset;
      const reroll_type = dataset.rerolltype;
      
      let free_reroll = false;
      let normal_reroll = false;
      let all_in = false;
      if(reroll_type === 'normal') {
        normal_reroll = true;
      } else if(reroll_type == 'allin') {
        all_in = true;
      } else {
        free_reroll = true;
      }
      const actor = game.actors.get(message.speaker.actor)
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
    actor.onSkillRoll(dataset.field, dataset.skill, dataset.mod, poll_difficulty, keep_poll, normal_reroll, free_reroll, all_in, current_success, message_id)
  });

  html.find('.give_up').click(async event => {
    event.preventDefault();
    // TODO refazer essa parte
    const dataset = event.target.dataset;
    const face_gave_up = dataset.face;
    const current_poll = JSON.parse(dataset.currentpoll)
    let clone_current_poll = { ...current_poll }
    clone_current_poll[face_gave_up] = 0;
    const actor = game.actors.get(message.speaker.actor)
    const  poll_difficulty = JSON.parse(dataset.poll_difficulty);
    const evaluation = actor.evaluatePoll(clone_current_poll, poll_difficulty);
    const dice = preparediceToChat(current_poll, Number(face_gave_up));
    const successes = actor.prepareSuccessToChat(evaluation.poll_successes);
    const templateData = {
      ability: "Art",
      skill: 'art',
      field: 'society',
      mod: 1,
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
      outcome: evaluation.outcome 
    };
    const html = await renderTemplate("systems/household/templates/chat/skill-roll-card.hbs", templateData);
    message.update({ flavor: html });
    

  
  });
  if(game.version.includes('11.')) {
    if (message.user.id !== game.user.id && !game.user.isGM) {
      // Disable or hide input fields
      html.find("input, select, textarea, label").prop("disabled", true);
    }
  } else {
    if (message.author.id !== game.user.id && !game.user.isGM) {
      // Disable or hide input fields
      html.find("input, select, textarea, label").prop("disabled", true);
    }
  }
});

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
Hooks.on("household.onUpdateTokenRequest", async function() {
  if (!game.user.isGM)
    await renderCharacter();
})
Hooks.on("renderApplication", async function () {
  if (!game.user.isGM)
    await renderCharacter();

  if (isGm()) {
    $("#players").removeClass("hidden");
  } else {
    $("#players").addClass("hidden");
  }
});

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
  const sheet = elem.querySelector('#player-character .sheet');
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

  const rollaction = elem.querySelector('#player-character .roll-action');
  if (rollaction) {
    rollaction.addEventListener('click', actions.rollAction);
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
  
  for(let skill of skills) {
    skill.addEventListener("click", actions.dialogRollSkill);
  }
  const abilities = elem.querySelectorAll('#player-character .ability')
  for(let ability of abilities) {
    ability.addEventListener("click", actions.rollAbility);
  }
  const actions_menu = elem.querySelector('#player-character .actions-toggle');
  actions_menu.addEventListener("click", toggleActions);

  const stats_menu = elem.querySelector('#player-character .stats-toggle');
  stats_menu.addEventListener("click", toggleStats);
  
}

function toggleActions(e) {
  e.stopPropagation();
  $(".character-actions").toggleClass("show");
  $(".stats-toggle").removeClass("active");
  $(".actions-toggle").toggleClass("active");
  $(".character-stats").removeClass("show");
}

function toggleStats(e) {
  e.stopPropagation();
  $(".character-stats").toggleClass("show");
  $(".stats-toggle").toggleClass("active");
  $(".actions-toggle").removeClass("active");
  $(".character-actions").removeClass("show");
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
  if (character instanceof TokenDocument || character instanceof Token) {
    actor = character.actor;
  } 
  const data = characterData(actor, character.id);
  if (!data) return;
  const scroll_1 = $('.character-actions-content').scrollTop();
  const scroll_2 = $('.character-stats-content').scrollTop();
  data["tabs"] = {
    characterStats: $(".character-stats").length > 0 ? ($(".character-stats").attr("class")).replace("character-stats") : "",
    statsToggle: $(".stats-toggle").length > 0 ? ($(".stats-toggle").attr("class")).replace("stats-toggle") : "",
    actionsToggle: $(".actions-toggle").length > 0 ? ($(".actions-toggle").attr("class")).replace("actions-toggle") : "",
    characterActions: $(".character-actions").length > 0 ? ($(".character-actions").attr("class")).replace("character-actions") : "",
  }
  data["tabs"].characterStats = data["tabs"].characterStats.trim().replace('undefined','')
  data["tabs"].statsToggle = data["tabs"].statsToggle.trim().replace('undefined','')
  data["tabs"].actionsToggle = data["tabs"].actionsToggle.trim().replace('undefined','')
  data["tabs"].characterActions = data["tabs"].characterActions.trim().replace('undefined','')
  let tpl;

   
  if (actor.type == "npc") {
    tpl = await renderTemplate(
      "systems/household/templates/actor/hud-npc.hbs",
      data
    );
  } else {
    tpl = await renderTemplate(
      "systems/household/templates/actor/hud-character.hbs",
      data
    );
  }

  elem.innerHTML = tpl;
  $('.character-actions-content').scrollTop(scroll_1);
  $('.character-stats-content').scrollTop(scroll_2);
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
    colorset:'household',
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
    colorset:'garden',
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

Hooks.on("renderChatMessage", async (message, html, data) => {
  if (! message.flags?.customCss) {
    if (message.rolls.length > 0) {
      const roll = message.rolls[0];
      if (roll instanceof Roll) {
        const dice = [];
        for (const term of roll.terms) {
          for (const die of term.results) {
            dice.push({
              face: die.result,
              locked: false
            });
          }
        }
        
        // const dice = roll.dice;
        // const faces = dice.map((d) => d.faces);
        // const total = dice.reduce((acc, d) => acc + d.total, 0);
        // const facesCount = faces.reduce((acc, f) => {
        //   acc[f] = (acc[f] || 0) + 1;
        //   return acc;
        // }, {});

        //const diceToChat = preparediceToChat(facesCount);
        //const diceString = JSON.stringify(diceToChat);

        const templateData = {
          dice: dice,
          /*dice_string: diceString,
          total: total,*/
        };
        const html = await renderTemplate("systems/household/templates/chat/dice-roll.hbs", templateData);
        message.update({ flavor: html, flags: { customCss: true } });
        //message.flags.customCss = true;
      }
    }
  } else {
    const messageId = message.id;
      //const updatedHtml = html.replace(/data-message-id="MESSAGEID"/g, `data-message-id="${messageId}"`);
      html.find('button').each(function(index) {
        $(this).attr('data-message-id', messageId);
    });
      // Update the chat message with the new HTML
      // await message.update({
      //   flavor: updatedHtml
      // });
  }
});




