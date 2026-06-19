/*
* Contract item data model.
* Mirrors the `contract` type in template.json (type + concession/counterpart
* name/details). `description` is inherited from the base but unused by the
* contract sheet.
*/
import HouseholdItemBase from "./base-item.mjs";

export default class HouseholdContract extends HouseholdItemBase {
  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.type = new fields.StringField({ required: true, blank: true });

    schema.concession = new fields.SchemaField({
      name: new fields.StringField({ required: true, blank: true }),
      details: new fields.HTMLField({ required: true, blank: true }),
    });

    schema.counterpart = new fields.SchemaField({
      name: new fields.StringField({ required: true, blank: true }),
      details: new fields.HTMLField({ required: true, blank: true }),
    });

    return schema;
  }
}
