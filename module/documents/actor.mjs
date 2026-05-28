
/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import { capitalizeFirstLetter } from "../helpers/utils.mjs";
import * as HHRoll from "../helpers/roll.mjs";

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
   * Prepare Opponent type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'opponent') return;

    // Opponent-specific derived data goes here.
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
    if (this.type !== "opponent") return;

    // Process additional opponent roll data here.
  }

  _getFormula(dice_poll, reroll = false) {
    return HHRoll.buildRollFormula(dice_poll, { reroll });
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
      description: this.system.actions[`action_${action}`],
      threat: this.system.threat.level
    }
    return await foundry.applications.handlebars.renderTemplate("systems/household/templates/chat/action-show-card.hbs", templateData);

  }

  async _skillRoll(field, skill, mod = 0) {
    const dice_poll = HHRoll.dicePoolSize(this.system.fields[field].value, this.system.skills[skill].value, mod);
    const roll = new Roll(HHRoll.buildRollFormula(dice_poll));
    await roll.evaluate();
    return { poll: roll.dice, roll };
  }

  prepareSuccessToChat(success_poll) {
    return HHRoll.successesToChat(success_poll);
  }

  preparediceToChat(dice_poll, cancel_face = 0) {
    return HHRoll.diceToChat(dice_poll, cancel_face);
  }
  async _sendToChat(roll, field, skill, mod, poll_difficulty, dice_poll, success_poll, outcome, is_reroll, is_allin, is_jackpot, allow_reroll, allow_free_reroll, allow_allin, give_up, message_id = 0) {
    //face=dice.face locked=dice.locked success=dice.success
    const dice = this.preparediceToChat(dice_poll);
    const successes = this.prepareSuccessToChat(success_poll);

    if (is_allin) {
      allow_allin = 0;
      allow_reroll = 0;
      allow_free_reroll = 0;
    }

    // if there are no unlocked dice left, nothing can be re-rolled
    if (!HHRoll.hasRerollableDice(dice)) {
      allow_allin = allow_reroll = allow_free_reroll = 0;
    }

    const free_roll_items = this.items.filter(el => el.system.free_reroll == true);

    let cancel_all = false;
    if (is_allin && (outcome == "Failure")) {
      cancel_all = true;
    }

    if (!mod || isNaN(mod)) {
      mod = 0;
    }

    const templateData = {
      ability: capitalizeFirstLetter(skill),
      skill: skill,
      field: capitalizeFirstLetter(field),
      modifierroll: mod,
      actor: this,
      dice: dice,
      currentpoll: JSON.stringify(dice_poll),
      dice_string: JSON.stringify(dice),
      poll_difficulty: JSON.stringify(poll_difficulty),
      poll_success: JSON.stringify(success_poll),
      successes: successes,
      reroll: allow_reroll ? 1 : 0,
      free_reroll: allow_free_reroll ? 1 : 0,
      allin: allow_allin ? 1 : 0,
      reroll_message: is_reroll ? "Reroll" : "Rolling",
      give_up: give_up ? "give_up" : "",
      give_up_face: 0,
      outcome: give_up ? "LostSuccess" : outcome,
      message_id: message_id || "MESSAGEID",
      free_roll_items: free_roll_items,
      cancel_all: cancel_all,
      is_jackpot: is_jackpot
    };
    const html = await foundry.applications.handlebars.renderTemplate("systems/household/templates/chat/skill-roll-card.hbs", templateData);
    if (message_id) {
      await game.dice3d.showForRoll(roll, game.user, true);
      //roll.render();
      const chatMessage = game.messages.get(message_id);


      await chatMessage.update({
        flavor: html
      });
    } else {
      let message = await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this }),
        flavor: html,
        rollMode: game.settings.get('core', 'rollMode'),
        flags: {
          household: {
            customCss: true
          }
        }
      })
      const updatedHtml = html.replace(/data-message-id="MESSAGEID"/g, `data-message-id="${message_id}"`);
      await message.update({
        flavor: updatedHtml
      });
      // const messageId = message.id;
      // const updatedHtml = html.replace(/data-message-id="MESSAGEID"/g, `data-message-id="${messageId}"`);

      // // Update the chat message with the new HTML
      // await message.update({
      //   flavor: updatedHtml
      // });
    }
  }

  _normilize(array) {
    return HHRoll.normalizePoll(array);
  }

  /**
   * PUBLIC METHODS
   */

  _get_poll(field, skill, mod) {
    return HHRoll.dicePoolSize(this.system.fields[field].value, this.system.skills[skill].value, mod);
  }

  async onReroll(field, skill, mod, keep_poll) {
    const original_poll = this._get_poll(field.toLowerCase(), skill.toLowerCase(), mod);
    const remove_from_poll = Object.values(keep_poll).reduce((sum, n) => sum + Number(n), 0);
    const for_this_poll = Number(original_poll) - remove_from_poll;
    const roll = new Roll(HHRoll.buildRollFormula(for_this_poll, { reroll: true }));
    await roll.evaluate();
    return { poll: roll.dice, roll };
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
    const { pollSuccesses, outcome, isJackpot } = HHRoll.evaluateRoll(transformed_poll_result, poll_difficulty);
    return {
      poll_difficulty,
      transformed_poll_result,
      poll_successes: pollSuccesses,
      outcome,
      is_jackpot: isJackpot,
    };
  }

  async onSkillRoll(field, skill, mod, poll_difficulty = {
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0
  }, keep_poll = false, is_reroll = false, is_free_reroll = false, is_allin = false, original_poll_success = {}, message_id = 0) {
    mod = Number(mod) || 0;
    const rollType = HHRoll.rollTypeFromFlags({ isReroll: is_reroll, isFreeReroll: is_free_reroll, isAllIn: is_allin });
    const normalized_original_success = HHRoll.normalizePoll(original_poll_success);

    // Roll the dice. A reroll/free-reroll/all-in keeps the locked Successes and
    // rerolls the rest; an initial roll rolls the whole pool.
    let skill_roll;
    let transformed_poll_result;
    if (rollType !== HHRoll.ROLL_TYPES.INITIAL) {
      skill_roll = await this.onReroll(field, skill, mod, keep_poll);
      transformed_poll_result = HHRoll.mergePolls(keep_poll, HHRoll.tallyDiceFaces(skill_roll.poll));
    } else {
      skill_roll = await this._skillRoll(field, skill, mod);
      transformed_poll_result = HHRoll.tallyDiceFaces(skill_roll.poll);
    }
    const roll = skill_roll.roll;

    // Score the result and decide which options it allows.
    const evaluation = HHRoll.evaluateRoll(transformed_poll_result, poll_difficulty, { isAllIn: is_allin });
    const options = HHRoll.decideRollOptions(rollType, evaluation.normalizedSuccess, normalized_original_success);

    let outcome = evaluation.outcome;
    let poll_successes = evaluation.pollSuccesses;
    // An all-in that did not improve is a total failure: wipe the Successes.
    if (options.allInFailure) {
      outcome = 'Failure';
      poll_successes = { '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
    }

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
      evaluation.isJackpot,
      options.allowReroll,
      options.allowFreeReroll,
      options.allowAllIn,
      options.giveUp,
      message_id
    );

    return;
  }

  async dialogRollSkill(dataset) {
    let guess;
    const actor = this; //getActor(this.dataset.characterId);

    const skill = actor.system.skills[dataset.key];
    if (dataset.key && skill) {

      skill.label = game.i18n.localize(CONFIG.HOUSEHOLD.skills[dataset.key])
    }
    const fields = actor.system.fields;
    for (const [k, v] of Object.entries(fields)) {
      v.label = game.i18n.localize(CONFIG.HOUSEHOLD.fields[k]) ?? k;
    }
    const templateData = {
      ability: dataset.label,
      skill: skill,
      skill_key: dataset.key,
      fields: fields,
      key: dataset.key,
      field: dataset.field,
      actor: actor,
      //timestamp: msg.timestamp
    };

    const html = await foundry.applications.handlebars.renderTemplate("systems/household/templates/chat/dialog-skill-roll.hbs", templateData);

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
          const modifier_value = button.form.elements.modifier?.value ? button.form.elements.modifier.value : "0";
          const basic_value = button.form.elements.basic?.value ? button.form.elements.basic.value : "0";
          const critical_value = button.form.elements.critical?.value ? button.form.elements.critical.value : "0";
          const extreme_value = button.form.elements.extreme?.value ? button.form.elements.extreme.value : "0";
          const impossible_value = button.form.elements.impossible?.value ? button.form.elements.impossible.value : "0";
          const data = {
            field: button.form.elements.field.value,
            skill: button.form.elements.skill.value,
            modifier: modifier_value,
            diff: {
              '2': basic_value,
              '3': critical_value,
              '4': extreme_value,
              '5': impossible_value
            }
          }
          actor.onSkillRoll(
            button.form.elements.field.value,
            button.form.elements.skill.value,
            modifier_value, {
            '2': basic_value.replace("x", ""),
            '3': critical_value.replace("x", ""),
            '4': extreme_value.replace("x", ""),
            '5': impossible_value.replace("x", "")
          })
        }
      }],
      position: {
        width: "420",
      },
      render: (event) => {
        // Add event listeners for collapsible headers   
        const $html = $(event.target.element);
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

        $html.find(".skill-select-dropdown").on("change", (event) => {

          const selectedSkill = event.currentTarget.value; // Get the selected skill key
          const input_skill = $html.find('#skill'); // Find the hidden input for skill
          const icon_img = $html.find('.suit-icon'); // Find the icon image element
          if (input_skill.length > 0) {

            input_skill.val(selectedSkill); // Update the hidden input value
            const skill_data = actor.system.skills[selectedSkill];
            if (skill_data) {
              const suit = skill_data.suit;
              const value = skill_data.value;

              $html.find('.value-display span').text(`x${value}`); // Update the skill value display

              icon_img.attr("class", `suit-icon fa-household-${suit}-full`);
            }
          }

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
                // Update the image based on whether this input is checked
                if (input.id === selectedInputId) {
                  if (!currentSrc.includes('-filled'))
                    img.attr("src", currentSrc.replace('.png', '-filled.png')); // Set checked image for selected input
                } else {
                  img.attr("src", currentSrc.replace('-filled', '')); // Reset image for other inputs
                }
              }
            }
          });

        })
      },
    });
  }

  toggleCondition(path) {
    const condition_value = path.split('.').reduce((acc, part) => acc && acc[part], this);
    const condition_name = path.split('.').pop();
    const actor = this;
    let messageContent = game.i18n.localize('HOUSEHOLD.ConditionToggleMessage');
    messageContent = messageContent.replace("{condition}", game.i18n.localize('HOUSEHOLD.Conditions.' + condition_name.charAt(0).toUpperCase() + condition_name.slice(1)));
    messageContent = messageContent.replace("{status}", !Boolean(condition_value) ? game.i18n.localize('HOUSEHOLD.Conditions.On') : game.i18n.localize('HOUSEHOLD.Conditions.Off'))
    ChatMessage.create({
      user: game.user.id, // The ID of the current user sending the message
      flavor: messageContent, // The message content
      speaker: ChatMessage.getSpeaker({ actor }) // Automatically sets the speaker as the current user or token
    });
    this.update({ [path]: !Boolean(condition_value) })
  }
}




