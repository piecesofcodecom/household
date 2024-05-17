/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
class HouseholdActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    actorData.system;
    actorData.flags.household || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    actorData.system;
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    systemData.xp = systemData.cr * systemData.cr * 100;
  }

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const data = { ...super.getRollData() };

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  _getFormula(dice_poll, reroll = false) {
    let formula = "1d6 + 1d6";
    if (reroll) {
      formula = "1d6";
      dice_poll -= 1;
    } else {
      dice_poll -= 2;
    }

    for (let i = 0; i < dice_poll && i < 7; i++) {
      formula += " + 1d6";
    }
    return formula;
  }

  async showAction(action) {
    const roman = {
      1: "I",
      2: "II",
      3: "III",
      4: "IV",
      5: "V",
      6: "VI"
    };
    const templateData = {
      label: "Action " + roman[action],
      description: this.system.actions[`action_${action}`]
    };
    return await renderTemplate("systems/household/templates/chat/action-show-card.hbs", templateData);

  }

  async _skillRoll(field, skill, mod = 0) {
    const field_dices = this.system.fields[field].value;
    const skill_dices = this.system.skills[skill].value;
    let dice_poll = (Number(field_dices) + Number(skill_dices) + Number(mod));
    const formula = this._getFormula(dice_poll);

    let roll = new Roll(formula);
    await roll.evaluate();
    return {
      poll: Array.from(Object.values(roll.terms).filter(item => item instanceof Die)),
      roll: roll
    };

  }

  prepareSuccessToChat(success_poll) {
    const success_label = {
      '2': 'Basic',
      '3': 'Critical',
      '4': 'Extreme',
      '5': 'Impossible',
      '6': 'Jackpot'
    };
    let succ_to_chat = [];
    for (let [key, value] of Object.entries(success_poll)) {
      if (Number(value) > 0) {
        succ_to_chat.push({
          code: Number(key),
          label: success_label[key],
          value: value
        });
      }
    }
    return succ_to_chat;
  }

  prepareDicesToChat(dice_poll, cancel_face = 0) {
    const success_label = {
      '2': 'basic',
      '3': 'critical',
      '4': 'extreme',
      '5': 'impossible',
      '6': 'jackpot'
    };
    let dices_to_chat = [];
    for (let [key, value] of Object.entries(dice_poll)) {
      if (value > 0) {
        for (let j = 0; j < value; j++) {
          dices_to_chat.push({
            face: Number(key),
            success: value > 1 ? success_label[value] : 'none',
            locked: dice_poll[key] > 1 ? true : false,
            face_display: Number(key) === Number(cancel_face) ? 0 : Number(key),
          });
        }
      }
    }
    return dices_to_chat;
  }
  async _sendToChat(roll, field, skill, mod, poll_difficulty, dice_poll, success_poll, outcome, is_reroll, is_allin, is_jackpot, allow_reroll, allow_allin, give_up) {
    //face=dice.face locked=dice.locked success=dice.success

    const dices = this.prepareDicesToChat(dice_poll);
    const successes = this.prepareSuccessToChat(success_poll);

    if (is_allin) {
      allow_allin = 0;
      allow_reroll = 0;
    }

    // if there is no remaining dices, no buttons


    let initialValue = 0;
    Object.entries(dices).reduce(
      (accumulator, [key, currentValue]) => { !dices[key].locked ? initialValue += 1 : 0; },
      {},
    );

    if (initialValue == 0) {
      allow_allin = allow_reroll = 0;
    }

    const templateData = {
      ability: skill.charAt(0).toUpperCase() + skill.slice(1),
      skill: skill,
      field: field,
      mod: mod,
      actor: this,
      dices: dices,
      currentpoll: JSON.stringify(dice_poll),
      dices_string: JSON.stringify(dices),
      poll_difficulty: JSON.stringify(poll_difficulty),
      poll_success: JSON.stringify(success_poll),
      successes: successes,
      reroll: allow_reroll ? 1 : 0,
      allin: allow_allin ? 1 : 0,
      reroll_message: is_reroll ? "Reroll" : "Rolling",
      give_up: give_up ? "give_up" : "",
      give_up_face: 0,
      outcome: give_up ? "LostSuccess" : outcome
    };
    const html = await renderTemplate("systems/household/templates/chat/skill-roll-card.hbs", templateData);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: html,
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }

  _normilize(array) {
    let factor = 1;
    let total = 0;
    for (let [key, value] of Object.entries(array)) {
      total += (Number(value) * factor);
      factor = factor * 3;
    }
    return total;
  }

  /**
   * PUBLIC METHODS
   */

  _get_poll(field, skill, mod) {
    const field_dices = this.system.fields[field].value;
    const skill_dices = this.system.skills[skill].value;
    let dice_poll = (Number(field_dices) + Number(skill_dices) + Number(mod));
    return dice_poll;

  }
  async onReroll(field, skill, mod, keep_poll) {
    const original_poll = this._get_poll(field, skill, mod);
    let initialValue = 0;
    const remove_from_poll = Object.entries(keep_poll).reduce(
      (accumulator, [key, currentValue]) => accumulator + currentValue,
      initialValue,
    );
    const for_this_poll = Number(original_poll) - Number(remove_from_poll);
    const formula = this._getFormula(Number(for_this_poll), true);
    let roll = new Roll(formula);
    await roll.evaluate();
    return {
      poll: Array.from(Object.values(roll.terms).filter(item => item instanceof Die)),
      roll: roll
    };

  }

  /**
   * Roll a skill
   * INPUTS
   * field (string): the field to use
   * skill (string): the skill to use
   * difficulty_poll (object): the difficulty of the roll (if empty, the roll doesnt provide an outcome)
   * current_poll (array): the previous roll
   * is_reroll (boolean): if it is a reroll
   * is_free_reroll (boolean): if it is a free reroll
   * 
   * Returns
   * { 
   * poll (array): result of the roll
   * outcome(boolean): returns true if success, false when failure or difficult_poll is not provided
   * }
   */

  evaluatePoll(transformed_poll_result, poll_difficulty) {
    const normalized_difficult = this._normilize(poll_difficulty);
    const poll_successes = {
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0
    };
    let outcome = 'Failure';
    for (let i = 1; i < 7; i++) {
      const index = String(i);
      if (transformed_poll_result[index] > 1) {
        const idx = String(transformed_poll_result[index]);
        poll_successes[idx] += 1;
      }
    }
    let is_jackpot = false;
    const normalized_success = this._normilize(poll_successes);
    if (poll_successes['6'] > 0 && normalized_success >= normilized_jackpot) {
      outcome = 'Jackpot';
      is_jackpot = true;
    } else if (normalized_difficult <= normalized_success) {
      outcome = 'Success';
    }
    if(normalized_difficult == 0) outcome = '';
    return {
      poll_difficulty,
      transformed_poll_result,
      poll_successes,
      outcome,
      is_jackpot,
    }
  }

  async onSkillRoll(field, skill, mod, poll_difficulty = {
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0
  }, keep_poll = false, is_reroll = false, is_free_reroll = false, is_allin = false, original_poll_success = {}) {

    const normalized_difficult = this._normilize(poll_difficulty);
    const normalized_original_success = this._normilize(original_poll_success);
    const normilized_jackpot = 81;
    let allow_allin = true;
    let allow_reroll = true;
    let transformed_poll_result = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0
    };

    const poll_successes = {
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
      '6': 0
    };

    let outcome = 'Failure';
    let skill_roll = {};
    let roll = {};
    let original_poll_result = [];
    if (is_reroll || is_free_reroll || is_allin) {
      allow_reroll = false;
      skill_roll = await this.onReroll(field, skill, mod, keep_poll);
      original_poll_result = skill_roll.poll;
      roll = skill_roll.roll;

      original_poll_result.forEach(die => {
        const results = die.results;
        for (let i = 0; i < results.length; i++) {
          if (results[i].active) {
            transformed_poll_result[results[i].result] += 1;
          }
        }
      });
      const merged_poll = Object.entries(transformed_poll_result).reduce(
        (accumulator, [key, value]) => ({ ...accumulator, [key]: (accumulator[key] || 0) + value })
        , { ...keep_poll });
      transformed_poll_result = merged_poll;

    } else {
      allow_allin = false;
      skill_roll = await this._skillRoll(field, skill, mod);
      original_poll_result = skill_roll.poll;
      roll = skill_roll.roll;

      original_poll_result.forEach(die => {
        const results = die.results;
        for (let i = 0; i < results.length; i++) {
          if (results[i].active) {
            transformed_poll_result[results[i].result] += 1;
          }
        }
      });

    }
    for (let i = 1; i < 7; i++) {
      const index = String(i);
      if (transformed_poll_result[index] > 1) {
        const idx = String(transformed_poll_result[index]);
        poll_successes[idx] += 1;
      }
    }
    let is_jackpot = false;
    const normalized_success = this._normilize(poll_successes);
    if (normalized_success === 0) {
      allow_reroll = false;
    }
    if (poll_successes['6'] > 0 && normalized_success >= normilized_jackpot) {
      outcome = 'Jackpot';
      is_jackpot = true;
    } else if (normalized_difficult <= normalized_success) {
      outcome = 'Success';
    }
    let give_up = false;
    if (normalized_success <= normalized_original_success && (is_reroll || is_allin)) {
      if (is_allin) {
        give_up = false;
        allow_allin = true;
        outcome = 'Failure';
        Object.keys(poll_successes).forEach((item) => {
          poll_successes[item] = 0;
        });
      } else {
        give_up = true;
        allow_allin = false;
      }
    }
    if(normalized_difficult == 0) outcome = '';

    this._sendToChat(
      roll, 
      field, 
      skill, 
      mod, 
      poll_difficulty, 
      transformed_poll_result, 
      poll_successes, 
      outcome, 
      is_reroll, 
      is_allin, 
      is_jackpot, 
      allow_reroll, 
      allow_allin, 
      give_up
    );
    return;

  }
}

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
class HouseholdItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const rollData = { ...super.getRollData() };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    ChatMessage.getSpeaker({ actor: this.actor });
    game.settings.get('core', 'rollMode');
    `[${item.type}] ${item.name}`;
    if(item.system.skill.trim() != '') {
      let field = item.system.field;
      if(field.trim() == '') {
        const suit = this.actor.systems.skills[skill].suit;
        this.actor.system.fields;
        for (let [k, v] of Object.entries(this.actor.system.fields)) {
          if(v === suit) {
            field = k;
          }
        }
      }
      const skill = item.system.skill.toLowerCase();
      ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: ''
      }).then(async msg => {
        const templateData = {
          ability: skill.charAt(0).toUpperCase() + skill.slice(1),
          skill: this.actor.system.skills[skill],
          fields: this.actor.system.fields,
          key: skill,
          field: field.toLowerCase(),
          actor: this.actor,
          timestamp: msg.timestamp
        };
        const html = await renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
        msg.update( { flavor: html } );
      });
    }
  }
}

