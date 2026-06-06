
/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import * as HHRoll from "../dice/roll.mjs";
import { renderSkillRollCard } from "../dice/roll-card.mjs";
import { openSkillRollDialog } from "../dice/skill-roll-dialog.mjs";

export class HouseholdActor extends Actor {
  /**
   * Hide the deprecated `npc` type from the "Create Actor" dialog. It stays a
   * registered type (mapped to the Opponent model) so legacy npc actors keep
   * loading and get migrated to `opponent` in the ready hook — it just should
   * not be offered as a choice for new actors.
   * @override
   */
  static async createDialog(data = {}, createOptions = {}, options = {}) {
    options.types ??= this.TYPES.filter((type) => type !== "npc");
    return super.createDialog(data, createOptions, options);
  }

  /** @override */
  // prepareData() {
  //   // Prepare data for the actor. Calling the super version of this executes
  //   // the following, in order: data reset (to clear active effects),
  //   // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
  //   // prepareDerivedData().
  //   super.prepareData();
  // }

  /** @override */
  prepareBaseData() {
    // v14: the base Actor#prepareBaseData runs _clearData(), which resets the
    // per-cycle ActiveEffect phase tracker (_completedActiveEffectPhases). Skipping
    // super here makes applyActiveEffects("initial") throw "phase already completed"
    // on every re-prepare after the first. Always call super.
    super.prepareBaseData();
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
    super.prepareDerivedData();
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

    renderSkillRollCard(
      this,
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
    return openSkillRollDialog(this, dataset);
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




