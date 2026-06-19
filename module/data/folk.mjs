/*
* Folk item data model.
* Mirrors the `folk` type in template.json (description + languages + contract).
*
* `contract` is a single contract-item UUID (drag-dropped onto the sheet;
* replaced when a new one is dropped). Legacy folks stored it as a plain
* contract name; the migration macro resolves the name to a UUID.
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdFolk extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.languages = new fields.StringField({ required: true, blank: true });
    schema.contract = new fields.StringField({ required: true, blank: true });

    return schema;
  }
}