/**
 * Manage Active Effect instances through an Actor or Item Sheet via effect control buttons.
 * @param {MouseEvent} event      The left-click event on the effect control
 * @param {Actor|Item} owner      The owning document which manages this effect
 */
function onManageActiveEffect(event, owner) {
  event.preventDefault();
  const a = event.currentTarget;
  const li = a.closest('li');
  const effect = li.dataset.effectId
    ? owner.effects.get(li.dataset.effectId)
    : null;
  switch (a.dataset.action) {
    case 'create':
      return owner.createEmbeddedDocuments('ActiveEffect', [
        {
          name: game.i18n.format('DOCUMENT.New', {
            type: game.i18n.localize('DOCUMENT.ActiveEffect'),
          }),
          icon: 'icons/svg/aura.svg',
          origin: owner.uuid,
          'duration.rounds':
            li.dataset.effectType === 'temporary' ? 1 : undefined,
          disabled: li.dataset.effectType === 'inactive',
        },
      ]);
    case 'edit':
      return effect.sheet.render(true);
    case 'delete':
      return effect.delete();
    case 'toggle':
      return effect.update({ disabled: !effect.disabled });
  }
}

/**
 * Prepare the data structure for Active Effects which are currently embedded in an Actor or Item.
 * @param {ActiveEffect[]} effects    A collection or generator of Active Effect documents to prepare sheet data for
 * @return {object}                   Data for rendering
 */
