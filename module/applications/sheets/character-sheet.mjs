import { HOUSEHOLD } from '../../helpers/config.mjs';
import { linkHeaderItem, resolveItemRef } from "../../helpers/professions.mjs";
import { HouseholdCharacterCreation } from "../character-creation.mjs";
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
      width: 823,
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
      editImage: this._onEditImage,
      unlinkHeaderItem: this.prototype._onUnlinkHeaderItem,
      toggleLock: this.prototype._onToggleLock,
      'create-char': this.prototype._onCreateChar,
      'reset-char': this.prototype._onResetChar
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
    this._prepareHeaderLinks(context);
    return context;
  }

  /**
   * A dropped folk/profession/vocation is copied onto the actor as an embedded
   * item (see linkHeaderItem). When such a copy exists, the matching header
   * field renders as a read-only chip (click opens the item) instead of a text
   * input. Only one copy per type exists, so a simple lookup by type suffices.
   */
  _prepareHeaderLinks(context) {
    const find = (type) => this.document.items.find((i) => i.type === type) ?? null;
    context.linkedFolk = find('folk');
    context.linkedProfession = find('profession');
    context.linkedVocation = find('vocation');
    // Sheet lock: when true, field/skill controls are disabled (see general tab).
    context.sheetLocked = !!this.document.getFlag('household', 'sheetLocked');
    // Creation done: hide the "Create Character" button, show the reset control.
    context.creationComplete = !!this.document.getFlag('household', 'creation')?.completed;
  }

  /**
   * Toggle the sheet lock flag, which freezes field/skill editing on the sheet.
   * @this {HouseholdActorSheet}
   */
  async _onToggleLock(event, target) {
    await this.document.setFlag('household', 'sheetLocked', !this.document.getFlag('household', 'sheetLocked'));
  }

  /**
   * Open the guided character-creation wizard for this actor. Re-focuses the
   * existing window if it is already open.
   * @this {HouseholdActorSheet}
   */
  async _onCreateChar(event, target) {
    const id = `household-creation-${this.document.id}`;
    const existing = foundry.applications.instances.get(id);
    if (existing) return existing.bringToFront();
    new HouseholdCharacterCreation({ id, actor: this.document }).render(true);
  }

  /**
   * Fully undo character creation after a confirmation prompt: deletes granted
   * items, resets Field/Skill points, clears the header strings, and removes the
   * creation flag so the "Create Character" button reappears.
   * @this {HouseholdActorSheet}
   */
  async _onResetChar(event, target) {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize('HOUSEHOLD.Creation.ResetTitle') },
      content: `<p>${game.i18n.localize('HOUSEHOLD.Creation.ResetConfirm')}</p>`
    });
    if (!confirmed) return;
    await HouseholdCharacterCreation.reset(this.document);
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

  /**
   * Remove a linked header item: delete the embedded copy and clear the string
   * field, so the field reverts to a free-text input.
   * @param {PointerEvent} event
   * @param {HTMLElement} target  Carries data-item-id and data-field
   */
  async _onUnlinkHeaderItem(event, target) {
    const { itemId, field } = target.dataset;
    const item = this.document.items.get(itemId);
    if (item) await item.delete();
    if (field) await this.document.update({ [field]: "" });
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
        rollMode: game.settings.get('core', 'messageMode')
      });
    } else if (dataset.type === 'skill') {
      const skill = this.actor.system.skills[dataset.key];
      const ctrlKey = event.ctrlKey;
      if (ctrlKey) {
        this.actor.dialogRollSkill(dataset);
      } else {
        this.actor.onSkillRoll(
          skill.field,
          dataset.key,
          0, {
          '2': "",
          '3': "",
          '4': "",
          '5': ""
        })
      }

      //this.actor.dialogRollSkill(dataset);

    } else if (dataset.type == 'attack') {
      const item_id = target.closest('.item-list')?.dataset.itemId;

      const item = this.actor.items.get(item_id);
      if (item) {
        const skill = this.actor.system.skills[item.system.skill];
        const ctrlKey = event.ctrlKey;
        dataset.label = item.system.field;
        dataset.field = item.system.field;
        dataset.key = item.system.skill;
        dataset.itemId = item.id;
        dataset.characterId = this.actor.id;
        if (ctrlKey) {
          this.actor.dialogRollSkill(dataset, item);
        } else {
          this.actor.onSkillRoll(
            skill.field,
            dataset.key,
            0, {
            '2': "",
            '3': "",
            '4': "",
            '5': ""
          }, false, false, false, false, {}, 0, {}, item)
        }
      }
    } if (dataset.type == 'item') {
      const item_id = target.closest('.item-list')?.dataset.itemId;
      const item = this.actor.items.get(item_id);
      console.warn("teste")
      if (item) {
        item.useItem(null, actor);
      }
    } else {

      if (dataset.roll) {
        const roll = new Roll(dataset.roll, actor.getRollData());
        return roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor }),
          flavor: dataset.label ?? "",
          rollMode: game.settings.get('core', 'messageMode')
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
    if (data.type !== "Item") return;

    const item = await fromUuid(data.uuid);
    if (!item) return;

    // Folk/profession/vocation are "header" items: drop just embeds a copy and
    // links the header chip — no guided dialogs (those live in the creation
    // wizard, opened from the "Create Char" button). Folk also embeds its
    // granted contract.
    if (item.type === 'profession') {
      await linkHeaderItem(this.actor, item);
      await this.actor.update({ 'system.profession': item.name });
    } else if (item.type === 'vocation') {
      await linkHeaderItem(this.actor, item);
      await this.actor.update({ 'system.vocation': item.name });
    } else if (item.type === 'folk') {
      await linkHeaderItem(this.actor, item);
      await this.actor.update({ 'system.folk': item.name });
      const contract = await resolveItemRef(item.system.contract, 'contract');
      if (contract) {
        await this.document.createEmbeddedDocuments("Item", [{
          name: contract.name,
          type: contract.type,
          img: contract.img,
          system: foundry.utils.duplicate(contract.system)
        }]);
      } else if (item.system.contract) {
        ui.notifications.warn("Contract not found: " + item.system.contract);
      }
    } else {
      await this.document.createEmbeddedDocuments("Item", [{
        name: item.name,
        type: item.type,
        img: item.img,
        system: foundry.utils.duplicate(item.system)
      }]);
    }
  }

}
