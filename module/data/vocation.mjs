/*
* Vocation item data model.
* Mirrors the `vocation` type in template.json.
*
* `skills` is an array of skill keys (picked via a dropdown on the sheet);
* `traits` is an array of trait-item UUIDs (drag-dropped). `profession` is a
* single profession-item UUID (drag-dropped; replaced when a new one is dropped),
* and `field` is unchanged. Vocation has no `moves`. Legacy vocations stored
* skills/traits as comma-separated names and profession as a plain name;
* migrateData coerces the array shape and the migration macro resolves trait and
* profession names to UUIDs (skills are already keys).
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdVocation extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.profession = new fields.StringField({ required: true, blank: true });
    schema.skills = new fields.ArrayField(new fields.StringField());
    schema.field = new fields.StringField({ required: true, blank: true });
    schema.traits = new fields.ArrayField(new fields.StringField());
    schema.has_companion = new fields.BooleanField({ initial: false });

    return schema;
  }

  /**
   * Coerce legacy comma-separated name strings into string arrays so old
   * vocations load under the new ArrayField schema. Shape shim only: skill
   * entries are lowercased (keys); trait entries stay as names until the
   * migration macro resolves them to UUIDs. Idempotent.
   * @override
   */
  static migrateData(source) {
    for (const key of ["skills", "traits"]) {
      if (typeof source?.[key] === "string") {
        let parts = source[key].split(",").map((s) => s.trim()).filter(Boolean);
        if (key === "skills") parts = parts.map((s) => s.toLowerCase());
        source[key] = parts;
      }
    }
    return super.migrateData(source);
  }
}