function prepareActiveEffectCategories(effects) {
  // Define effect header categories
  const categories = {
    temporary: {
      type: 'temporary',
      label: game.i18n.localize('HOUSEHOLD.Effect.Temporary'),
      effects: [],
    },
    passive: {
      type: 'passive',
      label: game.i18n.localize('HOUSEHOLD.Effect.Passive'),
      effects: [],
    },
    inactive: {
      type: 'inactive',
      label: game.i18n.localize('HOUSEHOLD.Effect.Inactive'),
      effects: [],
    },
  };

  // Iterate over active effects, classifying them into categories
  for (let e of effects) {
    if (e.disabled) categories.inactive.effects.push(e);
    else if (e.isTemporary) categories.temporary.effects.push(e);
    else categories.passive.effects.push(e);
  }
  return categories;
}

const HOUSEHOLD = {};

/**
 * The set of Ability Scores used within the system.
 * @type {Object}
 */
HOUSEHOLD.abilities = {
  str: 'HOUSEHOLD.Ability.Str.long',
  dex: 'HOUSEHOLD.Ability.Dex.long',
  con: 'HOUSEHOLD.Ability.Con.long',
  int: 'HOUSEHOLD.Ability.Int.long',
  wis: 'HOUSEHOLD.Ability.Wis.long',
  cha: 'HOUSEHOLD.Ability.Cha.long',
};

HOUSEHOLD.abilityAbbreviations = {
  str: 'HOUSEHOLD.Ability.Str.abbr',
  dex: 'HOUSEHOLD.Ability.Dex.abbr',
  con: 'HOUSEHOLD.Ability.Con.abbr',
  int: 'HOUSEHOLD.Ability.Int.abbr',
  wis: 'HOUSEHOLD.Ability.Wis.abbr',
  cha: 'HOUSEHOLD.Ability.Cha.abbr',
};

HOUSEHOLD.fields = {
  society: 'HOUSEHOLD.Field.Society.long',
  academia: 'HOUSEHOLD.Field.Academia.long',
  war: 'HOUSEHOLD.Field.War.long',
  street: 'HOUSEHOLD.Field.Street.long'
};

HOUSEHOLD.skills = {
  art: 'HOUSEHOLD.Skill.Art.long',
  charm: 'HOUSEHOLD.Skill.Charm.long',
  eloquence: 'HOUSEHOLD.Skill.Eloquence.long',
  etiquette: 'HOUSEHOLD.Skill.Etiquette.long',
  grace: 'HOUSEHOLD.Skill.Grace.long',
  care: 'HOUSEHOLD.Skill.Care.long',
  craft: 'HOUSEHOLD.Skill.Craft.long',
  culture: 'HOUSEHOLD.Skill.Culture.long',
  insight: 'HOUSEHOLD.Skill.Insight.long',
  investigation: 'HOUSEHOLD.Skill.Investigation.long',
  athletics: 'HOUSEHOLD.Skill.Athletics.long',
  authority: 'HOUSEHOLD.Skill.Authority.long',
  fight: 'HOUSEHOLD.Skill.Fight.long',
  strength: 'HOUSEHOLD.Skill.Strength.long',
  will: 'HOUSEHOLD.Skill.Will.long',
  caution: 'HOUSEHOLD.Skill.Caution.long',
  dexterity: 'HOUSEHOLD.Skill.Dexterity.long',
  elusion: 'HOUSEHOLD.Skill.Elusion.long',
  exploration: 'HOUSEHOLD.Skill.Exploration.long',
  shoot: 'HOUSEHOLD.Skill.Shoot.long'
};


