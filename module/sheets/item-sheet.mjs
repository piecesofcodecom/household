import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

/**
 * Extend the basic ItemSheetV2 with Household-specific functionality
 * @extends {ItemSheetV2}
 */
export class HouseholdItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ['household', 'sheet', 'item'],
    tag: 'form',
    position: {
      width: 520,
      height: 480
    },
    window: {
      resizable: true
    },
    actions: {
      customEdit: this.#onCustomEdit,
      effectControl: this.#onEffectControl,
      editImage: this.#onEditImage
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  /** @inheritDoc */
  static TABS = {
    primary: {
      tabs: [
        { id: 'description', group: 'primary', label: 'HOUSEHOLD.SheetLabels.General' },
        { id: 'configuration', group: 'primary', label: 'HOUSEHOLD.SheetLabels.Configuration' },
        { id: 'attributes', group: 'primary', label: 'HOUSEHOLD.SheetLabels.Attributes' }
      ],
      initial: 'description'
    }
  };

  /** @override */
  static PARTS = {
    // Individual item type templates
    'item-item': {
      template: 'systems/household/templates/item/item-item-sheet.hbs'
    },
    'item-gadget': {
      template: 'systems/household/templates/item/item-gadget-sheet.hbs'
    },
    'item-weapon': {
      template: 'systems/household/templates/item/item-weapon-sheet.hbs'
    },
    'item-move': {
      template: 'systems/household/templates/item/item-move-sheet.hbs'
    },
    'item-contract': {
      template: 'systems/household/templates/item/item-contract-sheet.hbs'
    },
    'item-trait': {
      template: 'systems/household/templates/item/item-trait-sheet.hbs'
    },
    'item-profession': {
      template: 'systems/household/templates/item/item-profession-sheet.hbs'
    },
    'item-vocation': {
      template: 'systems/household/templates/item/item-vocation-sheet.hbs'
    },
    'item-companion': {
      template: 'systems/household/templates/item/item-companion-sheet.hbs'
    },
    'item-folk': {
      template: 'systems/household/templates/item/item-folk-sheet.hbs'
    }
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    // Set which part to render based on item type
    options.parts = [`item-${this.document.type}`];
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Add the item to context for templates (ItemSheetV2 uses this.document)
    context.item = this.document;
    context.editable = this.isEditable;

    // Retrieve the roll data for TinyMCE editors
    context.rollData = this.document.getRollData();

    // Add the item's data to context for easier access
    context.system = this.document.system;

    if (this.document.type === 'weapon') {
      context.system.field = context.system.field.toLowerCase();
      context.system.skill = context.system.skill.toLowerCase();
      context.fields = ['society', 'academia', 'war', 'street'];
    }

    // Change icon based on the type
    if (this.document.img.includes('item-bag')) {
      const iconMap = {
        contract: 'icons/sundries/documents/document-sealed-red-yellow.webp',
        folk: 'icons/environment/people/group.webp',
        gadget: 'icons/tools/instruments/chimes-wood-white.webp',
        weapon: 'icons/skills/melee/hand-grip-staff-teal.webp',
        move: 'icons/skills/movement/figure-running-gray.webp',
        trait: 'icons/skills/trades/academics-investigation-puzzles.webp',
        profession: 'icons/sundries/scrolls/scroll-bound-ruby-red.webp',
        vocation: 'icons/sundries/scrolls/scroll-worn-rolled-beige.webp',
        companion: 'icons/creatures/magical/construct-face-stone-pink.webp'
      };

      const newIcon = iconMap[this.document.type];
      if (newIcon) {
        this.document.update({ img: newIcon });
      }
    }

    context.flags = this.document.flags;

    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(this.document.effects);

    // Enrich HTML content for editors
    const enrichmentOptions = {
      secrets: this.document.isOwner,
      relativeTo: this.document
    };

    // Enrich description for all item types
    if (this.document.system.description) {
      context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.description,
        enrichmentOptions
      );
    }

    // Enrich contract-specific fields
    if (this.document.type === 'contract') {
      if (this.document.system.concession?.details) {
        context.concessionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.document.system.concession.details,
          enrichmentOptions
        );
      }
      if (this.document.system.counterpart?.details) {
        context.counterpartHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          this.document.system.counterpart.details,
          enrichmentOptions
        );
      }
    }

    console.warn('Household | Item Sheet:', context.item);

    return context;
  }

  /* -------------------------------------------- */

  /**
   * Handle custom edit actions
   * @this {HouseholdItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCustomEdit(event, target) {
    event.preventDefault();
    const dataset = target.dataset;
    const path = dataset.path;
    let newValue = "";

    if (dataset.dtype === "Boolean") {
      newValue = dataset.value !== 'true';
    } else if (dataset.dtype === 'String') {
      newValue = dataset.value;
    }

    await this.document.update({ [path]: newValue });
  }

  /**
   * Handle active effect control actions
   * @this {HouseholdItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onEffectControl(event, target) {
    await onManageActiveEffect(event, this.document);
  }

  /**
   * Handle image editing
   * @this {HouseholdItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onEditImage(event, target) {
    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(this.document, field);

    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      current: current,
      callback: (path) => this.document.update({ [field]: path })
    });

    fp.render(true);
  }
}
