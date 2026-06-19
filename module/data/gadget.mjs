/*
* Gadget item data model.
* Mirrors the `gadget` type in template.json (base + trait + price).
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdGadget extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.trait = new fields.StringField({ required: true, blank: true });
    schema.price = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    return schema;
  }
}