HOUSEHOLD.fieldsAbbreviations = {
  society: 'HOUSEHOLD.Field.Society.abbr',
  academia: 'HOUSEHOLD.Field.Academia.abbr',
  war: 'HOUSEHOLD.Field.War.abbr',
  street: 'HOUSEHOLD.Field.Street.abbr'
};

HOUSEHOLD.premium = false;
HOUSEHOLD.premium_name = 'household-premium';

async function addMove(actor, itemUuid, _item) {
    addItem(actor, itemUuid);

    //Time to pick vocation
    if (_item.type == 'profession') {
        let collection_vocations = game.items.filter(el => el.type === 'vocation' && el.system.profession.toLowerCase() == _item.name.toLowerCase());
        if(HOUSEHOLD.premium) {
            const packs = game.packs.get(HOUSEHOLD.premium_name+'.character');
            const contents = await packs.getDocuments();
            const compendium_items = contents.filter(el => el.type === 'vocation' && el.system.profession.toLowerCase() == _item.name.toLowerCase());
            if(compendium_items.length>0) {
                collection_vocations = collection_vocations.concat(compendium_items);
            }
        }
        let html = '<form><div class="f-group"><select class="profession-select" id="vocation" name="vocation"><option value"" selected>Select your Vocation</option>';
       
        collection_vocations.forEach(vocation => {
            html += '<option value="'+vocation.uuid+'">'+vocation.name+'</option>';
        });
        html += '</div></select><div id="profession-description-popup" class="description"></div></form>';

        //dialog
        const myDialogOptions = {
            width: 400,
            height: 400,
            classes: ["household-dialog-class"]
          };
        let d = new Dialog({
            title: "Select your Vocation",
            content: html,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: "OK",
                callback: async (html) => {const _item = await fromUuid(html.find("select#vocation").val()); addNewProfession(_item,actor);}
                }
            },
            default: "one",
            options: {
                classes: ["household-dialog-class"]
            },
        }, myDialogOptions);
        d.render(true);
    }
      
}
async function chooseMove(actor, item) {
    let list_moves = item.system.moves.split(',');
    list_moves = list_moves.map(s => s.trim());
    if(item.system.has_companion) {
        let companion = game.items.filter(el => el.type=="companion" && el.name.toLowerCase() ==actor.system.companion.toLowerCase());
        if(HOUSEHOLD.premium) {
            const packs = game.packs.get(HOUSEHOLD.premium_name+'.equipments');
            const contents = await packs.getDocuments();
            const compendium_items = contents.filter(el => el.type === 'companion' && el.name.toLowerCase() ==actor.system.companion.toLowerCase());
            if(compendium_items.length>0) {
                companion = companion.concat(compendium_items);
            }
        }
        if(companion.length > 0) {
            let comp_moves = companion[0].system.moves.split(',');
            list_moves = list_moves.concat(comp_moves);
        }
    }
    list_moves = list_moves.map(s => s.toLowerCase().trim());
    
    let collection_item = game.items.filter(el => el.type == 'move' && list_moves.includes(el.name.toLowerCase()));
    if(HOUSEHOLD.premium) {
        const packs = game.packs.get(HOUSEHOLD.premium_name+'.moves');
        const contents = await packs.getDocuments();
        const compendium_items = contents.filter(el => el.type == 'move' && list_moves.includes(el.name.toLowerCase()));
        if(compendium_items.length>0) {
            collection_item = collection_item.concat(compendium_items);
        }
    }
    const dialog_title = item.system.has_companion ? "Select a Move from your Companion" : "Select a Move from your Profession";
    let html = '<form><div class="f-group"><select class="profession-select" id="move" name="move"><option value"" selected>'+dialog_title+'</option>';
    collection_item.forEach(move => {
        html += '<option value="'+move.uuid+'">'+move.name+'</option>';
    });
    html += '</div></select><div id="profession-description-popup" class="description"></div></form>';
    

    //dialog
    const myDialogOptions = {
        width: 400,
        height: 400,
        classes: ["household-dialog-class"]
      };
    let d = new Dialog({
        title: dialog_title,
        content: html,
        buttons: {
            one: {
            icon: '<i class="fas fa-check"></i>',
            label: "OK",
            callback: (html) => addMove(actor, html.find("select#move").val(), item)
            }
        },
        default: "one",
        options: {
            classes: ["household-dialog-class"]
        },
    }, myDialogOptions);
    d.render(true);

}

