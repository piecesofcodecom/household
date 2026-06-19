/*
* Shared base for all Household item types.
* Mirrors the `base` template in template.json, but `description` and
* `free_reroll` are made universal here: every item .hbs exposes both, and
* roll-card.mjs filters all actor items by `system.free_reroll`.
*/
import HouseholdDataModel from "./base-model.mjs";

export default class HouseholdItemBase extends HouseholdDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.HTMLField({ required: true, blank: true });
    schema.free_reroll = new fields.BooleanField({ initial: false });

    return schema;
  }
}
