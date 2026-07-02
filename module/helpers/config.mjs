export const HOUSEHOLD = {};

/**
 * The four fields, mapped to their localization keys.
 * @type {Object}
 */
HOUSEHOLD.fields = {
  society: 'HOUSEHOLD.Field.Society.long',
  academia: 'HOUSEHOLD.Field.Academia.long',
  war: 'HOUSEHOLD.Field.War.long',
  street: 'HOUSEHOLD.Field.Street.long'
};

/**
 * The card suit associated with each field. Skills inherit their field's suit.
 * @type {Object}
 */
HOUSEHOLD.fieldSuits = {
  society: 'heart',
  academia: 'diamond',
  war: 'club',
  street: 'spade'
};

HOUSEHOLD.skills = {
  art: 'HOUSEHOLD.Skill.Art.long',
  charm: 'HOUSEHOLD.Skill.Charm.long',
  eloquence: 'HOUSEHOLD.Skill.Eloquence.long',
  etiquette: 'HOUSEHOLD.Skill.Etiquette.long',
  grace: 'HOUSEHOLD.Skill.Grace.long',
  care: 'HOUSEHOLD.Skill.Care.long',
  craft: 'HOUSEHOLD.Skill.Craft.long',
  culture: 'HOUSEHOLD.Skill.Culture.long',
  insight: 'HOUSEHOLD.Skill.Insight.long',
  investigation: 'HOUSEHOLD.Skill.Investigation.long',
  athletics: 'HOUSEHOLD.Skill.Athletics.long',
  authority: 'HOUSEHOLD.Skill.Authority.long',
  fight: 'HOUSEHOLD.Skill.Fight.long',
  strength: 'HOUSEHOLD.Skill.Strength.long',
  will: 'HOUSEHOLD.Skill.Will.long',
  caution: 'HOUSEHOLD.Skill.Caution.long',
  dexterity: 'HOUSEHOLD.Skill.Dexterity.long',
  elusion: 'HOUSEHOLD.Skill.Elusion.long',
  exploration: 'HOUSEHOLD.Skill.Exploration.long',
  shoot: 'HOUSEHOLD.Skill.Shoot.long'
};


HOUSEHOLD.fieldsAbbreviations = {
  society: 'HOUSEHOLD.Field.Society.abbr',
  academia: 'HOUSEHOLD.Field.Academia.abbr',
  war: 'HOUSEHOLD.Field.War.abbr',
  street: 'HOUSEHOLD.Field.Street.abbr'
};

/**
 * The four Nations of the House. Fixed in the rulebook (no item type); the
 * character-creation wizard writes the chosen nation's name to `system.homeland`.
 * @type {Object}
 */
HOUSEHOLD.nations = {
  realm: { label: 'HOUSEHOLD.Nation.Realm.long', place: 'HOUSEHOLD.Nation.Realm.place' },
  hearth: { label: 'HOUSEHOLD.Nation.Hearth.long', place: 'HOUSEHOLD.Nation.Hearth.place' },
  free_dominions: { label: 'HOUSEHOLD.Nation.FreeDominions.long', place: 'HOUSEHOLD.Nation.FreeDominions.place' },
  horde: { label: 'HOUSEHOLD.Nation.Horde.long', place: 'HOUSEHOLD.Nation.Horde.place' }
};

/**
 * Sprite elemental groups. Only Sprite folk pick one; the choice is appended as
 * a note to the embedded folk item's description by the creation wizard.
 * @type {Object}
 */
HOUSEHOLD.spriteElements = {
  salamander: 'HOUSEHOLD.SpriteElement.Salamander',
  sylph: 'HOUSEHOLD.SpriteElement.Sylph',
  undine: 'HOUSEHOLD.SpriteElement.Undine'
};

/**
 * Folk name used to detect a Sprite (which unlocks the elemental-group sub-step).
 * Matched case-insensitively against the chosen folk item's name.
 * @type {string}
 */
HOUSEHOLD.spriteFolk = 'Sprite';

/**
 * Character conditions, registered as Foundry status effects so toggling one
 * applies a real ActiveEffect (and shows an icon on the token). Keys match the
 * `system.conditions.*` booleans on the character model; labels reuse the
 * existing HOUSEHOLD.Conditions.* localization.
 * @type {Object}
 */
HOUSEHOLD.statusEffects = {
  embarrassed: 'HOUSEHOLD.Conditions.Embarrassed',
  frightened: 'HOUSEHOLD.Conditions.Frightened',
  confused: 'HOUSEHOLD.Conditions.Confused',
  hurt: 'HOUSEHOLD.Conditions.Hurt',
  tired: 'HOUSEHOLD.Conditions.Tired',
  sick: 'HOUSEHOLD.Conditions.Sick',
  poisoned: 'HOUSEHOLD.Conditions.Poisoned',
  broken: 'HOUSEHOLD.Conditions.Broken'
};

/**
 * Token icon for each condition (Foundry core SVGs).
 * @type {Object}
 */
HOUSEHOLD.statusEffectImages = {
  embarrassed: 'icons/svg/stoned.svg',
  frightened: 'icons/svg/terror.svg',
  confused: 'icons/svg/daze.svg',
  hurt: 'icons/svg/blood.svg',
  tired: 'icons/svg/sleep.svg',
  sick: 'icons/svg/acid.svg',
  poisoned: 'icons/svg/poison.svg',
  broken: 'icons/svg/skull.svg'
};

HOUSEHOLD.premium = false;
HOUSEHOLD.premium_name = 'household-premium';
