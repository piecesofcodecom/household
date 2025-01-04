
import { HOUSEHOLD } from './config.mjs'
const { DialogV2 } = foundry.applications.api;

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

export async function dialogRollSkill() {
  let guess;
  const actor = getActor(this.dataset.characterId);
  actor.dialogRollSkill(this.dataset);
  return;
  const skill = actor.system.skills[this.dataset.key];
  skill.label = game.i18n.localize(CONFIG.HOUSEHOLD.skills[this.dataset.key])
  const templateData = {
    ability: this.dataset.label,
    skill: skill,
    skill_key: this.dataset.key,
    fields: actor.system.fields,
    key: this.dataset.key,
    field: this.dataset.field,
    actor: actor,
    //timestamp: msg.timestamp
  };
  const html = await renderTemplate("systems/household/templates/chat/dialog-skill-roll.hbs", templateData);

  const dialog = await DialogV2.wait({
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
  if (this.value.trim() == '') return;
  if (this.dataset.dtype == "Number") {
    actor.update({ [this.dataset.path]: Number(this.value.trim()) })
  } else {
    actor.update({ [this.dataset.path]: this.value })
  }
}

export async function editValue(e) {
  const actor = getActor(this.dataset.characterId);
  if (this.dataset.dtype == "Number") {
    actor.update({ [this.dataset.path]: Number(this.dataset.value) })
  } else if (this.dataset.dtype == "Boolean") {
    const current_value = getNestedValue(actor, this.dataset.path);
    actor.update({ [this.dataset.path]: !Boolean(current_value) })
  } else {
    actor.update({ [this.dataset.path]: this.dataset.value })
  }
}

export async function useAce(e) {
  const actor = getActor(this.dataset.characterId);
  const current_value = getNestedValue(actor, this.dataset.path);
  actor.update({ [this.dataset.path]: !current_value })
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


