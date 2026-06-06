const { DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;
import * as actions from "../../helpers/actions.mjs";

export class HouseholdCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {

  static PARTS = {
    //header: { template: "systems/household/templates/sidebar/combat-tracker-header.hbs" },
    tracker: { template: 'systems/household/templates/sidebar/combat-tracker.hbs' },
    footer: { template: "systems/household/templates/sidebar/combat-tracker-footer.hbs" }
  }


  static DEFAULT_OPTIONS = {
    classes: ["household", "themed"],
    actions: {
      "nextTurn": HouseholdCombatTracker.#onNextTurn,
      "markActed": HouseholdCombatTracker.#onMarkActed
    }
  };

  /** @override */
  async _onRender(context, options) {
    try {
      await super._onRender(context, options);
    } catch (error) {
      CONFIG.logger.debug(`Custom combat tracker caught semi-expected render error: ${error}`)
    }
    const party = this.element.querySelectorAll('.combatant-act');
    party.forEach(member => {
      member.addEventListener("click", this._partyAct.bind(this));
    });

    const opponents = this.element.querySelectorAll('.roll-reaction');
    opponents.forEach(opp => {
       opp.addEventListener("click", this._opponentAct.bind(this));
    });
  }

  async _opponentAct(event) {
    const combatant_id = event.currentTarget.dataset.combatantId;
    const combat = this.viewed;
    if (!combat) return;
    const combatant = combat.turns.find(item => item._id == combatant_id);
    const dataset = event.currentTarget.dataset;
    await actions.rollAction(event);
    await combatant.setHasActed(true);
    ui.combat.render(true);
  }

  async _partyAct(event) {
    const combatant_id = event.currentTarget.dataset.combatantId;
    const combat = this.viewed;
    if (!combat) return;
    const combatant = combat.turns.find(item => item._id == combatant_id);
    combatant.setHasActed(event.currentTarget.checked);
    ui.combat.render(true);
  }

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  async _prepareCombatContext(context, options) {
    if (!game.user.isGM) return;
    await super._prepareCombatContext(context, options);

    const combat = this.viewed;
    if (!combat) return;

    let h = combat.flags?.household;
    

    // If no household flags exist, ask the GM which turn to start
    if (!h) {
      const firstTurn = await foundry.applications.api.DialogV2.wait({
        window: { title: "Start Encounter" },
        content: `<p>Do you want to start with a Reaction turn or an Action turn?</p>`,
        classes: ['household', 'dialog-encounter'],
        modal: true,
        buttons: [
          {
            action: "reaction",
            label: "Reaction Turn",
            default: true,
            callback: (event, button, dialog) => "reaction"
          },
          {
            action: "action",
            label: "Action Turn",
            default: false,
            callback: (event, button, dialog) => "action"
          }
        ],
        position: { width: 350 }
      });
      //const firstTurn = {}
      if (!firstTurn) {
        // GM cancelled dialog
        
        return;
      }

      

      // Start the encounter with the selected first turn
      await combat.startCombat({ firstTurn });

      // Refresh household flags after start
      h = combat.flags?.household;
    }

    // Populate context safely
    context.round = h?.round ?? 1;
    context.turnType = combat.currentTurnType ?? "action";
    context.isActionTurn = combat.isActionTurn ?? false;
    context.isReactionTurn = combat.isReactionTurn ?? false;
  }


  async _prepareTrackerContext(context, options) {
    await super._prepareTrackerContext(context, options);

    if (!this.viewed) return;
    context.party = await this.viewed.turns.filter(item => item.actor.type === 'character');
    context.opponents = await this.viewed.turns.filter(item => item.actor.type !== 'character');
    context.isActionTurn = this.viewed.isActionTurn;
    context.isReactionTurn = this.viewed.isReactionTurn;
    context.hasCombat = true;

//    context.unacted = context.turns.filter(t => !t.hasActed);
  //  context.acted = context.turns.filter(t => t.hasActed);
  }

  async _prepareTurnContext(combat, combatant, index) {
    const ctx = await super._prepareTurnContext(combat, combatant, index);

    //const actor = game.actors.get(com)
    ctx.hasActed = combatant.hasActed ?? false;
    ctx.canAct = combatant.canAct ?? false;
    //ctx.type = actor._id;
    
    
    ctx.isReactionTurn = combat.isReactionTurn;
    return ctx;
  }

  /* -------------------------------------------- */
  /*  Context Menu                                */
  /* -------------------------------------------- */

  _getCombatContextOptions() {
    // Remove initiative-related options
    return super._getCombatContextOptions()
      .filter(o => !o.name?.includes("Initiative"));
  }

  _getEntryContextOptions() {
    return super._getEntryContextOptions()
      .filter(o => !o.name?.includes("Initiative"));
  }

  /* -------------------------------------------- */
  /*  Button Handlers                             */
  /* -------------------------------------------- */

  static async #onNextTurn() {
    if (!game.combat) return;
    await game.combat.nextTurn();
  }

  static async #onMarkActed(event, button) {
    const li = button.closest("[data-combatant-id]");
    if (!li) return;

    const combatant = game.combat.combatants.get(li.dataset.combatantId);
    if (!combatant) return;

    await combatant.setHasActed(true);
  }
}
