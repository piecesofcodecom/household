/*
* Move item data model.
* Mirrors the `move` type in template.json (description + requirements +
* exhausted + the four suit toggles).
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdMove extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.requirements = new fields.HTMLField({ required: true, blank: true });
    schema.exhausted = new fields.BooleanField({ initial: false });

    schema.suits = new fields.SchemaField(
      ["club", "heart", "diamond", "spade"].reduce((obj, suit) => {
        obj[suit] = new fields.BooleanField({ initial: false });
        return obj;
      }, {})
    );

    return schema;
  }
}
