
/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class HouseholdActor extends Actor {
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
    const systemData = actorData.system;
    const flags = actorData.flags.household || {};

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
    const systemData = actorData.system;
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

  // async skillRoll(dataset) {
  //   const skill = this.system.skills[dataset.key];
  //   skill.label = game.i18n.localize(CONFIG.HOUSEHOLD.skills[dataset.key])
  //   const templateData = {
  //     ability: dataset.label,
  //     skill: skill,
  //     fields: this.system.fields,
  //     key: dataset.key,
  //     field: dataset.field,
  //     actor: this,
  //     //timestamp: msg.timestamp
  //   };
  //   const html = await renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
  //   const dialogData = {
  //     title: "Skill and Field Selection",
  //     content: html,
  //     buttons: {
  //       roll: {
  //         label: "Roll",
  //         callback: (html) => {
  //           const skill = html.find('input[name="selected-skill"]:checked').val();
  //           const field = html.find('input[name="selected-field"]:checked').val();

  //           if (!skill || !field) {
  //             ui.notifications.warn("Please select both a skill and a field before rolling!");
  //             return;
  //           }


  //           ui.notifications.info(`Rolling ${skill} with field ${field}`);
  //         },
  //       },
  //       cancel: {
  //         label: "Cancel",
  //       },
  //     },
  //     default: "roll",
  //   };

  //   const formOptions = {
  //     id: "skill-field-dialog",
  //     classes: ["dialog", "dialog-v2"],
  //     render: (html) => {
  //       console.log("Dialog V2 rendered!");
  //     },
  //   };

  //   new Dialog(dialogData, formOptions).render(true);

  // }

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
      formula += " + 1d6"
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
    }
    const templateData = {
      label: "Action " + roman[action],
      description: this.system.actions[`action_${action}`]
    }
    return await renderTemplate("systems/household/templates/chat/action-show-card.hbs", templateData);

  }

  async _skillRoll(field, skill, mod = 0) {
    const field_dice = this.system.fields[field].value;
    const skill_dice = this.system.skills[skill].value;
    let dice_poll = (Number(field_dice) + Number(skill_dice) + Number(mod));
    const formula = this._getFormula(dice_poll);

    let roll = new Roll(formula)
    await roll.evaluate()
    return {
      poll: Array.from(Object.values(roll.terms).filter(item => item instanceof foundry.dice.terms.Die)),
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
        })
      }
    }
    return succ_to_chat;
  }

  preparediceToChat(dice_poll, cancel_face = 0) {
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
  async _sendToChat(roll, field, skill, mod, poll_difficulty, dice_poll, success_poll, outcome, is_reroll, is_allin, is_jackpot, allow_reroll, allow_allin, give_up, message_id = 0) {
    //face=dice.face locked=dice.locked success=dice.success

    const dice = this.preparediceToChat(dice_poll);
    const successes = this.prepareSuccessToChat(success_poll);

    if (is_allin) {
      allow_allin = 0;
      allow_reroll = 0;
    }

    // if there is no remaining dice, no buttons


    let initialValue = 0;
    Object.entries(dice).reduce(
      (accumulator, [key, currentValue]) => { !dice[key].locked ? initialValue += 1 : 0 },
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
      dice: dice,
      currentpoll: JSON.stringify(dice_poll),
      dice_string: JSON.stringify(dice),
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
    if (message_id) {
      await game.dice3d.showForRoll(roll, game.user, true);
      //roll.render();
      const chatMessage = game.messages.get(message_id);
      const updatedHtml = html.replace(/data-message-id="MESSAGEID"/g, `data-message-id="${message_id}"`);
      await chatMessage.update({
        flavor: updatedHtml
      });
    } else {
      let message = await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: html,
        rollMode: game.settings.get('core', 'rollMode'),
        flags: {
          customCss: true // Add your CSS class here
        }
      })
      // const messageId = message.id;
      // const updatedHtml = html.replace(/data-message-id="MESSAGEID"/g, `data-message-id="${messageId}"`);

      // // Update the chat message with the new HTML
      // await message.update({
      //   flavor: updatedHtml
      // });
    }
  }

  _normilize(array) {
    let factor = 1;
    let total = 0;
    for (let [key, value] of Object.entries(array)) {
      total += (Number(value) * factor)
      factor = factor * 3
    }
    return total;
  }

  /**
   * PUBLIC METHODS
   */

  _get_poll(field, skill, mod) {
    const field_dice = this.system.fields[field].value;
    const skill_dice = this.system.skills[skill].value;
    let dice_poll = (Number(field_dice) + Number(skill_dice) + Number(mod));
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
    let roll = new Roll(formula)
    await roll.evaluate()
    return {
      poll: Array.from(Object.values(roll.terms).filter(item => item instanceof foundry.dice.terms.Die)),
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
    }
    let outcome = 'Failure';
    for (let i = 1; i < 7; i++) {
      const index = String(i);
      if (transformed_poll_result[index] > 1) {
        const idx = String(transformed_poll_result[index])
        poll_successes[idx] += 1;
      }
    }
    let is_jackpot = false;
    const normalized_success = this._normilize(poll_successes)
    if (poll_successes['6'] > 0 && normalized_success >= normilized_jackpot) {
      outcome = 'Jackpot';
      is_jackpot = true;
    } else if (normalized_difficult <= normalized_success) {
      outcome = 'Success'
    }
    if (normalized_difficult == 0) outcome = '';
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
  }, keep_poll = false, is_reroll = false, is_free_reroll = false, is_allin = false, original_poll_success = {}, message_id = 0) {
    console.warn(' poll_difficulty',poll_difficulty)
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
    }
    let original_success = {}
    let original_poll_difficulty = {}

    let outcome = 'Failure';
    let skill_roll = {};
    let roll = {};
    let original_poll_result = [];
    if (is_reroll || is_free_reroll || is_allin) {
      allow_reroll = false;
      skill_roll = await this.onReroll(field, skill, mod, keep_poll)
      original_poll_result = skill_roll.poll;
      roll = skill_roll.roll;

      original_poll_result.forEach(die => {
        const results = die.results
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
      skill_roll = await this._skillRoll(field, skill, mod)
      original_poll_result = skill_roll.poll;
      roll = skill_roll.roll;

      original_poll_result.forEach(die => {
        const results = die.results
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
        const idx = String(transformed_poll_result[index])
        poll_successes[idx] += 1;
      }
    }
    let is_jackpot = false;
    const normalized_success = this._normilize(poll_successes)
    if (normalized_success === 0) {
      allow_reroll = false;
    }
    console.warn('normalized_success', normalized_success)
    console.warn('normalized_difficult', normalized_difficult)
    console.warn(' normilized_jackpot', normilized_jackpot)
    if (poll_successes['6'] > 0 && normalized_success >= normilized_jackpot) {
      outcome = 'Jackpot';
      is_jackpot = true;
    } else if (normalized_difficult <= normalized_success) {
      outcome = 'Success'
    }
    let give_up = false;
    if (normalized_success <= normalized_original_success && (is_reroll || is_allin)) {
      if (is_allin) {
        give_up = false;
        allow_allin = true;
        outcome = 'Failure';
        Object.keys(poll_successes).forEach((item) => {
          poll_successes[item] = 0
        })
      } else {
        give_up = true;
        allow_allin = false;
      }
    }
    if (normalized_difficult == 0) outcome = ''

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
      give_up,
      message_id
    );

    return;
  }

  async dialogRollSkill(dataset) {
    let guess;
    const actor = this; //getActor(this.dataset.characterId);
    const skill = actor.system.skills[dataset.key];
    skill.label = game.i18n.localize(CONFIG.HOUSEHOLD.skills[dataset.key])
    const templateData = {
      ability: dataset.label,
      skill: skill,
      skill_key: dataset.key,
      fields: actor.system.fields,
      key: dataset.key,
      field: dataset.field,
      actor: actor,
      //timestamp: msg.timestamp
    };
    const html = await renderTemplate("systems/household/templates/chat/dialog-skill-roll.hbs", templateData);
  
    const dialog = await foundry.applications.api.DialogV2.wait({
      window: { title: "Roll" },
      content: html,
      classes: ['household', 'dialog-skill-roll'],
      modal: true,
      buttons: [{
        action: "choice",
        label: "HOUSEHOLD.RollAbility.long",
        default: true,
        callback: (event, button, dialog) => {
          const data = {
            field: button.form.elements.field.value,
            skill: button.form.elements.skill.value,
            modifier: button.form.elements.modifier.value,
            diff: {
              '2': button.form.elements.basic.value,
              '3': button.form.elements.critical.value,
              '4': button.form.elements.extreme.value,
              '5': button.form.elements.impossible.value
            }
          }
          console.log(data)
          actor.onSkillRoll(
            button.form.elements.field.value,
            button.form.elements.skill.value,
            button.form.elements.modifier.value, {
            '2': button.form.elements.basic.value.replace("x", ""),
            '3': button.form.elements.critical.value.replace("x", ""),
            '4': button.form.elements.extreme.value.replace("x", ""),
            '5': button.form.elements.impossible.value.replace("x", "")
          })
        }
      }],
      position: {
        width: "420",
      },
      render: (event) => {
        // Add event listeners for collapsible headers   
        const $html = $(event.target.element);
        //console.log($html)
        $html.find(".collapsible-header").on("click", (event) => {
          const header = event.currentTarget;
          const content = header.nextElementSibling;
  
          if (content.style.display === "block") {
            content.style.display = "none";
          } else {
            content.style.display = "block";
          }
        });
  
        $html.find('.difficulty-item').on('mousedown', function (event) {
          console.log("event")
          // Prevent the default context menu on right-click
          if (event.button === 2) event.preventDefault();
          
          // Find the input inside the clicked difficulty-item
          const input = $(this).find('.difficulty-option');
          
          // Get the current input value
          let currentValue = parseInt(input.val().replace('x', '')) || 0;
      
          // Increase or decrease based on the mouse button
          if (event.button === 0) {
              // Left-click: Increase value
              currentValue++;
          } else if (event.button === 2) {
              // Right-click: Decrease value, but ensure it doesn't go below 0
              currentValue = Math.max(0, currentValue - 1);
          }
      
          // Update the input value
          input.val(`x${currentValue}`);
        });
  
        $html.find('.modifier-item').on('mousedown', function (event) {
          console.log("event")
          // Prevent the default context menu on right-click
          if (event.button === 2) event.preventDefault();
          
          // Find the input inside the clicked difficulty-item
          const input = $(this).find('.difficulty-option');
          
          // Get the current input value
          let currentValue = parseInt(input.val());
      
          // Increase or decrease based on the mouse button
          if (event.button === 0) {
              // Left-click: Increase value not more than +3
              //currentValue++;
              currentValue = Math.min(3, Math.max(0, currentValue + 1));
          } else if (event.button === 2) {
              // Right-click: Decrease value, but ensure it doesn't go below -3
              currentValue = Math.max(-3, currentValue - 1);
          }
      
          // Update the input value
          input.val(currentValue);
        });
        
        // Optional: Prevent default context menu entirely (for all right-clicks on the inputs)
        $html.find('.difficulty-item').on('contextmenu', function (event) {
            event.preventDefault();
        });
  
        $html.find(".toggle-input").on("change", (event) => {
          const selectedInputId = event.target.id; // Get the ID of the selected input
  
          // Iterate through all toggle inputs
          $html.find(".toggle-input").each((index, input) => {
              const label = $html.find(`label[for="${input.id}"]`); // Find the associated label
              if (label.length > 0) {
                  const img = label.find("img"); // Find the <img> inside the label
                
                  if (img.length > 0) {
                    const currentSrc = img.attr("src");
                    console.log(currentSrc);
                      // Update the image based on whether this input is checked
                      if (input.id === selectedInputId) {
                          if(!currentSrc.includes('-filled'))
                            img.attr("src", currentSrc.replace('.svg', '-filled.svg')); // Set checked image for selected input
                      } else {
                          img.attr("src", currentSrc.replace('-filled','')); // Reset image for other inputs
                      }
                  }
              }
          });
  
        })
      },
    });
  
  
    //dialog.addEventListener('click', (event) => { console.log(event) } )
  
  }
}