async function chooseTrait(actor, item) {
    //validate moves before ask
    let list_traits = item.system.traits.split(',');
    list_traits = list_traits.map(s => s.trim());
    if(item.system.has_companion) {
        const companion = game.items.filter(el => el.type=="companion" && el.name.toLowerCase()==actor.system.companion.toLowerCase());
        if(companion.length > 0) {
            let comp_traits = companion[0].system.traits.split(',');
            comp_traits = comp_traits.map(s => s.trim());
            list_traits = list_traits.concat(comp_traits);
        }
    }
    list_traits = list_traits.map(s => s.toLowerCase().trim());

    let collection = game.items.filter(el => el.type == 'trait' && list_traits.includes(el.name.toLowerCase()));
    if(HOUSEHOLD.premium) {
        const packs = game.packs.get(HOUSEHOLD.premium_name+'.traits');
        const contents = await packs.getDocuments();
        const compendium_items = contents.filter(el => el.type == 'trait' && list_traits.includes(el.name.toLowerCase()));
        if(compendium_items.length>0) {
            collection = collection.concat(compendium_items);
        }
    }
    const dialog_title = item.system.has_companion ? "Select a Trait from your Vocation/Companion" : "Select a Trait from your Vocation";
    let html = '<form><div class="f-group"><select class="profession-select" id="trait" name="trait"><option value"" selected>'+dialog_title+'</option>';
    collection.forEach(trait => {
        html += '<option value="'+trait.uuid+'">'+trait.name+'</option>';
    });
    html += '</div></select><div id="profession-description-popup" class="description"></div></form>';
    
    //dialog
    const myDialogOptions = {
        width: 400,
        height: 400,
        classes: ["household-dialog-class"]
      };
    let d = new Dialog({
        title: dialog_title,
        content: html,
        buttons: {
            one: {
            icon: '<i class="fas fa-check"></i>',
            label: "OK",
            callback: (html) => addItem(actor, html.find("select#trait").val())
            }
        },
        default: "one",
    }, myDialogOptions);
    d.render(true);
}

function populateField(actor, field) {
    const key = field.toLowerCase();
    const new_value = actor.system.fields[key].value + 1;
    actor.update({ [`system.fields.${key}.value`]: new_value });
}

function populateSkills(actor, skills) {
    skills = skills.map(s => s.trim());
    let new_value = actor.system.skills;
    skills.forEach(skill => {
        const sk = skill.toLowerCase();
        new_value[sk].value = actor.system.skills[sk].value + 1;
        
    });
    actor.update({ 'system.skills': new_value });
}

function isEmpty(obj) {
    for (var prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        return false;
      }
    }
    return true
  }

async function addItem(actor, itemUuid) {
    const item = await fromUuid(itemUuid);
    if (isEmpty(item)) {
        new Dialog({
            title: "Error",
            content: "<p>Trait not found. Make sure you have the item in your wolrd.</p>",
            buttons: {},
            options: {
                classes: ["household-dialog-class"]
            },
          }).render(true);
    } else {
        let newItemData = {
            name: item.name,
            type: item.type,
            img: item.img,
            system: foundry.utils.duplicate(item.system)
          };
          await actor.createEmbeddedDocuments("Item", [newItemData]);
    }
}

async function addCompanion(actor, itemId, item) {
    const companion = await fromUuid(itemId);
    actor.update({ 'system.companion': companion.name });
    chooseMove(actor, item);
    
}

async function raiseError(message) {
    return await new Dialog({
        title: "Error",
        content: message,
        buttons: {},
        options: {
            classes: ["household-dialog-class"]
        },
      }).render(true);
}

async function selectCompanion(actor, item) {
    let items = game.items.filter(el => el.type == 'companion' && el.system.profession.toLowerCase()==item.name.toLowerCase());
    if(HOUSEHOLD.premium) {
        const packs = game.packs.get(HOUSEHOLD.premium_name+'.equipments');
        const contents = await packs.getDocuments();
        const compendium_items = contents.filter(el => el.type == 'companion' && el.system.profession.toLowerCase()==item.name.toLowerCase());
        if(compendium_items.length>0) {
            items = items.concat(compendium_items);
        }
    }
    if (items.length == 0) {
        return await raiseError("<p>Trait not found. Make sure you have the item in your wolrd.</p>");

    } else {
        let html = '<form><div class="f-group"><select class="profession-select" id="companion" name="companion"><option value"" selected>Select one</option>';
        items.forEach(companion => {
            html += '<option value="'+companion.uuid+'">'+companion.name+'</option>';
        });
        html += '</div></select><div id="profession-description-popup" class="description"></div></form>';
        const myDialogOptions = {
            width: 400,
            height: 400,
            classes: ["household-dialog-class"]
        };
        let d = new Dialog({
            title: "Select your Animal Companion",
            content: html,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: "OK",
                callback: (html) => addCompanion(actor, html.find("select#companion").val(), item)
                }
            },
            default: "one",
            options: {
                classes: ["household-dialog-class"]
            },
        }, myDialogOptions);
        return await d.render(true);

    }
    
}

