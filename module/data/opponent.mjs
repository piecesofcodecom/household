import HouseholdActorBase from "./base-actor.mjs";

/**
 * Opponent data model (also covers actors migrated from the old `npc` type).
 * Mirrors the `opponent` type in template.json, plus `threat.level`, which the
 * sheets/HUD and chat cards read but template.json never declared.
 */
export default class HouseholdOpponent extends HouseholdActorBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.crucial_boxes = new fields.StringField({ required: true, blank: true });

    schema.actions = new fields.SchemaField(
      ["action_1", "action_2", "action_3", "action_4", "action_5", "action_6"].reduce((obj, action) => {
        obj[action] = new fields.StringField({ required: true, blank: true });
        return obj;
      }, {})
    );

    schema.threat = new fields.SchemaField({
      level: new fields.NumberField({ ...requiredInteger, initial: 1, min: 0 }),
    });

    return schema;
  }
}
