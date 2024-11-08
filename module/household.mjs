// Import document classes.
import { HouseholdActor } from './documents/actor.mjs';
import { HouseholdItem } from './documents/item.mjs';
// Import sheet classes.
import { HouseholdActorSheet } from './sheets/actor-sheet.mjs';
import { HouseholdItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { HOUSEHOLD } from './helpers/config.mjs';

/*import {
  getCharacter,
  characterData,
} from "./sheets/actor-hud.mjs";*/
import * as actions from "./helpers/actions.mjs";
import { isGm } from "./helpers/utils.mjs";
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

  await loadTemplates([
    "systems/household/templates/actor/hud-character.hbs"
  ]);

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
  game.i18n.localize(`DND5E.Ability${id.titleCase()}Abbr`)
);

/*Handlebars.registerHelper("skillName", (id) =>
  game.i18n.localize(`DND5E.Skill${id.titleCase()}`)
);*/

Handlebars.registerHelper("firstWord", (str) => str.split(" ")[0]);

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

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
  (HOUSEHOLD.premium);
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
    actor.onSkillRoll(dataset.field, dataset.skill, dataset.mod, poll_difficulty, keep_poll, normal_reroll, free_reroll, all_in, current_success)
  });

  html.find('.give_up').click(async event => {
    event.preventDefault();
    const dataset = event.target.dataset;
    const face_gave_up = dataset.face;
    const current_poll = JSON.parse(dataset.currentpoll)
    let clone_current_poll = { ...current_poll }
    clone_current_poll[face_gave_up] = 0;
    const actor = game.actors.get(message.speaker.actor)
    const  poll_difficulty = JSON.parse(dataset.poll_difficulty);
    const evaluation = actor.evaluatePoll(clone_current_poll, poll_difficulty)

    const dice = actor.prepareDiceToChat(current_poll, Number(face_gave_up));
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
Hooks.on("renderApplication", async function () {
  //await renderCharacter();

  if (isGm()) {
    $("#players").removeClass("hidden");
  } else {
    $("#players").addClass("hidden");
  }
});

Hooks.on("updateActor", async function (actor) {
  /*if (actor.id === getCharacter()?.id) {
    await renderCharacter();
  }*/
});

Hooks.on("updateOwnedItem", async function (actor, _, diff) {
  /*if (actor.id !== getCharacter()?.id) {
    return;
  }*/

  // Wait a little bit so the item is updated and can be rendered
  // correctly in the actions list.
  /*await new Promise((resolve) => setTimeout(resolve, 1000));
  await renderCharacter();*/
});

Hooks.on('controlToken', async function () {
  if (!isGm()) return;
  //await renderCharacter();
});

Hooks.on('refreshToken', async function () {
  //if (!isGm()) return;
  //await renderCharacter();
});


Hooks.on('deleteToken', async function () {
  if (!isGm()) return;
  //await renderCharacter();
})

function activatePlayerListeners(elem) {
  const sheet = elem.querySelector('#player-character .sheet');
  sheet.addEventListener("click", actions.openSheet);
  setupHealthPointsTracker("#current-health");
  
  const skills = elem.querySelectorAll('#player-character .skill')
  for(let skill of skills) {
    skill.addEventListener("click", actions.rollSkill);
  }
  //$(elem).on("click", "#player-character .save", actions.rollSave);
  //$(elem).on("click", "#player-character .ability", actions.rollAbility);
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

  const data = characterData(character);
  if (!data) return;

  const tpl = await renderTemplate(
    "systems/household/templates/actor/hud-character.hbs",
    data
  );

  elem.innerHTML = tpl;
  activatePlayerListeners(elem);
}