async function addProfession(actor, item) {

    if (actor.system.profession.trim() != '') {
        let d = new Dialog({
          title: "New Profession",
          content: `<p>You already have the profession ${actor.system.profession}</p><p>Do you want to proceed and add this new profession ${item.name}?</p>`,
          buttons: {
           one: {
            icon: '<i class="fas fa-check"></i>',
            label: "Yes",
            callback: () => addNewProfession(item, actor)
           }
          },
          default: "one",
          options: {
            classes: ["household-dialog-class"]
        },
         });
         d.render(true);
      } else {
        addNewProfession(item, actor);
      }
}
async function addNewProfession(item, actor) {
    if(item.type == 'profession') {
        await actor.update({ 'system.profession': item.name });
        populateSkills(actor, item.system.skills.split(","));
        populateField(actor, item.system.field);
        let trait_list = item.system.traits.split(",");
        trait_list = trait_list.map(s => s.toLowerCase().trim());
        if(trait_list.length == 1) {
            let trait_item = game.items.filter(el => el.name.toLowerCase() == trait_list[0].toLowerCase() && el.type == 'trait');
            if(HOUSEHOLD.premium) {
                const packs = game.packs.get(HOUSEHOLD.premium_name+'.traits');
                const contents = await packs.getDocuments();
                const compendium_items = contents.filter(el => el.name.toLowerCase() == trait_list[0].toLowerCase() && el.type == 'trait');
                if(compendium_items.length>0) {
                    trait_item = trait_item.concat(compendium_items);
                }
            }
            
            if (trait_item.length > 0)
                addItem(actor, trait_item[0].uuid);
        }
        if (item.system.has_companion) {
            if(item.type == 'profession') {
                await selectCompanion(actor, item);
            }
        } else {
            chooseMove(actor, item);
        }
    } else if (item.type == 'vocation') {
        await actor.update({'system.vocation': item.name});
        populateSkills(actor, item.system.skills.split(","));
        populateField(actor, item.system.field);
        chooseTrait(actor, item);

    }
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
class HouseholdActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['household', 'sheet', 'actor'],
      width: 600,
      height: 850,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/household/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {

    for (let [k, v] of Object.entries(context.system.fields)) {
      v.label = game.i18n.localize(CONFIG.HOUSEHOLD.fields[k]) ?? k;
      if (k == 'society') {
        v.icon = "fa-heart";
        v.color = "red";
      }
    }

    for (let [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.HOUSEHOLD.skills[k]) ?? k;
      if(v.field=='society') {
        v.icon = "fa-heart";
        v.color = "red";
      }
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const weapons = [];
    const moves = [];
    const gadgets = [];
    const contracts = [];
    const traits = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to weapons.
      else if (i.type === 'weapon') {
        weapons.push(i);
      } else if (i.type === 'gadget') {
        gadgets.push(i);
      } else if (i.type === 'move') {
        moves.push(i);
      } else if (i.type === 'contract') {
        contracts.push(i);
      } else if (i.type === 'trait') {
        traits.push(i);
      }
    }

    // Assign and return
    context.gear = gear;
    context.weapons = weapons;
    context.traits = traits;
    context.gadgets = gadgets;
    context.moves = moves;
    context.contracts = contracts;
    context.features = [];
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));
    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    html.on('click', '.npc-popup-item-edit', (ev) => {
      //const element = $(ev.currentTarget).parents('.npc-popup-item-edit');;
      const dataset =ev.currentTarget.dataset;
      const path = dataset.path;
      const label = dataset.label;
      const current_value = dataset.value;
      let html = `<input id="newvalue" value="${current_value}">`;
      if (label.toLowerCase() === 'stress') {
        const crucial_boxes = dataset.crucial_boxes;
        html = `Total Stress Boxes ${html}<br />Crucial Box positions: <input id="crucial_boxes" value="${crucial_boxes}" placeholder="example: 3,6,8">`;
      }
      
      return Dialog.wait({
        title: `Edit ${label}`,
        content: html,
        buttons: {
          button1: {
            label: "Save",
            callback: (html) => {
              const new_value = html.find("input#newvalue").val();
              this.actor.update({[path]: new_value});
              const crucial_boxes = html.find("input#crucial_boxes").val();
              this.actor.update({'system.crucial_boxes': crucial_boxes});

             },
            icon: `<i class="fas fa-save"></i>`
          }
        }
    }).render(true);
    });

    //Custom edit
    html.on('click', '.custom-edit', (ev) => {
      const dataset = ev.target.dataset;
      const path = dataset.path;
      let new_value = '';
      if(dataset.dtype === 'Boolean') {
        if(dataset.value==='false') {
          new_value = true;
        } else {
          new_value = false;
        }
      }
      if(dataset.object === 'actor') {
        this.actor.update({[path]: new_value});
      } else if(dataset.object === 'item') {
        const item = this.actor.items.get(dataset.id);
        item.update({[path]: new_value});
      }
      
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));
    html.on('click', '.message-item', this._onShow.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  }

  async _onDropItem(event) {
    event.preventDefault();
    const dataTransfer = JSON.parse(event.dataTransfer.getData('text/plain'));
    
    // Parse the dataTransfer to get item details
    if (dataTransfer.type === 'Item') {
      const item = await fromUuid(dataTransfer.uuid);

      if (["profession"].includes(item.type)) {
        addProfession(this.actor, item);
      } else if(item.type == 'folk') {
        const contract_name = item.system.contract;
        let contract_item = game.items.filter(el => el.type=='contract' && el.name.toLowerCase() == contract_name.toLowerCase());
        this.actor.update({'system.folk': item.name});
        if(contract_item.length == 0 && HOUSEHOLD.premium) {
          const packs = game.packs.get(HOUSEHOLD.premium_name+'.character');
          const contents = await packs.getDocuments();
          contract_item = contents.filter(el => el.type=='contract' && el.name.toLowerCase() == contract_name.toLowerCase());
        }
        if(contract_item.length > 0) {
          let newItemData = {
            name: contract_item[0].name,
            type: contract_item[0].type,
            img: contract_item[0].img,
            system: duplicate(contract_item[0].system)
          };
          await this.actor.createEmbeddedDocuments("Item", [newItemData]);

        }

      }else {
        let newItemData = {
          name: item.name,
          type: item.type,
          img: item.img,
          system: duplicate(item.system)
        };

        await this.actor.createEmbeddedDocuments("Item", [newItemData]);
      }
    }
      // You can now decide whether to add this item to the actor, modify it, or reject it

  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    if (dataset.type === 'action') {
      let roll = new Roll("1d6", this.actor.getRollData());
      await roll.evaluate();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: await this.actor.showAction(roll.terms[0].results[0].result),
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return;
      
    }
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  async _onShow(event) {
    event.preventDefault();
    const context = this.getData();
    const element = event.currentTarget;
    const dataset = element.dataset;
    
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: ''
    }).then(async msg => {
      const templateData = {
        ability: dataset.label,
        skill: context.system.skills[dataset.key],
        fields: context.system.fields,
        key: dataset.key,
        field: dataset.field,
        actor: this.actor,
        timestamp: msg.timestamp
      };
      const html = await renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
      msg.update( { flavor: html } );
    });
  }
}

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
class HouseholdItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['household', 'sheet', 'item'],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'description',
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = 'systems/household/templates/item';
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.data;
    // Retrieve the roll data for TinyMCE editors.
    context.rollData = this.item.getRollData();

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    if(itemData.type == 'weapon') {
      context.system.field = context.system.field.toLowerCase();
      context.system.skill = context.system.skill.toLowerCase();
      context.fields = ['society', 'academia', 'war', 'street'];

    }
    // change icon based on the type
    if (itemData.img.includes('item-bag') ) {
      if(itemData.type == "contract") {
        this.item.update({'img': 'icons/sundries/documents/document-sealed-red-yellow.webp'});
      } else if (itemData.type == "folk") {
        this.item.update({'img': 'icons/environment/people/group.webp'});
      } else if (itemData.type == "gadget") {
        this.item.update({'img': 'icons/tools/instruments/chimes-wood-white.webp'});
      } else if (itemData.type == "weapon") {
        this.item.update({'img': 'icons/skills/melee/hand-grip-staff-teal.webp'});
      } else if (itemData.type == "move") {
        this.item.update({'img': 'icons/skills/movement/figure-running-gray.webp'});
      } else if (itemData.type == "trait") {
        this.item.update({'img': 'icons/skills/trades/academics-investigation-puzzles.webp'});
      } else if (itemData.type == "profession") {
        this.item.update({'img': 'icons/sundries/scrolls/scroll-bound-ruby-red.webp'});
      } else if (itemData.type == "vocation") {
        this.item.update({'img': 'icons/sundries/scrolls/scroll-worn-rolled-beige.webp'});
      } else if (itemData.type == "companion") {
        this.item.update({'img': 'icons/creatures/magical/construct-face-stone-pink.webp'});
      }
    }
    context.flags = itemData.flags;
    
    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(this.item.effects);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.on('click', '.custom-edit', (ev) => {
      const element = ev.target;
      const dataset = element.dataset;
      const path = dataset.path;
      let new_value = "";
      if(dataset.dtype === "Boolean") {
        if (dataset.value === 'false') {
          new_value = true;
        } else {
          new_value = false;
        }
      } else if (dataset.dtype === 'String') {
        new_value = dataset.value;
      }
      this.item.update({[path]: new_value});
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) =>
      onManageActiveEffect(ev, this.item)
    );
  }
}

