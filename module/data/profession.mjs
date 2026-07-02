/*
* Profession item data model.
* Mirrors the `profession` type in template.json.
*
* `skills` is an array of skill keys (from HOUSEHOLD.skills), picked via a
* dropdown on the sheet. `moves`/`traits` are arrays of item UUIDs populated by
* dragging move/trait items onto the sheet. Legacy professions stored all three
* as comma-separated names; migrateData coerces the shape, and the manual
* migration macro resolves move/trait names to UUIDs (skills are already keys).
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdProfession extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.skills = new fields.ArrayField(new fields.StringField());
    schema.field = new fields.StringField({ required: true, blank: true });
    schema.moves = new fields.ArrayField(new fields.StringField());
    schema.traits = new fields.ArrayField(new fields.StringField());
    // The profession owns the lists of its vocations and companions (item UUIDs,
    // drag-dropped). A profession "has a companion" when `companions` is non-empty.
    schema.vocations = new fields.ArrayField(new fields.StringField());
    schema.companions = new fields.ArrayField(new fields.StringField());

    return schema;
  }

  /**
   * Coerce legacy comma-separated name strings into string arrays so old
   * professions load under the new ArrayField schema. Shape shim only: skill
   * entries are lowercased (they are skill keys); move/trait entries stay as
   * names until the migration macro resolves them to UUIDs. Idempotent.
   * @override
   */
  static migrateData(source) {
    for (const key of ["skills", "moves", "traits"]) {
      if (typeof source?.[key] === "string") {
        let parts = source[key].split(",").map((s) => s.trim()).filter(Boolean);
        if (key === "skills") parts = parts.map((s) => s.toLowerCase());
        source[key] = parts;
      }
    }
    return super.migrateData(source);
  }
}
