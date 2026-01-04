
import { HOUSEHOLD } from './config.mjs'
const { DialogV2 } = foundry.applications.api;

async function getActor(characterId) {

  let actor = {}
  if (game.user.isGM) {
    const token = await canvas.tokens.get(characterId);

    if (token) {
      actor = token.actor;
    } else {

      actor = await game.actors.get(characterId);

    }
  } else {
    actor = await game.actors.find(actor => actor.isOwner);
  }
  return actor;
}
export async function openSheet() {
  const actor = await getActor(this.dataset.characterId);

  if (actor) {
    actor.sheet.render(true);
  }
}

export async function itemChat(e) {
  const target = e.currentTarget;

  let forward_event = {};
  forward_event.currentTarget = target;
  if (target.dataset?.subAction) {
    const sub_action = target.dataset.subAction;
    const parent = target.closest('.item-list')?.dataset;

    if (parent) {
      forward_event.currentTarget.dataset.action = sub_action;
      forward_event.currentTarget.dataset.itemId = parent.itemId;
      forward_event.currentTarget.dataset.characterId = parent.characterId;
      forward_event.currentTarget.dataset.object = parent.object;
    }

  }

  useItem(forward_event);
}

export async function dialogRollSkill(e) {
  let guess;
  const actor = await getActor(this.dataset.characterId);

  actor.dialogRollSkill(this.dataset);
}

export async function rollAction(e) {
  if (e.currentTarget?.dataset?.type == 'attack') {
    const dataset = e.currentTarget.closest('.item-list')?.dataset;
    const actor = await getActor(dataset.characterId);
    const item = actor.items.get(dataset.itemId);
    if (item) {
      dataset.label = item.system.field;
      dataset.field = item.system.field;
      dataset.key = item.system.skill;
      dataset.itemId = item.id;
      dataset.characterId = actor.id;
      actor.dialogRollSkill(dataset);
    }
  } else {
    let dataset = this?.dataset;

    if (dataset == null) {
      dataset = e.currentTarget.dataset;
    }
    const actor = await getActor(dataset.characterId);
    if (!actor) return;
    let roll = new Roll("1d6", actor.getRollData());
    await roll.evaluate();
    const result = roll.terms[0].results[0].result;
    const flavor = await actor.showAction(roll.terms[0].results[0].result);
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: flavor,
      flags: {
        household: {
          noChanges: true,
          customCss: true
        }
      },
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }
  return;
}

