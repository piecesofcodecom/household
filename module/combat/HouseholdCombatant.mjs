// module/combat/HouseholdCombatant.js

export class HouseholdCombatant extends Combatant {

  /* -------------------------------------------- */
  /*  Turn State                                  */
  /* -------------------------------------------- */

  get hasActed() {
    return this.getFlag("household", "hasActed") ?? false;
  }

  async setHasActed(value) {
    if (value === this.hasActed) return;
    return this.setFlag("household", "hasActed", value);
  }

  async resetTurn() {
    if (this.hasActed) {
      await this.unsetFlag("household", "hasActed");
    }
  }

  /* -------------------------------------------- */
  /*  UI Helpers                                  */
  /* -------------------------------------------- */

  get canAct() {
    const combat = this.combat;
    if (!combat) return false;

    // You can add more rules here later
    return !this.hasActed;
  }
}
