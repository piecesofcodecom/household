import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../../helpers/effects.mjs';
import * as actions from "../../helpers/actions.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class HouseholdBaseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  /**
   * Build the render context shared by both actor sheets. Subclasses call this
   * from their own `_prepareContext` and then layer on type-specific data.
   */
  async _prepareBaseContext(options) {
    const context = await super._prepareContext(options);

    // Use this.actor for ActorSheetV2
    if (this.token) {
      context.actor = this.token.actor;
      context.id = this.token.id;
    } else {
      context.actor = this.actor;
      context.id = this.actor.id;
    }

    context.system = context.actor.system;
    context.flags = context.actor.flags;
    context.items = context.actor.items.contents;
    context.effects = prepareActiveEffectCategories(
      context.actor.allApplicableEffects()
    );
    context.editable = this.isEditable;
    context.rollData = context.actor.getRollData();

    // Prepare tabs configuration
    context.tabs = this._prepareTabs("primary");

    const enrichmentOptions = {
      secrets: this.document.isOwner,
      relativeTo: this.document
    };
    // Enrich description for all item types
    if (this.document.system.biography) {
      context.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        this.document.system.biography,
        enrichmentOptions
      );
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Item Prep                                   */
  /* -------------------------------------------- */

  _prepareItems(context) {
    const gear = [];
    const weapons = [];
    const moves = [];
    const gadgets = [];
    const contracts = [];
    const traits = [];

    for (const i of context.items) {
      i.img ||= Item.DEFAULT_ICON;

      if (i.type === 'item') gear.push(i);
      else if (i.type === 'weapon') weapons.push(i);
      else if (i.type === 'gadget') gadgets.push(i);
      else if (i.type === 'move') moves.push(i);
      else if (i.type === 'contract') contracts.push(i);
      else if (i.type === 'trait') traits.push(i);
    }

    context.gear = gear;
    context.weapons = weapons;
    context.traits = traits;
    context.gadgets = gadgets;
    context.moves = moves;
    context.contracts = contracts;
    context.features = [];
    context.all_items = [...traits, ...moves, ...contracts, ...gadgets, ...weapons, ...gear];
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /**
   * Attach event listeners after rendering
   * @param {ApplicationRenderContext} context  Render context
   * @param {RenderOptions} options            Render options
   * @override
   */
  _onRender(context, options) {
    super._onRender(context, options);

    // Attach right-click listener to profile image
    const profileImg = this.element.querySelector('.profile-img');
    if (profileImg) {
      profileImg.addEventListener('contextmenu', this.constructor._onImageRightClick.bind(this));
    }
  }

  /* -------------------------------------------- */
  /*  Actions (replaces activateListeners)        */
  /* -------------------------------------------- */

  _onItemEdit(event, target) {

    const item = this.document.items.get(target.dataset.itemId);
    item?.sheet?.render(true);
  }

  async _onItemDelete(event, target) {
    const item = this.document.items.get(target.dataset.itemId);
    await item?.delete();
  }

  async _onItemCreate(event, target) {
    const type = target.dataset.type;
    const name = `New ${type.capitalize()}`;
    await Item.create({
      name,
      type,
      system: {}
    }, { parent: this.document });
  }

  _onEffectControl(event, target) {
    const li = target.closest("li");
    const parent =
      li.dataset.parentId === this.document.id
        ? this.document
        : this.document.items.get(li.dataset.parentId);

    onManageActiveEffect(event, parent);
  }

  _onShow(event, target) {
    //this.document.dialogRollSkill(target.dataset);

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

    actions.useItem(forward_event);
  }

  /**
   * Handle click event to edit the actor image
   * @param {PointerEvent} event  The originating click event
   * @param {HTMLElement} target  The clicked element
   */
  static async _onEditImage(event, target) {
    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(this.document, field);

    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: "image",
      current: current,
      callback: (path) => this.document.update({ [field]: path })
    });

    fp.render(true);
  }

  /**
   * Handle right-click on actor image to view or share
   * @param {MouseEvent} event  The originating contextmenu event
   */
  static _onImageRightClick(event) {
    event.preventDefault();

    const ip = new foundry.applications.apps.ImagePopout.implementation({
      src: this.actor.img,
      uuid: this.actor.uuid,
      window: { title: this.actor.name }
    });

    // Display the image popout
    ip.render(true);

    // If GM, also share the image with other players
    // if (game.user.isGM) {
    //   ip.shareImage();
    // }
  }
}
