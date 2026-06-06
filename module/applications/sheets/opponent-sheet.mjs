import { HOUSEHOLD } from '../../helpers/config.mjs';
import { addProfession } from "../../helpers/professions.mjs";
import * as actions from "../../helpers/actions.mjs";
import { HouseholdBaseActorSheet } from "./base-actor-sheet.mjs";

const { DialogV2 } = foundry.applications.api;

export class HouseholdNPCActorSheet extends HouseholdBaseActorSheet {

  /* -------------------------------------------- */
  /*  Configuration                               */
  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    classes: ['household', 'sheet', 'npc', 'themed', 'theme-light'],
    tag: 'form',
    position: {
      width: 511,
      height: 632
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
      customEdit: this.prototype._onCustomEdit,
      effectControl: this.prototype._onEffectControl,
      npcPopupEdit: this.prototype._onNpcPopupEdit,
      editImage: this._onEditImage
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false
    }
  };

  // Define static PARTS - NPC-specific templates
  static PARTS = {
    header: {
      template: "systems/household/templates/actor/npc/parts/npc-header.hbs"
    },
    tabs: {
      template: "systems/household/templates/actor/npc/parts/npc-tabs.hbs"
    },
    // `scrollable: [""]` preserves/restores the scroll position of each `.tab`
    // section (overflow:auto) across re-renders so edits don't jump to the top.
    main: {
      template: "systems/household/templates/actor/npc/parts/npc-tab-main-right.hbs",
      scrollable: [""]
    },
    actions: {
      template: "systems/household/templates/actor/npc/parts/npc-tab-actions.hbs",
      scrollable: [""]
    },
    items: {
      template: "systems/household/templates/actor/npc/parts/npc-tab-items.hbs",
      scrollable: [""]
    },
    biography: {
      template: "systems/household/templates/actor/npc/parts/npc-tab-biography.hbs",
      scrollable: [""]
    }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'main', group: 'primary', label: 'HOUSEHOLD.SheetLabels.Main' },
        { id: 'actions', group: 'primary', label: 'HOUSEHOLD.Edit.ActionTable.long' },
        { id: 'items', group: 'primary', label: 'HOUSEHOLD.SheetLabels.Equipament' },
        { id: 'biography', group: 'primary', label: 'HOUSEHOLD.SheetLabels.Description' }
      ],
      initial: 'main'
    }
  };

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  async _prepareContext(options) {
    const context = await this._prepareBaseContext(options);
    this._prepareItems(context);
    return context;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  async _onNpcPopupEdit(event, target) {
    const dataset = target.dataset;
    const path = dataset.path;
    const label = dataset.label;
    const current_value = dataset.value;
    let html = `<input id="newvalue" value="${current_value}">`;

    if (label.toLowerCase() === 'stress') {
      const crucial_boxes = dataset.crucial_boxes;
      html = `Total Stress Boxes ${html}<br />Crucial Box positions: <input id="crucial_boxes" value="${crucial_boxes}" placeholder="example: 3,6,8">`;
    }

    return DialogV2.prompt({
      window: {
        title: `Edit ${label}`,
        contentClasses: ["household-dialog-class"]
      },
      content: html,
      ok: {
        icon: "fas fa-save",
        label: "Save",
        callback: (event, button) => {
          const new_value = Number(button.form.elements.newvalue.value);
          this.actor.update({ [path]: new_value });
          this.actor.update({ ["system.stress.value"]: new_value });
          const crucial_boxes = button.form.elements.crucial_boxes?.value;
          if (crucial_boxes) {
            this.actor.update({ 'system.crucial_boxes': crucial_boxes });
          }
        }
      }
    });
  }

  async _onCustomEdit(event, target) {
    const actor = this.document;
    if (target.dataset.object === 'actor') {

      const { path, value, dtype, object } = target.dataset;

      let newValue = value;
      if (dtype === 'Boolean') newValue = value !== 'true';
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
        rollMode: game.settings.get('core', 'rollMode'),
        flags: {
          household: {
            customCss: true
          }
        }
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
