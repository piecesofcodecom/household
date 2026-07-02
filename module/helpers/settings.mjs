/*
 * World settings for the character-creation wizard.
 *
 * By default the wizard reads creation items (folk/profession/vocation/...) from
 * the world's Items directory. A GM can instead point it at a compendium pack:
 * set `creationSource` to "compendium" and `creationCompendium` to the pack id
 * (e.g. "world.my-folks" or "household-premium.character"). See
 * `getCreationItems` in helpers/professions.mjs for how these are consumed.
 */

export const CREATION_SOURCE_KEY = "creationSource";
export const CREATION_COMPENDIUM_KEY = "creationCompendium";

/**
 * Theme applied to the system's custom chat cards. Chat has no native per-actor
 * sheet selection, so the GM picks one theme world-wide. Read in the
 * `renderChatMessageHTML` hook (dice/roll-card.mjs).
 */
export const CHAT_THEME_KEY = "chatTheme";

/** Register the creation-source settings. Called from the `init` hook. */
export function registerSettings() {
  game.settings.register("household", CREATION_SOURCE_KEY, {
    name: "HOUSEHOLD.Settings.CreationSource.name",
    hint: "HOUSEHOLD.Settings.CreationSource.hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      world: "HOUSEHOLD.Settings.CreationSource.world",
      compendium: "HOUSEHOLD.Settings.CreationSource.compendium"
    },
    default: "world"
  });

  game.settings.register("household", CREATION_COMPENDIUM_KEY, {
    name: "HOUSEHOLD.Settings.CreationCompendium.name",
    hint: "HOUSEHOLD.Settings.CreationCompendium.hint",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register("household", CHAT_THEME_KEY, {
    name: "HOUSEHOLD.Settings.ChatTheme.name",
    hint: "HOUSEHOLD.Settings.ChatTheme.hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      base: "HOUSEHOLD.Settings.ChatTheme.base",
      garden: "HOUSEHOLD.Settings.ChatTheme.garden"
    },
    default: "base"
  });
}
