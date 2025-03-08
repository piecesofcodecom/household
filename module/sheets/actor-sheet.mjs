import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';
import { HOUSEHOLD } from '../helpers/config.mjs';
import { addProfession } from "../helpers/professions.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class HouseholdActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['household', 'sheet', 'actor'],
      width: 600,
      height: 850,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        },
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/household/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = context.data;

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this.position.width = 500;
      this.position.height = 850;
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(
      // A generator that returns all effects stored on the actor
      // as well as any items
      this.actor.allApplicableEffects()
    );

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {

    if (context.actor.img == 'icons/svg/mystery-man.svg') {
      context.actor.img = '/systems/household/assets/official/logo_bg.png';
    }

    for (let [k, v] of Object.entries(context.system.fields)) {
      v.label = game.i18n.localize(CONFIG.HOUSEHOLD.fields[k]) ?? k;
      if (k == 'society') {
        v.icon = "fa-heart";
        v.color = "red";
      }
    }

    for (let [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.HOUSEHOLD.skills[k]) ?? k;
      if (v.field == 'society') {
        v.icon = "fa-heart";
        v.color = "red";
      }
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const weapons = [];
    const moves = [];
    const gadgets = [];
    const contracts = [];
    const traits = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to weapons.
      else if (i.type === 'weapon') {
        weapons.push(i);
      } else if (i.type === 'gadget') {
        gadgets.push(i);
      } else if (i.type === 'move') {
        moves.push(i);
      } else if (i.type === 'contract') {
        contracts.push(i);
      } else if (i.type === 'trait') {
        traits.push(i);
      }
    }

    // Assign and return
    context.gear = gear;
    context.weapons = weapons;
    context.traits = traits;
    context.gadgets = gadgets;
    context.moves = moves;
    context.contracts = contracts;
    context.features = [];
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item-list');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    html.find('.create-item-circle').click(async (event) => {
      event.preventDefault();

      const itemType = event.currentTarget.dataset.type;
      const itemName = `New ${itemType.charAt(0).toUpperCase() + itemType.slice(1)}`;

      const itemData = {
        name: itemName,
        type: itemType,
        data: {}
      };

      const actor = this.actor;
      const createdItems = await actor.createEmbeddedDocuments("Item", [itemData]);

      // Get the created item (should be the first item in the returned array)
      const newItem = createdItems[0];

      // Open the item sheet for the newly created item
      if (newItem) {
        newItem.sheet.render(true);
      }

    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));
    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item-list');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });


    html.on('click', '.action-configuration', async (env) => {
      const templateData = {
        "action_1": {
          "text": this.actor.system.actions.action_1,
          "placeholder": game.i18n.localize('HOUSEHOLD.ActionI.long')
        },
        "action_2": {
          "text": this.actor.system.actions.action_2,
          "placeholder": game.i18n.localize('HOUSEHOLD.ActionII.long')
        },
        "action_3": {
          "text": this.actor.system.actions.action_3,
          "placeholder": game.i18n.localize('HOUSEHOLD.ActionIII.long')
        },
        "action_4": {
          "text": this.actor.system.actions.action_4,
          "placeholder": game.i18n.localize('HOUSEHOLD.ActionIV.long')
        },
        "action_5": {
          "text": this.actor.system.actions.action_5,
          "placeholder": game.i18n.localize('HOUSEHOLD.ActionV.long')
        },
        "action_6": {
          "text": this.actor.system.actions.action_6,
          "placeholder": game.i18n.localize('HOUSEHOLD.ActionVI.long')
        }
      };

      const dialog_action_config = await renderTemplate("systems/household/templates/dialog/dialog-actions.hbs", templateData);
      foundry.applications.api.DialogV2.prompt({
        window: { title: "Config Actions", icon: "fa-solid fa-gear" },
        position: { width: 550 },
        classes: ["household-dialog"],
        content: dialog_action_config,
        rejectClose: false,
        modal: true,
        ok: {
          label: "Submit",
          callback: (event, button, dialog) => {
            const new_value = {
              "action_1": button.form.elements.action_1.value,
              "action_2": button.form.elements.action_2.value,
              "action_3": button.form.elements.action_3.value,
              "action_4": button.form.elements.action_4.value,
              "action_5": button.form.elements.action_5.value,
              "action_6": button.form.elements.action_6.value
            }
            this.actor.update({ ['system.actions']: new_value });
          }
        }
      })
    });

    html.on('click', '.npc-popup-item-edit', (ev) => {
      //const element = $(ev.currentTarget).parents('.npc-popup-item-edit');;
      const dataset = ev.currentTarget.dataset;
      const path = dataset.path;
      const label = dataset.label;
      const current_value = dataset.value;
      let html = `<input id="newvalue" value="${current_value}">`;
      if (label.toLowerCase() === 'stress') {
        const crucial_boxes = dataset.crucial_boxes;
        html = `Total Stress Boxes ${html}<br />Crucial Box positions: <input id="crucial_boxes" value="${crucial_boxes}" placeholder="example: 3,6,8">`
      }

      return Dialog.wait({
        title: `Edit ${label}`,
        content: html,
        buttons: {
          button1: {
            label: "Save",
            callback: (html) => {
              const new_value = Number(html.find("input#newvalue").val());
              this.actor.update({ [path]: new_value });
              const crucial_boxes = html.find("input#crucial_boxes").val();
              this.actor.update({ 'system.crucial_boxes': crucial_boxes });

            },
            icon: `<i class="fas fa-save"></i>`
          }
        }
      }).render(true);
    });

    //Custom edit
    html.on('click', '.custom-edit', (ev) => {
      const dataset = ev.target.dataset;
      const path = dataset.path;
      let new_value = '';
      if (dataset.dtype === 'Boolean') {
        if (dataset.path.includes('system.conditions')) {
          this.actor.toggleCondition(path);
          return;
        } else if (dataset.value === 'false') {
          new_value = true;
        } else {
          new_value = false;
        }
      } else {
        new_value = dataset.value;
      }
      if (dataset.object === 'actor') {
        this.actor.update({ [path]: new_value })
      } else if (dataset.object === 'item') {
        const item = this.actor.items.get(dataset.id);
        item.update({ [path]: new_value })
      }


    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));
    html.on('click', '.message-item', this._onShow.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = (ev) => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains('inventory-header')) return;
        li.setAttribute('draggable', true);
        li.addEventListener('dragstart', handler, false);
      });
    }
  }

  async _onDropItem(event) {
    event.preventDefault();
    const dataTransfer = JSON.parse(event.dataTransfer.getData('text/plain'));

    // Parse the dataTransfer to get item details
    if (dataTransfer.type === 'Item') {
      const item = await fromUuid(dataTransfer.uuid);

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
          await this.actor.createEmbeddedDocuments("Item", [newItemData]);

        }

      } else {
        let newItemData = {
          name: item.name,
          type: item.type,
          img: item.img,
          system: duplicate(item.system)
        }

        await this.actor.createEmbeddedDocuments("Item", [newItemData]);
      }
    }
    // You can now decide whether to add this item to the actor, modify it, or reject it

  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    if (dataset.type === 'action') {
      let roll = new Roll("1d6", this.actor.getRollData());
      await roll.evaluate();
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: await this.actor.showAction(roll.terms[0].results[0].result),
        flags: { noChanges: true},
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return;

    }
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  async _onShow(event) {
    event.preventDefault();
    const context = this.getData();
    const element = event.currentTarget;
    const dataset = element.dataset;
    this.actor.dialogRollSkill(dataset);
    return;
    ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: ''
    }).then(async msg => {
      const templateData = {
        ability: dataset.label,
        skill: context.system.skills[dataset.key],
        fields: context.system.fields,
        key: dataset.key,
        field: dataset.field,
        actor: this.actor,
        timestamp: msg.timestamp
      };
      const html = await renderTemplate("systems/household/templates/chat/skill-show-card.hbs", templateData);
      msg.update({ flavor: html });
    });
  }
}
