// module/combat/HouseholdCombatTracker.js

const { DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;

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

    context.unacted = context.turns.filter(t => !t.hasActed);
    context.acted = context.turns.filter(t => t.hasActed);
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
