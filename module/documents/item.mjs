const { DialogV2 } = foundry.applications.api;

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
    const rollMode = game.settings.get('core', 'messageMode');
    const label = `[${item.type}] ${item.name}`;
    if (item.system.skill.trim() != '') {
      let field = item.system.field;
      if (field.trim() == '') {
        const suit = this.actor.systems.skills[skill].suit;
        const fields = this.actor.system.fields;
        for (let [k, v] of Object.entries(this.actor.system.fields)) {
          if (v === suit) {
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
        msg.update({ flavor: html });
      });
    }
  }

  /**
   * Handle use items.
   * @public
   * return: true if item was used, or false if item cannot be used
   */
  async useItem(parameters, actor) {

    if (this.type == 'move') {
      console.warn('move logic')
      if (!this.system.exhausted) {
        this.update({ ['system.exhausted']: !this.system.exhausted });
        const templatePath = "systems/household/templates/chat/item-card.hbs";
        const action = "Exhaust move";
        let description = this.system.description;
        // Data to pass to the template
        const data = {
          name: this.name,
          type: this.type,
          description: description,
          img: this.img,
          action: action,
          has_action: action.length > 0 ? true : false
        };

        // Render the template
        const renderedHTML = await foundry.applications.handlebars.renderTemplate(templatePath, data);

        // Send the card as flavor (so it's inside .flavor-text where the chat styles
        // live) and flag it so the message <li> gets a class to scope its layout.
        ChatMessage.create({
          flavor: renderedHTML,
          speaker: { alias: actor.name },
          flags: { household: { itemCard: true } }
        });
        return true;
      } else {
        // Move already exhausted: it can still be used by spending an ace.
        // Eligible aces are the suits the move accepts (this.system.suits) that
        // the actor currently holds (actor.system.aces), plus the joker wild card.
        const useActor = actor ?? this.actor;
        if (!useActor) return false;

        const suits = ["club", "heart", "diamond", "spade"];
        const available = suits.filter(
          (suit) => this.system.suits[suit] && useActor.system.aces[suit]
        );
        if (useActor.system.aces.joker) available.push("joker");

        if (available.length === 0) {
          ui.notifications.warn("You don't have an ace to use this move.");
          return false;
        }

        // Let the player pick which ace to spend (one button per eligible suit).
        const chosen = await DialogV2.wait({
          classes: ["hh-dialog"],
          window: { title: this.name, contentClasses: ["household-dialog-class"] },
          content: `<p>Select an ace to spend to use this move.</p>`,
          buttons: available.map((suit) => ({
            action: suit,
            icon: `fa-household-${suit}-full`,
            label: suit.charAt(0).toUpperCase() + suit.slice(1),
            callback: () => suit
          })),
          rejectClose: false
        });
        if (!chosen) return false;

        // Spend the chosen ace.
        await useActor.update({ [`system.aces.${chosen}`]: false });
        Hooks.callAll('household.onUpdateTokenRequest');

        // Announce in chat which ace was exhausted to use the move.
        let description = this.system.description;
        const templatePath = "systems/household/templates/chat/item-card.hbs";
        const data = {
          name: this.name,
          type: this.type,
          description: `<p>Exhausted the <i class="fa-household-${chosen}-full"></i> ace to use this move.</p>` + description,
          img: this.img,
          action: "Use move",
          has_action: true
        };
        const renderedHTML = await foundry.applications.handlebars.renderTemplate(templatePath, data);
        ChatMessage.create({
          flavor: renderedHTML,
          speaker: { alias: useActor.name },
          flags: { household: { itemCard: true } }
        });
        return true;
      }
    }
    return false;

  }
}
