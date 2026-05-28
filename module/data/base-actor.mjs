import HouseholdDataModel from "./base-model.mjs";

/**
 * Shared base for all Household actor types.
 * Mirrors the `base` template in template.json (stress + biography).
 */
export default class HouseholdActorBase extends HouseholdDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.stress = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 12, min: 0 }),
      current: new fields.NumberField({ ...requiredInteger, initial: 12, min: 0 }),
      danger: new fields.NumberField({ ...requiredInteger, initial: 8, min: 0 }),
      max: new fields.NumberField({ ...requiredInteger, initial: 12, min: 0 }),
      min: new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 }),
    });

    schema.biography = new fields.HTMLField({ required: true, blank: true });

    return schema;
  }
}
