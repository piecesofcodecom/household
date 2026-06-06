import * as HouseholdRoll from "./roll.mjs";
import { capitalizeFirstLetter } from "../helpers/utils.mjs";

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

/**
 * Render the interactive skill-roll card for a roll. With a `message_id` it
 * updates that existing message (a re-roll); otherwise it posts a fresh roll
 * message. Formerly HouseholdActor._sendToChat; actor.onSkillRoll delegates here.
 * @param {HouseholdActor} actor
 */
export async function renderSkillRollCard(actor, roll, field, skill, mod, poll_difficulty, dice_poll, success_poll, outcome, is_reroll, is_allin, is_jackpot, allow_reroll, allow_free_reroll, allow_allin, give_up, message_id = 0) {
  //face=dice.face locked=dice.locked success=dice.success
  const dice = preparediceToChat(dice_poll);
  const successes = HouseholdRoll.successesToChat(success_poll);

  if (is_allin) {
    allow_allin = 0;
    allow_reroll = 0;
    allow_free_reroll = 0;
  }

  // if there are no unlocked dice left, nothing can be re-rolled
  if (!HouseholdRoll.hasRerollableDice(dice)) {
    allow_allin = allow_reroll = allow_free_reroll = 0;
  }

  const free_roll_items = actor.items.filter(el => el.system.free_reroll == true);

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
    actor: actor,
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
      speaker: ChatMessage.getSpeaker({ actor }),
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
  }
}

/**
 * Wire the interactive skill-roll card (the `customCss` flavor): field /
 * difficulty / modifier pickers, the roll button, re-roll buttons and the
 * give-up dice. Only the actor's owner (or a GM) may act on it.
 * @param {ChatMessage} message
 * @param {HTMLElement} html
 */
export function wireSkillRollCard(message, html) {
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
        const keep_poll = HouseholdRoll.keepSuccessfulFaces(current_poll);
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
    content: "",
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
export async function handleRenderChatMessage(message, html) {
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
}