/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/household/templates/actor/parts/actor-features.hbs',
    'systems/household/templates/actor/parts/actor-others.hbs',
    'systems/household/templates/actor/parts/actor-list-items.hbs',
    // Item partials
    // Chat parts
    'systems/household/templates/chat/parts/dices/faces.html',
    // NPC parts
    "systems/household/templates/actor/parts/npc-main.hbs"
  ]);
};

// Import document classes.

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.household = {
    HouseholdActor,
    HouseholdItem,
    rollItemMacro,
  };

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
  if(field === 'society' || field === 'hearts') return 'heart';
  if(field === 'academia' || field === 'diamonds') return 'diamond';
  if(field === 'war' || field === 'clubs') return 'club';
  if(field === 'street' || field === 'spades') return 'spade';
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
  if(field === 'society' || field === 'hearts') return 'red';
  if(field === 'academia' || field === 'diamonds') return 'blue';
  if(field === 'war' || field === 'clubs') return 'green';
  if(field === 'street' || field === 'spades') return 'black';
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
  };
  
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
  };
  
  let result = operators[operator](operand_1,operand_2);
  if(result) return options.fn(this); 
  return options.inverse(this);       
});

Handlebars.registerHelper('numLoop', function (num, options) {
  let ret = '';

  for (let i = 1, j = num; i <= j; i++) {
    ret = ret + options.fn(i);
  }

  return ret
});

