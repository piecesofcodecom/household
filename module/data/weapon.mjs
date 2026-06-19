/*
* Weapon item data model.
* Mirrors the `weapon` type in template.json (base + type/skill/field).
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdWeapon extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.trait = new fields.StringField({ required: true, blank: true });
    schema.price = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    schema.type = new fields.StringField({ required: true, blank: true });
    schema.skill = new fields.StringField({ required: true, blank: true });
    schema.field = new fields.StringField({ required: true, blank: true });

    return schema;
  }
}
