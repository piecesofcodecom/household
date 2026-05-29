import HouseholdActorBase from "./base-actor.mjs";
import { HOUSEHOLD } from "../helpers/config.mjs";
import { skills_list } from "../helpers/utils.mjs";

/**
 * Player character data model.
 * Mirrors the `character` type in template.json. The field/skill structure is
 * generated from HOUSEHOLD.fields + HOUSEHOLD.fieldSuits (config.mjs) and
 * skills_list (utils.mjs) so the mapping lives in one place.
 */
export default class HouseholdCharacter extends HouseholdActorBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    // Fields: society / academia / war / street, each with a dice value + suit.
    schema.fields = new fields.SchemaField(
      Object.keys(HOUSEHOLD.fields).reduce((obj, field) => {
        obj[field] = new fields.SchemaField({
          value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 }),
          suit: new fields.StringField({ required: true, blank: false, initial: HOUSEHOLD.fieldSuits[field] }),
        });
        return obj;
      }, {})
    );

    // Skills: grouped under their field, inheriting the field's suit.
    schema.skills = new fields.SchemaField(
      Object.entries(skills_list).reduce((obj, [field, skills]) => {
        for (const skill of skills) {
          obj[skill] = new fields.SchemaField({
            value: new fields.NumberField({ ...requiredInteger, initial: 1, min: 1 }),
            field: new fields.StringField({ required: true, blank: false, initial: field }),
            suit: new fields.StringField({ required: true, blank: false, initial: HOUSEHOLD.fieldSuits[field] }),
          });
        }
        return obj;
      }, {})
    );

    // Card suits the character currently holds ("aces"), plus the joker wild card.
    schema.aces = new fields.SchemaField(
      ["club", "heart", "diamond", "spade", "joker"].reduce((obj, suit) => {
        obj[suit] = new fields.BooleanField({ initial: false });
        return obj;
      }, {})
    );

    schema.conditions = new fields.SchemaField(
      ["embarrassed", "confused", "hurt", "frightened", "tired", "sick", "poisoned", "broken"].reduce((obj, condition) => {
        obj[condition] = new fields.BooleanField({ initial: false });
        return obj;
      }, {})
    );

    schema.decorum = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.ttt = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.coins = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });

    schema.folk = new fields.StringField({ required: true, blank: true });
    schema.homeland = new fields.StringField({ required: true, blank: true });
    schema.profession = new fields.StringField({ required: true, blank: true });
    schema.vocation = new fields.StringField({ required: true, blank: true });
    schema.companion = new fields.StringField({ required: true, blank: true });
    schema.languages = new fields.StringField({ required: true, blank: true, initial: "Housian" });
    schema.experience = new fields.StringField({ required: true, blank: true });
    schema.wealth = new fields.StringField({ required: true, blank: true });

    schema.chapters = new fields.SchemaField(
      [
        "prologue", "chapter1", "chapter2",
        "chapter3_0", "chapter3_1",
        "chapter4_0", "chapter4_1",
        "chapter5_0", "chapter5_1",
      ].reduce((obj, chapter) => {
        obj[chapter] = new fields.StringField({ required: true, blank: true });
        return obj;
      }, {})
    );

    return schema;
  }
}
