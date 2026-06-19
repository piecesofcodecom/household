/*
* Trait item data model.
* Mirrors the `trait` type in template.json (description + optional flag).
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdTrait extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.optional = new fields.BooleanField({ initial: false });

    return schema;
  }
}
