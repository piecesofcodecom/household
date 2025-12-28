import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';
import { HOUSEHOLD } from '../helpers/config.mjs';
import { addProfession } from "../helpers/professions.mjs";
import * as actions from "../helpers/actions.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets

export class HouseholdActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

  /* -------------------------------------------- */
  /*  Configuration                               */
  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    classes: ['household', 'sheet', 'actor', 'themed', 'theme-light'],
    tag: 'form',
    position: {
      width: 600,
      height: 920
    },
    window: {
      resizable: true
    },
    actions: {
      roll: this.prototype._onRoll,
      show: this.prototype._onShow,
      itemEdit: this.prototype._onItemEdit,
      itemDelete: this.prototype._onItemDelete,
      itemCreate: this.prototype._onItemCreate,
      actionConfig: this.prototype._onActionConfig,
      customEdit: this.prototype._onCustomEdit,
      effectControl: this.prototype._onEffectControl,
      editImage: this.#onEditImage
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  // Define static PARTS - each tab is a separate part
  static PARTS = {
    header: {
      template: "systems/household/templates/actor/char/parts/actor-header.hbs"
    },
    tabs: {
      template: "systems/household/templates/actor/char/parts/actor-tabs-nav.hbs"
    },
    general: {
      template: "systems/household/templates/actor/char/parts/actor-tab-general.hbs"
    },
    others: {
      template: "systems/household/templates/actor/char/parts/actor-tab-others.hbs"
    },
    description: {
      template: "systems/household/templates/actor/char/parts/actor-tab-description.hbs"
    },
    items: {
      template: "systems/household/templates/actor/char/parts/actor-tab-items.hbs"
    }
  };

  // Override position for NPC sheets
  get position() {
    const pos = foundry.utils.deepClone(this.options.position);
    if (this.document?.type === 'npc' || this.document?.type === 'opponent') {
      pos.width = 500;
      pos.height = 850;
    }
    return pos;
  }

  static TABS = {
    primary: {
      tabs: [
        { id: 'general', cssClass: 'general', label: 'HOUSEHOLD.SheetLabels.General' },
        { id: 'others', cssClass: 'others', label: 'HOUSEHOLD.SheetLabels.Others' },
        { id: 'items', cssClass: 'items', label: 'HOUSEHOLD.SheetLabels.Equipament' },
        { id: 'description', cssClass: 'description', label: 'HOUSEHOLD.SheetLabels.Chapter' }
      ],
      initial: 'general'
    }
  };

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  async _prepareContext(options) {
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
    

    if (context.actor.type === 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    if (context.actor.type === 'npc' || context.actor.type === 'opponent') {
      this._prepareItems(context);
    }

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
  /*  Item & Character Prep                       */
  /* -------------------------------------------- */

  _prepareCharacterData(context) {
    if (context.actor.img === 'icons/svg/mystery-man.svg') {
      context.actor.img = '/systems/household/assets/sheet/bg-transparent.png';
    }

    for (const [k, v] of Object.entries(context.system.fields)) {
      v.label = game.i18n.localize(CONFIG.HOUSEHOLD.fields[k]) ?? k;
      if (k === 'society') {
        v.icon = "fa-heart";
        v.color = "red";
      }
    }

    for (const [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.HOUSEHOLD.skills[k]) ?? k;
      if (v.field === 'society') {
        v.icon = "fa-heart";
        v.color = "red";
      }
    }
  }

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
      profileImg.addEventListener('contextmenu', this.constructor.#onImageRightClick.bind(this));
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

  async _onActionConfig() {
    const actor = this.document;

    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/household/templates/dialog/dialog-actions.hbs",
      {
        action_1: { text: actor.system.actions.action_1 },
        action_2: { text: actor.system.actions.action_2 },
        action_3: { text: actor.system.actions.action_3 },
        action_4: { text: actor.system.actions.action_4 },
        action_5: { text: actor.system.actions.action_5 },
        action_6: { text: actor.system.actions.action_6 }
      }
    );

    foundry.applications.api.DialogV2.prompt({
      window: { title: "Config Actions" },
      content: html,
      ok: {
        label: "Submit",
        callback: (_, btn) => {
          actor.update({
            "system.actions": {
              action_1: btn.form.action_1.value,
              action_2: btn.form.action_2.value,
              action_3: btn.form.action_3.value,
              action_4: btn.form.action_4.value,
              action_5: btn.form.action_5.value,
              action_6: btn.form.action_6.value
            }
          });
        }
      }
    });
  }

  async _onCustomEdit(event, target) {
    const actor = this.document;
    if (target.dataset.object === 'actor') {
      const { path, value, dtype, object } = target.dataset;
      
      

      // Special handling for conditions - call toggleCondition
      if (path.includes('system.conditions.')) {
        await actor.toggleCondition(path);
        return;
      }

      let newValue = value;

      // Convert based on data type
      if (dtype === 'Boolean') {
        newValue = value !== 'true';
      } else if (dtype === 'Number') {
        newValue = Number(value);
      }

      
      
      await actor.update({ [path]: newValue });
    } else if (target.dataset.object === 'item') {
      let ev = {}
      ev.currentTarget = target;
      
      ev.currentTarget.dataset.action = "use";
      await actions.useItem(ev);
    }
  }

  _onEffectControl(event, target) {
    const li = target.closest("li");
    const parent =
      li.dataset.parentId === this.document.id
        ? this.document
        : this.document.items.get(li.dataset.parentId);

    onManageActiveEffect(event, parent);
  }

  /* -------------------------------------------- */
  /*  Rolls                                       */
  /* -------------------------------------------- */

  async _onRoll(event, target) {
    const actor = this.document;
    const dataset = target.dataset;
    

    if (dataset.type === 'action') {
      const roll = await new Roll("1d6", actor.getRollData()).evaluate();
      return roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: await actor.showAction(roll.total),
        rollMode: game.settings.get('core', 'rollMode')
      });
    } else if (dataset.type === 'skill') {
      
      this.actor.dialogRollSkill(dataset);

    } else if (dataset.type == 'attack') {
      
      
      const item_id = target.closest('.item-list')?.dataset.itemId;
      
      const item = this.actor.items.get(item_id);
      if (item) {
        

        dataset.label = item.system.field;
        dataset.field = item.system.field;
        dataset.key = item.system.skill;
        dataset.itemId = item.id;
        dataset.characterId = this.actor.id;
        
        this.actor.dialogRollSkill(dataset);


      }
    } else {

      if (dataset.roll) {
        const roll = new Roll(dataset.roll, actor.getRollData());
        return roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor }),
          flavor: dataset.label ?? "",
          rollMode: game.settings.get('core', 'rollMode')
        });
      }
    }
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
   * @private
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

  /**
   * Handle right-click on actor image to view or share
   * @param {MouseEvent} event  The originating contextmenu event
   * @private
   */
  static #onImageRightClick(event) {
    event.preventDefault();

    const ip = new foundry.applications.apps.ImagePopout({
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

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  // ActorSheetV2 automatically handles drag/drop for .draggable elements
  // and items with data-item-id. No manual setup needed.

  async _onDrop(event) {
    const data = TextEditor.getDragEventData(event);

    const item = await fromUuid(data.uuid);
    if (!item) return;

    // if (item.type === "profession") {
    //   return addProfession(this.document, item);
    // }
    if (["profession"].includes(item.type)) {
      addProfession(this.actor, item);
    } else if (item.type == 'folk') {
      const contract_name = item.system.contract;
      let contract_item = game.items.filter(el => el.type == 'contract' && el.name.toLowerCase() == contract_name.toLowerCase())
      this.actor.update({ 'system.folk': item.name })
      if (contract_item.length == 0 && HOUSEHOLD.premium) {
        const packs = game.packs.get(HOUSEHOLD.premium_name + '.character')
        const contents = await packs.getDocuments();
        contract_item = contents.filter(el => el.type == 'contract' && el.name.toLowerCase() == contract_name.toLowerCase())
      }
      if (contract_item.length > 0) {
        let newItemData = {
          name: contract_item[0].name,
          type: contract_item[0].type,
          img: contract_item[0].img,
          system: duplicate(contract_item[0].system)
        }
        await this.document.createEmbeddedDocuments("Item", [newItemData]);

      }

      if (contract_item.length == 0) {
        ui.notifications.warn("Contract not found: "+contract_name);
      }

    } else {
      let newItemData = {
        name: item.name,
        type: item.type,
        img: item.img,
        system: foundry.utils.duplicate(item.system)
      }
      await this.document.createEmbeddedDocuments("Item", [newItemData]);
    }

    if (data.type !== "Item") return;
    
    // await this.document.createEmbeddedDocuments("Item", [{
    //   name: item.name,
    //   type: item.type,
    //   img: item.img,
    //   system: foundry.utils.deepClone(item.system)
    // }]);
  }

}
