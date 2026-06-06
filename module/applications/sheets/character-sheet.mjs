import { HOUSEHOLD } from '../../helpers/config.mjs';
import { addProfession } from "../../helpers/professions.mjs";
import * as actions from "../../helpers/actions.mjs";
import { HouseholdBaseActorSheet } from "./base-actor-sheet.mjs";

export class HouseholdActorSheet extends HouseholdBaseActorSheet {

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
      editImage: this._onEditImage
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
    // `scrollable: [""]` makes ApplicationV2 preserve/restore the scroll position
    // of the part's own root element (the `.tab` section, which has overflow:auto)
    // across re-renders, so editing a field no longer jumps the sheet to the top.
    general: {
      template: "systems/household/templates/actor/char/parts/actor-tab-general.hbs",
      scrollable: [""]
    },
    others: {
      template: "systems/household/templates/actor/char/parts/actor-tab-others.hbs",
      scrollable: [""]
    },
    description: {
      template: "systems/household/templates/actor/char/parts/actor-tab-description.hbs",
      scrollable: [""]
    },
    items: {
      template: "systems/household/templates/actor/char/parts/actor-tab-items.hbs",
      scrollable: [""]
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
    const context = await this._prepareBaseContext(options);
    this._prepareItems(context);
    this._prepareCharacterData(context);
    return context;
  }

  /* -------------------------------------------- */
  /*  Character Prep                              */
  /* -------------------------------------------- */

  _prepareCharacterData(context) {
    // if (context.actor.img === 'icons/svg/mystery-man.svg') {
    //   context.actor.img = '/systems/household/assets/sheet/bg-transparent.png';
    // }

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

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

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

  /* -------------------------------------------- */
  /*  Drag & Drop                                 */
  /* -------------------------------------------- */

  // ActorSheetV2 automatically handles drag/drop for .draggable elements
  // and items with data-item-id. No manual setup needed.

  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

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
