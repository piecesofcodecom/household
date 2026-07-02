import { HouseholdActorSheet } from "./character-sheet.mjs";

/**
 * Optional "Garden" variant of the character sheet. Identical markup and
 * behaviour to {@link HouseholdActorSheet} — it only adds the `garden` class to
 * the root element, which re-scopes the new-layout tokens to the Garden palette
 * (see src/scss/themes/_garden.scss). Registered as a non-default sheet so the
 * GM can pick it as the type default and players can override it per actor.
 */
export class HouseholdGardenActorSheet extends HouseholdActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ['household', 'sheet', 'actor', 'themed', 'theme-light', 'garden']
  };
}
