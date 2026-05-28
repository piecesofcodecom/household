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

HOUSEHOLD.premium = false;
HOUSEHOLD.premium_name = 'household-premium';
