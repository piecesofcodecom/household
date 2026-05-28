// module/combat/HouseholdCombat.js
export class HouseholdCombat extends Combat {

  /* -------------------------------------------- */
  /*  Combat Lifecycle                            */
  /* -------------------------------------------- */

  async startCombat({ firstTurn = "action" } = {}) {
    // Validate input
    if (!["action", "reaction"].includes(firstTurn)) {
      firstTurn = "action";
    }

    const turnOrder = [
      firstTurn,
      firstTurn === "action" ? "reaction" : "action"
    ];

    await this.update({
      "flags.household.round": 1,
      "flags.household.turnIndex": 0,
      "flags.household.firstRoundOrder": firstTurn,
      "flags.household.turnOrder": turnOrder,
    });

    await this._resetCombatantsForNewTurn();

    //ui.notifications.warn("Começo de Combate no Round: " + firstTurn)

    return super.startCombat();
  }

  /* -------------------------------------------- */
  /*  Turn & Round Flow                           */
  /* -------------------------------------------- */

  async nextTurn() {
    const { turnIndex, turnOrder } = this.flags.household;
    if (turnIndex === 0) {
      if (turnOrder[1] == 'reaction') {
        this.combatants.filter(combatant => combatant.actor?.type === 'opponent')
          .forEach(combatant => {
            combatant.token?.object?.renderFlags.set({ refreshTurnMarker: true });
          });
          this.combatants.filter(combatant => combatant.actor?.type === 'character')
          .forEach(combatant => {
            combatant.token?.object?.renderFlags.set({ refreshTurnMarker: false });
          });
      } else {
        this.combatants.filter(combatant => combatant.actor?.type === 'character')
          .forEach(combatant => {
            combatant.token?.object?.renderFlags.set({ refreshTurnMarker: true });
          });
          this.combatants.filter(combatant => combatant.actor?.type === 'character')
          .forEach(combatant => {
            combatant.token?.object?.renderFlags.set({ refreshTurnMarker: false });
          });
      }

      await this.update({
        "flags.household.turnIndex": 1,
        //"flags.household.currentTurn": next_turn
      });
      await this._resetCombatantsForNewTurn();
      return;
    }

    // End of round
    await this.nextRound();
  }

  async nextRound() {
    const { turnOrder } = this.flags.household;
    const round = (this.flags.household.round ?? 1) + 1;
    //ui.notifications.warn("Começou o próximo Round: " + round)
    // From round 2 onwards, order is always Action → Reaction
    await this.update({
      "flags.household.round": round,
      "flags.household.turnIndex": 0,
      "flags.household.turnOrder": ["action", "reaction"]
    });
    // if (turnOrder[0] == 'reaction') {
    //     this.combatants.filter(combatant => combatant.actor?.type === 'npc')
    //       .forEach(combatant => {
    //         combatant.token?.object?.renderFlags.set({ refreshTurnMarker: true });
    //       });
    //       this.combatants.filter(combatant => combatant.actor?.type === 'character')
    //       .forEach(combatant => {
    //         combatant.token?.object?.renderFlags.set({ refreshTurnMarker: true });
    //       });
    //   } else {
    //     this.combatants.filter(combatant => combatant.actor?.type === 'character')
    //       .forEach(combatant => {
    //         combatant.token?.object?.renderFlags.set({ refreshTurnMarker: true });
    //       });
    //       this.combatants.filter(combatant => combatant.actor?.type === 'npc')
    //       .forEach(combatant => {
    //          console.warn("NPC off")
    //          console.warn(combatant.token)
    //          combatant.token.update( {turnMarker: {}});
    //         //combatant.token?.object?.renderFlags.set({ refreshTurnMarker: true });
    //       });
    //   }
    await this._resetCombatantsForNewTurn();
  }

  /* -------------------------------------------- */
  /*  Helpers                                     */
  /* -------------------------------------------- */

  get currentTurnType() {
    const h = this.flags?.household;
    if (!h?.turnOrder) return "action";
    return h.turnOrder[h.turnIndex ?? 0] ?? "action";
  }

  get isActionTurn() {
    return this.currentTurnType === "action";
  }

  get isReactionTurn() {
    return this.currentTurnType === "reaction";
  }

  /* -------------------------------------------- */
  /*  Combatant Handling                          */
  /* -------------------------------------------- */

  async _resetCombatantsForNewTurn() {
    for (const combatant of this.combatants) {
      await combatant.resetTurn();
    }
  }

  /* -------------------------------------------- */
  /*  Disable Initiative                          */
  /* -------------------------------------------- */

  async rollInitiative() {
    ui.notifications.warn("Household encounters do not use initiative.");
    return;
  }
}
