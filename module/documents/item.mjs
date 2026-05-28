/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class HouseholdItem extends Item {
  /**
   * Default item artwork per type, used when no image is chosen at creation.
   * @type {Record<string, string>}
   */
  static DEFAULT_IMAGES = {
    contract: 'icons/sundries/documents/document-sealed-red-yellow.webp',
    folk: 'icons/environment/people/group.webp',
    gadget: 'icons/tools/instruments/chimes-wood-white.webp',
    weapon: 'icons/skills/melee/hand-grip-staff-teal.webp',
    move: 'icons/skills/movement/figure-running-gray.webp',
    trait: 'icons/skills/trades/academics-investigation-puzzles.webp',
    profession: 'icons/sundries/scrolls/scroll-bound-ruby-red.webp',
    vocation: 'icons/sundries/scrolls/scroll-worn-rolled-beige.webp',
    companion: 'icons/creatures/magical/construct-face-stone-pink.webp',
  };

  /**
   * Assign a type-specific default image at creation time.
   *
   * This logic used to live in prepareData() and call this.update(), but
   * mutating a document during data preparation re-enters the parent Actor's
   * prepare cycle and throws "ActiveEffect application phase 'initial' has
   * already completed" on Foundry v13+/v14. Setting the source here runs once,
   * at creation, with no re-entrancy.
   * @override
   */
  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user);
    if (allowed === false) return false;

    const fallback = this.constructor.DEFAULT_IMAGES[this.type];
    if (fallback && (!this.img || this.img.includes('item-bag'))) {
      this.updateSource({ img: fallback });
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
