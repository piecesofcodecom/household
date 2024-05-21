import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class HouseholdItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['household', 'sheet', 'item'],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'description',
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = 'systems/household/templates/item';
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.data;
    // Retrieve the roll data for TinyMCE editors.
    context.rollData = this.item.getRollData();

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    if(itemData.type == 'weapon') {
      context.system.field = context.system.field.toLowerCase();
      context.system.skill = context.system.skill.toLowerCase();
      context.fields = ['society', 'academia', 'war', 'street'];

    }
    // change icon based on the type
    if (itemData.img.includes('item-bag') ) {
      if(itemData.type == "contract") {
        this.item.update({'img': 'icons/sundries/documents/document-sealed-red-yellow.webp'})
      } else if (itemData.type == "folk") {
        this.item.update({'img': 'icons/environment/people/group.webp'})
      } else if (itemData.type == "gadget") {
        this.item.update({'img': 'icons/tools/instruments/chimes-wood-white.webp'})
      } else if (itemData.type == "weapon") {
        this.item.update({'img': 'icons/skills/melee/hand-grip-staff-teal.webp'})
      } else if (itemData.type == "move") {
        this.item.update({'img': 'icons/skills/movement/figure-running-gray.webp'})
      } else if (itemData.type == "trait") {
        this.item.update({'img': 'icons/skills/trades/academics-investigation-puzzles.webp'})
      } else if (itemData.type == "profession") {
        this.item.update({'img': 'icons/sundries/scrolls/scroll-bound-ruby-red.webp'})
      } else if (itemData.type == "vocation") {
        this.item.update({'img': 'icons/sundries/scrolls/scroll-worn-rolled-beige.webp'})
      } else if (itemData.type == "companion") {
        this.item.update({'img': 'icons/creatures/magical/construct-face-stone-pink.webp'})
      }
    }
    context.flags = itemData.flags;
    
    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(this.item.effects);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.on('click', '.custom-edit', (ev) => {
      const element = ev.target;
      const dataset = element.dataset;
      const path = dataset.path;
      let new_value = "";
      if(dataset.dtype === "Boolean") {
        if (dataset.value === 'false') {
          new_value = true;
        } else {
          new_value = false;
        }
      } else if (dataset.dtype === 'String') {
        new_value = dataset.value;
      }
      this.item.update({[path]: new_value})
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) =>
      onManageActiveEffect(ev, this.item)
    );
  }
}
