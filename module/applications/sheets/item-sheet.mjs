import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../../helpers/effects.mjs';
import { HOUSEHOLD } from '../../helpers/config.mjs';
import { skills_list } from '../../helpers/utils.mjs';
import { resolveItemRef } from '../../helpers/professions.mjs';

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
      height: 580
    },
    window: {
      resizable: true
    },
    actions: {
      customEdit: this.#onCustomEdit,
      effectControl: this.#onEffectControl,
      editImage: this.#onEditImage,
      removeRef: this.#onRemoveRef,
      addSkill: this.#onAddSkill,
      removeSkill: this.#onRemoveSkill
    },
    dragDrop: [{ dragSelector: null, dropSelector: '.item-sheet' }],
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  /**
   * Per-type initial window sizes. Item types not listed use DEFAULT_OPTIONS.position.
   * @type {Record<string, {width: number, height: number}>}
   */
  static SHEET_SIZES = {
    profession: { width: 413, height: 614 },
    vocation: { width: 443, height: 558 },
    move: { width: 513, height: 514 }
  };

  /** @override */
  static _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);
    const size = this.SHEET_SIZES[options.document?.type];
    if (size) options.position = { ...options.position, ...size };
    return options;
  }

  /**
   * Item types whose sheets accept dropped items as references, and which
   * dropped item type maps to which reference field. `single` fields store one
   * UUID; the rest store arrays of UUIDs. See item-companion-sheet.hbs.
   * @type {Record<string, {single: string[], array: Record<string, string>}>}
   */
  static REF_TARGETS = {
    // The companion no longer references its profession; the profession owns the
    // link (see below). The companion sheet only takes dropped moves/traits.
    companion: {
      single: {},
      array: { move: 'moves', trait: 'traits' }
    },
    profession: {
      single: {},
      array: { move: 'moves', trait: 'traits', vocation: 'vocations', companion: 'companions' }
    },
    // The profession ↔ vocation link is now owned by the profession: a vocation is
    // dragged onto its profession. The vocation sheet only displays the back-
    // reference (set automatically), so it no longer accepts a dropped profession.
    vocation: {
      single: {},
      array: { trait: 'traits' }
    },
    folk: {
      single: { contract: 'contract' },
      array: {}
    }
  };

  constructor(options = {}) {
    super(options);
    this.#dragDrop = this.#createDragDropHandlers();
  }

  /** @type {DragDrop[]} */
  #dragDrop;

  #createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this)
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this)
      };
      return new foundry.applications.ux.DragDrop.implementation(d);
    });
  }

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
      // Skill options for the dropdown, grouped by field (optgroups) so users
      // pick a valid skill key instead of typing a name.
      context.skillsByField = Object.entries(skills_list).map(([field, keys]) => ({
        field,
        label: HOUSEHOLD.fields[field],
        skills: keys.map((key) => ({ key, label: HOUSEHOLD.skills[key] }))
      }));
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

    // Resolve UUID references (drag-and-dropped items) to display chips.
    if (this.document.type === 'companion') {
      const sys = this.document.system;
      context.companionMoves = await Promise.all((sys.moves ?? []).map((u) => this.#resolveRef(u)));
      context.companionTraits = await Promise.all((sys.traits ?? []).map((u) => this.#resolveRef(u)));
    }

    // Profession and vocation share the skill picker + move/trait ref chips.
    // (vocation has no moves field, so refMoves resolves to an empty list.)
    if (this.document.type === 'profession' || this.document.type === 'vocation') {
      const sys = this.document.system;
      context.refMoves = await Promise.all((sys.moves ?? []).map((u) => this.#resolveRef(u)));
      context.refTraits = await Promise.all((sys.traits ?? []).map((u) => this.#resolveRef(u)));
      // Profession owns the lists of its vocations and companions (drag-dropped
      // UUIDs). A profession "has a companion" when its companions list is non-empty.
      if (this.document.type === 'profession') {
        context.refVocations = await Promise.all((sys.vocations ?? []).map((u) => this.#resolveRef(u)));
        context.refCompanions = await Promise.all((sys.companions ?? []).map((u) => this.#resolveRef(u)));
        context.hasCompanion = (sys.companions ?? []).length > 0;
      }
      // Picked skills (key -> localized label) and the skills still available to add.
      const picked = sys.skills ?? [];
      context.refSkills = picked.map((key) => ({ key, label: HOUSEHOLD.skills[key] ?? key }));
      context.availableSkills = Object.entries(HOUSEHOLD.skills)
        .filter(([key]) => !picked.includes(key))
        .map(([key, label]) => ({ key, label }));
    }

    // Folk links a single contract (drag-dropped UUID).
    if (this.document.type === 'folk') {
      const sys = this.document.system;
      context.refContract = sys.contract ? await this.#resolveRef(sys.contract) : null;
    }

    return context;
  }

  /**
   * Resolve a stored reference to a display chip. Falls back to a "missing"
   * chip (showing the raw value) when the referenced item can't be found —
   * e.g. a deleted item, or a legacy name not yet migrated to a UUID.
   * @param {string} uuid
   * @returns {Promise<{uuid: string, name: string, img: string, missing: boolean}>}
   */
  async #resolveRef(uuid) {
    // resolveItemRef also resolves bare "Item.<id>" refs that point at compendium
    // items (fromUuid alone only checks the world).
    const doc = await resolveItemRef(uuid);
    if (doc) return { uuid, name: doc.name, img: doc.img, missing: false };
    return { uuid, name: uuid, img: 'icons/svg/hazard.svg', missing: true };
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

    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: current,
      callback: (path) => this.document.update({ [field]: path })
    });

    fp.render(true);
  }

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this.#dragDrop.forEach((d) => d.bind(this.element));
  }

  _canDragStart(selector) {
    return this.isEditable;
  }

  _canDragDrop(selector) {
    return this.isEditable;
  }

  _onDragStart(event) {}

  _onDragOver(event) {}

  /**
   * Accept dropped items as references on sheets that opt in via REF_TARGETS
   * (currently companion). Routes the dropped item to the matching field by its
   * type; single fields store one UUID, array fields append (no duplicates).
   * @param {DragEvent} event
   */
  async _onDrop(event) {
    const targets = this.constructor.REF_TARGETS[this.document.type];
    if (!targets) return;

    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type !== 'Item' || !data.uuid) return;

    const dropped = await fromUuid(data.uuid);
    if (!dropped) return;

    // Single-reference field (e.g. profession).
    const singleField = targets.single[dropped.type];
    if (singleField) {
      await this.document.update({ [`system.${singleField}`]: dropped.uuid });
      return;
    }

    // Array-reference field (e.g. moves, traits).
    const arrayField = targets.array[dropped.type];
    if (arrayField) {
      const current = this.document.system[arrayField] ?? [];
      if (current.includes(dropped.uuid)) return; // already linked
      await this.document.update({ [`system.${arrayField}`]: [...current, dropped.uuid] });
      return;
    }

    ui.notifications.warn(`A "${dropped.type}" item cannot be linked here.`);
  }

  /**
   * Remove a reference chip (clear a single field or splice an array entry).
   * @this {HouseholdItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target  Carries data-kind (profession|move|trait) and data-uuid
   */
  static async #onRemoveRef(event, target) {
    const targets = this.constructor.REF_TARGETS[this.document.type];
    if (!targets) return;
    const { kind, uuid } = target.dataset;

    const singleField = targets.single[kind];
    if (singleField) {
      await this.document.update({ [`system.${singleField}`]: '' });
      return;
    }

    const arrayField = targets.array[kind];
    if (arrayField) {
      const current = this.document.system[arrayField] ?? [];
      await this.document.update({ [`system.${arrayField}`]: current.filter((u) => u !== uuid) });
    }
  }

  /**
   * Add the skill currently chosen in the skill dropdown to system.skills.
   * @this {HouseholdItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddSkill(event, target) {
    const select = this.element.querySelector('select.skill-to-add');
    const key = select?.value;
    if (!key) return;
    const current = this.document.system.skills ?? [];
    if (current.includes(key)) return;
    await this.document.update({ 'system.skills': [...current, key] });
  }

  /**
   * Remove a skill (data-key) from system.skills.
   * @this {HouseholdItemSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target  Carries data-key
   */
  static async #onRemoveSkill(event, target) {
    const key = target.dataset.key;
    const current = this.document.system.skills ?? [];
    await this.document.update({ 'system.skills': current.filter((k) => k !== key) });
  }
}
