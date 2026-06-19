/*
* Generic gear item data model.
* Mirrors the `item` type in template.json (base + quantity + weight).
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdGear extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.trait = new fields.StringField({ required: true, blank: true });
    schema.price = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.quantity = new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 });
    schema.weight = new fields.NumberField({ required: true, nullable: false, initial: 0, min: 0 });

    return schema;
  }
}
