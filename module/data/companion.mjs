/*
* Companion item data model.
* Mirrors the `companion` type in template.json.
*
* `profession` holds a single item UUID; `moves`/`traits` hold arrays of item
* UUIDs. The GM populates these by dragging items onto the companion sheet.
* Legacy companions stored names instead of UUIDs (profession = one name,
* moves/traits = comma-separated names); those are upgraded to UUIDs by the
* manual "Migrate old items to new Item Model" macro (see helpers/migrations.mjs).
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdCompanion extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.profession = new fields.StringField({ required: true, blank: true });
    schema.moves = new fields.ArrayField(new fields.StringField());
    schema.traits = new fields.ArrayField(new fields.StringField());

    return schema;
  }

  /**
   * Coerce legacy comma-separated name strings into string arrays so old
   * companions still load under the new ArrayField schema. This is a shape
   * shim only — it keeps the (still name-based) entries alive so the migration
   * macro can later resolve them to UUIDs. Without it, a legacy string value
   * would fail ArrayField validation and Foundry would reset it to [], losing
   * the names before they can be migrated. Idempotent: arrays pass through.
   * @override
   */
  static migrateData(source) {
    for (const key of ["moves", "traits"]) {
      if (typeof source?.[key] === "string") {
        source[key] = source[key].split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    return super.migrateData(source);
  }
}
