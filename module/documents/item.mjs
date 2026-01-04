/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class HouseholdItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
    if (this.img.includes('item-bag') ) {
      if(this.type == "contract") {
        this.update({'img': 'icons/sundries/documents/document-sealed-red-yellow.webp'})
      } else if (this.type == "folk") {
        this.update({'img': 'icons/environment/people/group.webp'})
      } else if (this.type == "gadget") {
        this.update({'img': 'icons/tools/instruments/chimes-wood-white.webp'})
      } else if (this.type == "weapon") {
        this.update({'img': 'icons/skills/melee/hand-grip-staff-teal.webp'})
      } else if (this.type == "move") {
        this.update({'img': 'icons/skills/movement/figure-running-gray.webp'})
      } else if (this.type == "trait") {
        this.update({'img': 'icons/skills/trades/academics-investigation-puzzles.webp'})
      } else if (this.type == "profession") {
        this.update({'img': 'icons/sundries/scrolls/scroll-bound-ruby-red.webp'})
      } else if (this.type == "vocation") {
        this.update({'img': 'icons/sundries/scrolls/scroll-worn-rolled-beige.webp'})
      } else if (this.type == "companion") {
        this.update({'img': 'icons/creatures/magical/construct-face-stone-pink.webp'})
      }
    }
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
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;
    if(item.system.skill.trim() != '') {
      let field = item.system.field;
      if(field.trim() == '') {
        const suit = this.actor.systems.skills[skill].suit;
        const fields = this.actor.system.fields;
        for (let [k, v] of Object.entries(this.actor.system.fields)) {
          if(v === suit) {
            field = k;
          }
        }
      }
      const skill = item.system.skill.toLowerCase()
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
        const html = await foundry.applications.handlebars.renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
        msg.update( { flavor: html } );
      });
    }
  }
}
