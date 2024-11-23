
import { HOUSEHOLD } from './config.mjs'
function getActor(characterId) {
  let actor = {}
  if (game.user.isGM) {
    const token = canvas.tokens.get(characterId);
    actor = token.actor;
  } else {
    actor = game.actors.find(actor => actor.isOwner);
  }
  return actor;
}
export function openSheet() {
  const actor = getActor(this.dataset.characterId);
  if (actor) {
    actor.sheet.render(true);
  }
}

export async function rollAction() {
  const actor = getActor(this.dataset.characterId);
    let roll = new Roll("1d6", actor.getRollData());
    await roll.evaluate();
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: actor }),
      flavor: await actor.showAction(roll.terms[0].results[0].result),
      rollMode: game.settings.get('core', 'rollMode'),
    });
    return;
    
  
}

export function selectToken() {
  const actor = getActor(this.dataset.characterId);
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
  const actor = getActor(this.dataset.characterId);
  if(this.value.trim() == '') return;
  if (this.dataset.dtype == "Number") {
    actor.update({[this.dataset.path]: Number(this.value.trim()) })
  } else {
    actor.update({[this.dataset.path]: this.value })
  }
}

export async function editValue(e) {
  const actor = getActor(this.dataset.characterId);
  if (this.dataset.dtype == "Number") {
    actor.update({[this.dataset.path]: Number(this.dataset.value) })
  } else if (this.dataset.dtype == "Boolean") {
    const current_value = getNestedValue(actor, this.dataset.path);
    actor.update({[this.dataset.path]: !Boolean(current_value) })
  } else {
    actor.update({[this.dataset.path]: this.dataset.value })
  }
}

export async function useAce(e) {
  const actor = getActor(this.dataset.characterId);
  const current_value =  getNestedValue(actor, this.dataset.path);
  actor.update({[this.dataset.path]: !current_value })
}


export async function useItem(e) {
  let send_chat_message = true;
  const actor = getActor(this.dataset.characterId);
  const item = actor.items.get(this.dataset.itemId);
  let action, description;
  if (item.type == "move" && this.dataset?.action == "use") {
    description = item.system.description;
    if (!item.system.exhausted) {
      action = "Exhaust move";
      const suits = ["club", "diamond", "heart", "spade"];
      let fail = 0;
      let update_suits = [];

      for (let suit of suits) {
        if ( item.system.suits[suit]) {
          if (actor.system.aces[suit]) {
            update_suits.push(suit);
          } else {
            fail +=1;
          }
        }
      }
      if (fail == 1) {
        if (actor.system.aces.joker) {
          actor.update({[`system.aces.joker`]: false});
          fail -= 1;
        }
      }
      if (fail == 0) {
        item.update({['system.exhausted']: !item.system.exhausted})
        for (let suit of update_suits) {
          actor.update({[`system.aces.${suit}`]: false});
        }
      } else {
        ui.notifications.warn(`You don't have enough aces.`);
        send_chat_message = false;
      }
    } else {
      action = "Recover move";
      await item.update({['system.exhausted']: !item.system.exhausted})
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
    const renderedHTML = await renderTemplate(templatePath, data);
  
    // Send the rendered HTML to the chat
    ChatMessage.create({
      content: renderedHTML,
      speaker: { alias: "Game Master" }
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
      const html = await renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
      msg.update( { flavor: html } );
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
  console.log("setAttribute", this.dataset);
}

export async function rollAbility(e) {
  
  const actor = getActor(this.dataset.characterId);
  if (!actor) return;
  handleAttributeAction(e, actor, this.dataset)

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
      const html = await renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
      msg.update( { flavor: html } );
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

export async function spellCast(e) {
  const actor = getActor(this.dataset.characterId);
    const item = actor.items.get(this.dataset.itemId);
    const chatTemplate = 'systems/olddragon2e/templates/chat/spell-chat.hbs';
    let chatData = {
      user: game.user.id,
      speaker: { alias: actor.name },
      sound: 'sounds/dice.wav',
    };
    let cardData = {
      name: item.name,
      owner: actor.id,
      id: item._id,
      system: item.system,
    };
    chatData.content = await renderTemplate(chatTemplate, cardData);
    return ChatMessage.create(chatData);
}
export async function rollSave(e) {
  e.preventDefault();
  e.stopPropagation();

  const actor = getActor(this.dataset.characterId);
  if (!actor) return;

  if (window.BetterRolls) {
    BetterRolls.rollSave(actor, this.parentNode.dataset.ability, {});
  } else {

    let jpLabel = this.dataset.jpLabel;
    const jpName = this.dataset.jp;

    const jpRoll = new JPRoll(actor, jpLabel, jpName);

    await showDialog({
      title: `Teste de ${jpLabel}`,
      content: 'systems/olddragon2e/templates/dialog/characters/jp-roll-dialog.hbs',
      data: {
        formula: jpRoll.formula(),
      },
      buttons: {
        roll: {
          icon: "<i class='fa-solid fa-dice-d20'></i>",
          label: 'Rolar',
          callback: async (html) => {
            let adjustment = html.find('#adjustment').val();
            const bonus = html.find('#bonus').val();
            const mode = html.find('#rollMode').val();
            await jpRoll.roll(bonus);

            jpRoll.sendMessage(mode, adjustment);
          },
        },
      },
    });
  }
}