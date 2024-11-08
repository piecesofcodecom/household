/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  return loadTemplates([
    // Actor partials.
    'systems/household/templates/actor/parts/actor-tab-general.hbs',
    'systems/household/templates/actor/parts/actor-tab-general-right.hbs',
    'systems/household/templates/actor/parts/actor-tab-others.hbs',
    'systems/household/templates/actor/parts/actor-list-items.hbs',
    // Item partials
    // Chat parts
    'systems/household/templates/chat/parts/dice/faces.html',
    // NPC parts
    "systems/household/templates/actor/parts/npc-tab-main.hbs",
    "systems/household/templates/actor/parts/npc-tab-main-right.hbs",
    // Dialogs
    "systems/household/templates/dialog/dialog-actions.hbs"
  ]);
};