export async function selectToken() {
  const actor = await getActor(this.dataset.characterId);
  if (!actor) return;

  const tokens = actor.getActiveTokens();
  if (tokens.length > 0) {
    tokens[0].control();
  }
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export async function InputeditValue(e) {
  const actor = await getActor(this.dataset.characterId);
  if (this.value.trim() == '') return;
  if (this.dataset.dtype == "Number") {
    actor.update({ [this.dataset.path]: Number(this.value.trim()) })
  } else {
    actor.update({ [this.dataset.path]: this.value })
  }
}

export async function editValue(e) {
  e.stopPropagation();
  const actor = await getActor(this.dataset.characterId);
  if (this.dataset.path.includes('conditions')) {
    actor.toggleCondition(this.dataset.path);
  } else if (this.dataset.dtype == "Number") {
    actor.update({ [this.dataset.path]: Number(this.dataset.value) })
  } else if (this.dataset.dtype == "Boolean") {
    const current_value = getNestedValue(actor, this.dataset.path);
    actor.update({ [this.dataset.path]: !Boolean(current_value) })
  } else {
    actor.update({ [this.dataset.path]: this.dataset.value })
  }
}

export async function useAce(e) {
  const actor = await getActor(this.dataset.characterId);
  const current_value = getNestedValue(actor, this.dataset.path);
  actor.update({ [this.dataset.path]: !current_value })
}


export async function useItem(e) {
  if (typeof e?.stopPropagation === "function") {
    e.stopPropagation();
  }
  let thisitem = this;

  if (thisitem?.dataset == null) {
    thisitem = e.currentTarget;
  }
  let send_chat_message = true;
  const actor = await getActor(thisitem.dataset.characterId);
  const item = await actor.items.get(thisitem.dataset.itemId);
  let action, description;
  if (item.type == "move" && thisitem.dataset?.action == "use") {
    description = item.system.description;
    if (!item.system.exhausted) {
      action = "Exhaust move";
      const suits = ["club", "diamond", "heart", "spade"];
      let fail = 0;
      let update_suits = [];


      for (let suit of suits) {
        if (item.system.suits[suit]) {

          if (actor.system.aces[suit]) {

            update_suits.push(suit);
          } else {
            fail += 1;
          }
        }
      }

      if (fail == 1) {


        if (actor.system.aces.joker) {
          actor.update({ [`system.aces.joker`]: false });
          fail -= 1;
        }
      }
      if (fail == 0) {
        item.update({ ['system.exhausted']: !item.system.exhausted })
        for (let suit of update_suits) {
          actor.update({ [`system.aces.${suit}`]: false });
        }
      } else {
        ui.notifications.warn(`You don't have enough aces.`);
        send_chat_message = false;
      }
    } else {
      action = "Recover move";
      await item.update({ ['system.exhausted']: !item.system.exhausted })
      Hooks.callAll('household.onUpdateTokenRequest');
    }
  } else if (item.type != "contract") {
    description = item.system.description;
    action = "";
  } else {
    action = "";
    description = `
    <p><strong>${item.system.concession.name}</strong>: ${item.system.concession.details}</p>
    <p><strong>${item.system.counterpart.name}</strong>: ${item.system.counterpart.details}</p>
    `
  }

  if (send_chat_message) {
    const templatePath = "systems/household/templates/chat/item-card.hbs";

    // Data to pass to the template
    const data = {
      name: item.name,
      description: description,
      img: item.img,
      action: action,
      has_action: action.length > 0 ? true : false
    };

    // Render the template
    const renderedHTML = await foundry.applications.handlebars.renderTemplate(templatePath, data);

    // Send the rendered HTML to the chat
    ChatMessage.create({
      content: renderedHTML,
      speaker: { alias: actor.name }
    });
  }


}

// export async function rollAttack(e) {
//   const actor = game.actors.get(this.dataset.characterId);
//   if (!actor) return;

// }


/**
     * Handle Attribute action
     * @private
     * @param {object} event    The event
     * @param {object} actor    The actor
     * @param {string} actionId The action id
     */
async function handleAttributeAction(event, actor, dataset) {
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: ''
  }).then(async msg => {
    const templateData = {
      ability: dataset.label,
      skill: actor.system.skills[dataset.key],
      fields: actor.system.fields,
      key: dataset.key,
      field: dataset.field,
      actor: actor,
      timestamp: msg.timestamp
    };
    const html = await foundry.applications.handlebars.renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
    msg.update({ flavor: html });
  });

  // let rData = [];
  // if (!actor) return;
  // if (!actor.system?.attributes) return;
  // rData = {
  //   roll: actor.system.attributes[actionId].value,
  //   mod: actor.system.attributes[actionId].mod,
  //   label: actor.system.attributes[actionId].label,
  //   attr: 'attribute',
  // };
  // if (event.type === 'click') {
  //   await actor.rollAbility(actor, rData);
  // } else {
  //   await actor.rollAbilityMod(actor, rData);
  // }
}

export async function setAttribute(e) {

}

export async function rollAbility(e) {
  let thisitem = this;

  if (thisitem?.dataset == null) {
    thisitem = e.currentTarget;
  }

  const actor = await getActor(thisitem.dataset.characterId);

  if (!actor) return;
  handleAttributeAction(e, actor, thisitem.dataset)

}

/**
 * Handle Skill action
 * @private
 * @param {object} event    The event
 * @param {object} actor    The actor
 * @param {string} actionId The skill id
 */
async function handleSkillAction(event, actor, dataset) {
  const element = event.currentTarget;
  ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: actor }),
    flavor: ''
  }).then(async msg => {
    const templateData = {
      ability: dataset.label,
      skill: actor.system.skills[dataset.key],
      fields: actor.system.fields,
      key: dataset.key,
      field: dataset.field,
      actor: actor,
      timestamp: msg.timestamp
    };
    templateData.skill.label = game.i18n.localize(HOUSEHOLD.skills[dataset.label]);
    const html = await foundry.applications.handlebars.renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
    msg.update({ flavor: html });
  });
}

export function rollSkill(e) {
  const actor = getActor(this.dataset.characterId);

  if (!actor) return;
  handleSkillAction(e, actor, this.dataset)


}

export async function rollDamage(e) {
  const actor = getActor(this.dataset.characterId);
  const item = actor.items.get(this.dataset.itemId);
}


