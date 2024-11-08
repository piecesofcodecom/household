

export function openSheet() {
  let actor = game.actors.get(this.dataset.character);
  if (actor) {
    actor.sheet.render(true);
  }
}

export function selectToken() {
  const actor = game.actors.get(this.dataset.character);
  if (!actor) return;

  const tokens = actor.getActiveTokens();
  if (tokens.length > 0) {
    tokens[0].control();
  }
}

export function rollItem(e) {
  console.log(e);
}

export async function rollAttack(e) {
  const actor = game.actors.get(this.dataset.characterId);
  if (!actor) return;
  
}


/**
		 * Handle Attribute action
		 * @private
		 * @param {object} event    The event
		 * @param {object} actor    The actor
		 * @param {string} actionId The action id
		 */
async function handleAttributeAction(event, actor, actionId) {
  let rData = [];
  if (!actor) return;
  if (!actor.system?.attributes) return;
  rData = {
    roll: actor.system.attributes[actionId].value,
    mod: actor.system.attributes[actionId].mod,
    label: actor.system.attributes[actionId].label,
    attr: 'attribute',
  };
  if (event.type === 'click') {
    await actor.rollAbility(actor, rData);
  } else {
    await actor.rollAbilityMod(actor, rData);
  }
}

export async function rollAbility(e) {
  
  const actor = game.actors.get(this.dataset.characterId);
  if (!actor) return;
  //console.warn(this.dataset)
  handleAttributeAction(e, actor, this.dataset.ability)

}

/**
 * Handle Skill action
 * @private
 * @param {object} event    The event
 * @param {object} actor    The actor
 * @param {string} actionId The skill id
 */
async function handleSkillAction(event, actor, actionId) {
  let rData = [];
  if (!actor) return;
  if (!actor.system?.skills) return;
  rData = {
    roll: actor.system.skills[actionId].mod,
    label: actor.system.skills[actionId].label,
  };
  if (event.type === 'click') {
    await actor.rollAbility(actor, rData);
  } else {
    await actor.rollAbilityMod(actor, rData);
  }
}

export function rollSkill(e) {
  //console.warn("adadasd")
  const actor = game.actors.get(this.dataset.characterId);
  if (!actor) return;
  handleSkillAction(e, actor, this.dataset.skill)
  
 
}

export async function rollDamage(e) {
  const actor = game.actors.get(this.dataset.characterId);
  const item = actor.items.get(this.dataset.itemId);
}

export async function spellCast(e) {
  const actor = game.actors.get(this.dataset.characterId);
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

  const actor = game.actors.get(this.parentNode.dataset.characterId);
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