Handlebars.registerHelper('hasSuccess', function (obj, options) {
  let initialValue = 0;
    Object.entries(obj).reduce(
      (accumulator, [key,currentValue]) => { obj[key].locked ? initialValue +=1 : 0; },
      {},
    );
  if(initialValue)
    return options.fn(this);
  return options.inverse(this);
});

Handlebars.registerHelper('hasNoSuccess', function (obj, options) {
  let initialValue = 0;
    Object.entries(obj).reduce(
      (accumulator, [key,currentValue]) => { !obj[key].locked ? initialValue +=1 : 0; },
      {},
    );
    if(initialValue)
      return options.fn(this);
    return options.inverse(this);
});

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
    /*if (event.target.id == 'move' || event.target.id == 'trait') {
      //alert(event.target.value)
      item = await fromUuid(event.target.value)
    } else {
      alert(event.target.value)
      item = game.items.filter(el => el.name == event.target.value && el.type == event.target.id)
      if (item.length > 0) {
        item = item[0]
      }
    }*/
    if (Object.keys(item).length > 0) {
      description.innerHTML = "";
      description.textContent = "";
      description.innerHTML = item.system.description;
    }

  });
});
/*
Other Hooks */
Hooks.on('renderChatMessage', (message, html, data) => {
  (HOUSEHOLD.premium);
  const parser = new DOMParser();
  message.speaker.actor;
  message.speaker.token;
   

  // convert html string into DOM
  const documentRoll = parser.parseFromString(message.flavor, "text/html");

  html.find('.field-option').click(event => {
    event.preventDefault();
    event.target.dataset;
    const collection = documentRoll.getElementsByClassName('field-option');
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
    const collection = documentRoll.getElementsByClassName('difficulty-option');
    for (let i = 0; i < collection.length; i++) {
      if(collection[i].id == event.target.id) {
        collection[i].placeholder = event.target.value;
        collection[i].value = '';
        if(event.target.value > 0 ) {
          collection[i].classList.add('option-selected');
          collection[i].classList.remove('option-empty');
        } else {
          collection[i].classList.remove('option-selected');
          collection[i].classList.add('option-empty');

        }
      }
    }
    const serializer = new XMLSerializer();
    const serializedString = serializer.serializeToString(documentRoll);
    message.update({ flavor: serializedString });
  });

  html.find('.modifier-option').click(event => {
    event.preventDefault();
    event.target.dataset;
    const collection = documentRoll.getElementsByClassName('modifier-option');
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
    const modifier_collection = documentRoll.getElementsByClassName('modifier-option');    
    for (let i = 0; i < modifier_collection.length; i++) {
      if(modifier_collection[i].checked) {
        mod = modifier_collection[i].getAttribute('value');
      }
    }
  
    let field = '';
    const field_collection = documentRoll.getElementsByClassName('field-option');
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
    };
    const difficulty_collection = documentRoll.getElementsByClassName('difficulty-option');
    for (let i = 0; i < difficulty_collection.length; i++) {
      const key = String(difficulty_collection[i].getAttribute('data-key'));
      difficulty[key] = difficulty_collection[i].getAttribute('placeholder');
    }

    const dataset = element.dataset;
    const actor = game.actors.get(message.speaker.actor);
    const skill = dataset.key;
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
      const actor = game.actors.get(message.speaker.actor);
      const poll_difficulty = JSON.parse(dataset.poll_difficulty);
      const current_poll = JSON.parse(dataset.currentpoll);
      const current_success = JSON.parse(dataset.current_success);
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
    actor.onSkillRoll(dataset.field, dataset.skill, dataset.mod, poll_difficulty, keep_poll, normal_reroll, free_reroll, all_in, current_success);
  });

  html.find('.give_up').click(async event => {
    event.preventDefault();
    const dataset = event.target.dataset;
    const face_gave_up = dataset.face;
    const current_poll = JSON.parse(dataset.currentpoll);
    let clone_current_poll = { ...current_poll };
    clone_current_poll[face_gave_up] = 0;
    const actor = game.actors.get(message.speaker.actor);
    const  poll_difficulty = JSON.parse(dataset.poll_difficulty);
    const evaluation = actor.evaluatePoll(clone_current_poll, poll_difficulty);

    const dices = actor.prepareDicesToChat(current_poll, Number(face_gave_up));
    const successes = actor.prepareSuccessToChat(evaluation.poll_successes);
    const templateData = {
      ability: "Art",
      skill: 'art',
      field: 'society',
      mod: 1,
      actor: actor,      
      dices: dices,
      currentpoll: JSON.stringify(current_poll),
      dices_string: JSON.stringify(dices),
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
  if (message.author.id !== game.user.id && !game.user.isGM) {
    // Disable or hide input fields
    html.find("input, select, textarea, label").prop("disabled", true);
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
