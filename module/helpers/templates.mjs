/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return foundry.applications.handlebars.loadTemplates([
    // Character actor partials
    'systems/household/templates/actor/char/parts/actor-header.hbs',
    'systems/household/templates/actor/char/parts/actor-tabs-nav.hbs',
    'systems/household/templates/actor/char/parts/actor-tab-general.hbs',
    'systems/household/templates/actor/char/parts/actor-tab-general-right.hbs',
    'systems/household/templates/actor/char/parts/actor-tab-others.hbs',
    'systems/household/templates/actor/char/parts/actor-tab-description.hbs',
    'systems/household/templates/actor/char/parts/actor-tab-items.hbs',
    'systems/household/templates/actor/char/parts/actor-list-items.hbs',
    'systems/household/templates/actor/char/parts/actor-list-all-items.hbs',
    'systems/household/templates/actor/char/parts/actor-features.hbs',
    'systems/household/templates/actor/char/parts/actor-others.hbs',
    // NPC actor partials
    "systems/household/templates/actor/npc/parts/npc-header.hbs",
    "systems/household/templates/actor/npc/parts/npc-tabs.hbs",
    "systems/household/templates/actor/npc/parts/npc-main.hbs",
    "systems/household/templates/actor/npc/parts/npc-tab-main.hbs",
    "systems/household/templates/actor/npc/parts/npc-tab-main-right.hbs",
    "systems/household/templates/actor/npc/parts/npc-tab-actions.hbs",
    "systems/household/templates/actor/npc/parts/npc-tab-items.hbs",
    "systems/household/templates/actor/npc/parts/npc-tab-biography.hbs",
    // HUD templates
    "systems/household/templates/actor/hud/actor-hud-list-items.hbs",
    "systems/household/templates/actor/hud/hud-character.hbs",
    "systems/household/templates/actor/hud/hud-npc.hbs",
    // Chat parts
    'systems/household/templates/chat/parts/dice/faces.html',
    'systems/household/templates/chat/skill-roll-card.hbs',
    'systems/household/templates/chat/dice-roll.hbs',
    'systems/household/templates/chat/skill-show-card.hbs',
    'systems/household/templates/chat/action-show-card.hbs',
    'systems/household/templates/chat/dialog-skill-roll.hbs',
    'systems/household/templates/chat/item-card.hbs',
    // Dialogs
    "systems/household/templates/dialog/dialog-actions.hbs"
  ]);
};
