import { HOUSEHOLD } from '../helpers/config.mjs';
import {
  getCreationItems,
  resolveItemRef,
  linkHeaderItem,
  addItem,
  applyCreationPoints
} from '../helpers/professions.mjs';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const ROOT = 'systems/household/templates/actor/creation';

/** Alphabetical sort comparator for option objects with a `name`. */
const byName = (a, b) => a.name.localeCompare(b.name);

/**
 * Tabbed, resumable character-creation wizard. Opened from the character sheet's
 * "Create Char" button. Walks the rulebook order — Folk → Nation → Profession →
 * Vocation — applying each choice to the actor immediately and recording it in
 * `flags.household.creation` so the wizard restores state when reopened.
 *
 * Field/Skill points are recomputed from the chosen profession + vocation on
 * every change (see applyCreationPoints), so re-selecting a step is idempotent.
 */
export class HouseholdCharacterCreation extends HandlebarsApplicationMixin(ApplicationV2) {

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
  }

  /* -------------------------------------------- */
  /*  Configuration                               */
  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    classes: ['household', 'household-creation', 'themed', 'theme-light'],
    tag: 'div',
    window: {
      title: 'HOUSEHOLD.Creation.Title',
      icon: 'fas fa-hat-wizard',
      resizable: true
    },
    position: { width: 720, height: 760 },
    actions: {
      selectFolk: this.prototype._onSelectFolk,
      selectElement: this.prototype._onSelectElement,
      selectNation: this.prototype._onSelectNation,
      selectProfession: this.prototype._onSelectProfession,
      selectCompanion: this.prototype._onSelectCompanion,
      selectMove: this.prototype._onSelectMove,
      selectVocation: this.prototype._onSelectVocation,
      selectTrait: this.prototype._onSelectTrait,
      confirm: this.prototype._onConfirm
    }
  };

  static PARTS = {
    nav: { template: `${ROOT}/creation-nav.hbs` },
    folk: { template: `${ROOT}/creation-folk.hbs`, scrollable: [''] },
    nation: { template: `${ROOT}/creation-nation.hbs`, scrollable: [''] },
    profession: { template: `${ROOT}/creation-profession.hbs`, scrollable: [''] },
    vocation: { template: `${ROOT}/creation-vocation.hbs`, scrollable: [''] }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: 'folk', cssClass: 'folk', label: 'HOUSEHOLD.Creation.Step.Folk' },
        { id: 'nation', cssClass: 'nation', label: 'HOUSEHOLD.Creation.Step.Nation' },
        { id: 'profession', cssClass: 'profession', label: 'HOUSEHOLD.Creation.Step.Profession' },
        { id: 'vocation', cssClass: 'vocation', label: 'HOUSEHOLD.Creation.Step.Vocation' }
      ],
      initial: 'folk'
    }
  };

  get title() {
    return `${game.i18n.localize('HOUSEHOLD.Creation.Title')} — ${this.actor?.name ?? ''}`;
  }

  /* -------------------------------------------- */
  /*  Creation state (flags.household.creation)   */
  /* -------------------------------------------- */

  /** Current creation state (a plain copy we can mutate then persist). */
  get _state() {
    return foundry.utils.deepClone(this.actor.getFlag('household', 'creation') ?? {});
  }

  /** Persist the full creation state object. */
  async _save(state) {
    await this.actor.setFlag('household', 'creation', state);
  }

  /** Delete an embedded item previously granted under a state.grants slot. */
  async _clearGrant(state, key) {
    state.grants ??= {};
    const ids = [].concat(state.grants[key] ?? []).filter(Boolean);
    const toDelete = ids.filter(id => this.actor.items.has(id));
    if (toDelete.length) await this.actor.deleteEmbeddedDocuments('Item', toDelete);
    state.grants[key] = Array.isArray(state.grants[key]) ? [] : null;
  }

  /* -------------------------------------------- */
  /*  Context                                     */
  /* -------------------------------------------- */

  /** Build the active-tab map (mirrors the actor sheet's tab rendering). */
  _getTabs() {
    const active = this.tabGroups?.primary ?? this.constructor.TABS.primary.initial;
    const tabs = {};
    for (const t of this.constructor.TABS.primary.tabs) {
      const isActive = t.id === active;
      tabs[t.id] = { ...t, active: isActive, cssClass: isActive ? 'active' : '' };
    }
    return tabs;
  }

  /** Map an item to the minimal shape the option templates need. */
  _option(item, selectedUuid) {
    return {
      uuid: item.uuid,
      name: item.name,
      img: item.img,
      description: item.system?.description ?? '',
      selected: item.uuid === selectedUuid
    };
  }

  async _prepareContext(options) {
    const state = this._state;
    const context = {
      actor: this.actor,
      state,
      tabs: this._getTabs()
    };

    // --- Folk ---
    const folks = await getCreationItems('folk');
    context.folks = folks.map(f => this._option(f, state.folk)).sort(byName);
    const selectedFolk = state.folk ? await fromUuid(state.folk) : null;
    context.selectedFolk = selectedFolk;
    // The Contract a folk grants (embedded on commit) — shown for reference.
    context.folkContract = selectedFolk
      ? await resolveItemRef(selectedFolk.system.contract, 'contract') : null;
    context.isSprite = !!selectedFolk
      && selectedFolk.name.toLowerCase() === HOUSEHOLD.spriteFolk.toLowerCase();
    context.spriteElements = Object.entries(HOUSEHOLD.spriteElements).map(([key, label]) => ({
      key, label: game.i18n.localize(label), selected: state.element === key
    }));

    // --- Nation ---
    context.nations = Object.entries(HOUSEHOLD.nations).map(([key, cfg]) => ({
      key,
      label: game.i18n.localize(cfg.label),
      place: game.i18n.localize(cfg.place),
      selected: state.nation === key
    }));

    // --- Profession ---
    const professions = await getCreationItems('profession');
    context.professions = professions.map(p => this._option(p, state.profession)).sort(byName);
    const selectedProfession = state.profession ? await fromUuid(state.profession) : null;
    context.selectedProfession = selectedProfession;
    if (selectedProfession) {
      // Field/Skill points this profession will raise by +1 (shown for clarity).
      context.professionPoints = this._pointsPreview(selectedProfession);
      // Auto-granted profession traits (read-only display).
      context.professionTraits = await this._resolveRefList(selectedProfession.system.traits, 'trait');
      // A profession "has a companion" when it lists one or more companions.
      context.hasCompanion = (selectedProfession.system.companions ?? []).length > 0;
      if (context.hasCompanion) {
        context.companions = await this._resolveRefList(
          selectedProfession.system.companions, 'companion', state.companion);
      }
      const companion = state.companion ? await fromUuid(state.companion) : null;
      context.selectedCompanion = companion;
      // A profession with a companion cannot take Profession-specific Moves: its
      // Moves come from the chosen companion instead. Otherwise, from the profession.
      const moveRefs = context.hasCompanion
        ? [...(companion?.system?.moves ?? [])]
        : [...(selectedProfession.system.moves ?? [])];
      context.moves = await this._resolveRefList(moveRefs, 'move', state.move);
      context.selectedMove = state.move ? await fromUuid(state.move) : null;
    }

    // --- Vocation ---
    // Vocations are listed by the profession itself (system.vocations), mirroring
    // the rulebook where a profession's vocations live in its section.
    if (selectedProfession) {
      context.vocations = await this._resolveRefList(
        selectedProfession.system.vocations, 'vocation', state.vocation);
    } else {
      context.vocations = [];
    }
    context.hasProfession = !!selectedProfession;
    const selectedVocation = state.vocation ? await fromUuid(state.vocation) : null;
    context.selectedVocation = selectedVocation;
    if (selectedVocation) {
      // Field/Skill points this vocation will raise by +1.
      context.vocationPoints = this._pointsPreview(selectedVocation);
      // The Trait may be chosen among the Vocation's, or — when the profession has
      // an Animal Companion — among the chosen companion's Traits.
      let traitRefs = [...(selectedVocation.system.traits ?? [])];
      const companion = state.companion ? await fromUuid(state.companion) : null;
      if (companion) traitRefs = traitRefs.concat(companion.system.traits ?? []);
      context.vocationTraits = await this._resolveRefList(traitRefs, 'trait', state.vocationTrait);
      context.selectedVocationTrait = state.vocationTrait ? await fromUuid(state.vocationTrait) : null;
    }

    // OK is enabled only once every required choice is made. A choice that has
    // no options available (e.g. a profession without selectable moves) is not
    // required.
    const folkOk = !!state.folk && (!context.isSprite || !!state.element);
    const companionOk = !context.hasCompanion || !!state.companion;
    const moveOk = (context.moves?.length ?? 0) === 0 || !!state.move;
    const vocationTraitOk = (context.vocationTraits?.length ?? 0) === 0 || !!state.vocationTrait;
    context.complete = folkOk
      && !!state.nation
      && !!selectedProfession
      && companionOk
      && moveOk
      && !!selectedVocation
      && vocationTraitOk;

    return context;
  }

  /**
   * Build the localized Field + Skills an item (profession/vocation) raises by
   * +1, so the wizard can show which characteristics each choice will increase.
   * Mirrors the data applyCreationPoints reads: `system.field` (one key) and
   * `system.skills` (array of skill keys).
   * @param {Item|null} item
   * @returns {{field: string|null, skills: string[]}|null}
   */
  _pointsPreview(item) {
    if (!item) return null;
    const fieldKey = item.system.field?.toLowerCase();
    const field = (fieldKey && HOUSEHOLD.fields[fieldKey])
      ? game.i18n.localize(HOUSEHOLD.fields[fieldKey]) : null;
    const skills = (item.system.skills ?? [])
      .map(s => String(s).trim().toLowerCase())
      .filter(Boolean)
      .map(k => HOUSEHOLD.skills[k] ? game.i18n.localize(HOUSEHOLD.skills[k]) : k);
    return { field, skills };
  }

  /** Resolve a list of refs to option shapes (alphabetical), dropping unresolved ones. */
  async _resolveRefList(refs, type, selectedUuid) {
    const out = [];
    for (const ref of (refs ?? [])) {
      const item = await resolveItemRef(ref, type);
      if (item && !out.some(o => o.uuid === item.uuid)) out.push(this._option(item, selectedUuid));
    }
    return out.sort(byName);
  }

  /* -------------------------------------------- */
  /*  Actions — selection only stages choices     */
  /* -------------------------------------------- */
  /*
   * Clicking an option only *stages* the choice (highlight + expand sub-options
   * + show its description). Nothing is written to the actor until the OK button
   * commits everything in _onConfirm.
   */

  async _onSelectFolk(event, target) {
    const state = this._state;
    if (state.folk !== target.dataset.uuid) state.element = null; // reset on folk change
    state.folk = target.dataset.uuid;
    await this._save(state);
    this.render();
  }

  async _onSelectElement(event, target) {
    const state = this._state;
    state.element = target.dataset.key;
    await this._save(state);
    this.render();
  }

  async _onSelectNation(event, target) {
    const state = this._state;
    state.nation = target.dataset.key;
    await this._save(state);
    this.render();
  }

  async _onSelectProfession(event, target) {
    const state = this._state;
    // Changing profession invalidates the dependent vocation/companion/move picks.
    if (state.profession !== target.dataset.uuid) {
      state.vocation = null;
      state.vocationTrait = null;
      state.companion = null;
      state.move = null;
    }
    state.profession = target.dataset.uuid;
    await this._save(state);
    this.render();
  }

  async _onSelectCompanion(event, target) {
    const state = this._state;
    if (state.companion !== target.dataset.uuid) state.move = null; // move list depends on companion
    state.companion = target.dataset.uuid;
    await this._save(state);
    this.render();
  }

  async _onSelectMove(event, target) {
    const state = this._state;
    state.move = target.dataset.uuid;
    await this._save(state);
    this.render();
  }

  async _onSelectVocation(event, target) {
    const state = this._state;
    if (state.vocation !== target.dataset.uuid) state.vocationTrait = null;
    state.vocation = target.dataset.uuid;
    await this._save(state);
    this.render();
  }

  async _onSelectTrait(event, target) {
    const state = this._state;
    state.vocationTrait = target.dataset.uuid;
    await this._save(state);
    this.render();
  }

  /* -------------------------------------------- */
  /*  Commit (OK)                                 */
  /* -------------------------------------------- */

  /**
   * Apply every staged choice to the actor: embed the folk (+ Sprite element
   * note) and its contract, set homeland, embed profession + auto traits, the
   * chosen companion/move, the vocation + its trait, and recompute Field/Skill
   * points. Idempotent — prior grants are cleared first so re-running with a
   * changed selection yields correct results.
   * @this {HouseholdCharacterCreation}
   */
  async _onConfirm() {
    const state = this._state;
    state.grants ??= {};

    // Clear previously committed grants so a re-commit doesn't duplicate them.
    for (const key of ['contract', 'professionTraits', 'move', 'companion', 'vocationTrait']) {
      await this._clearGrant(state, key);
    }

    // --- Folk (+ Sprite element note) + contract ---
    if (state.folk) {
      const folk = await fromUuid(state.folk);
      if (folk) {
        let extra = {};
        const isSprite = folk.name.toLowerCase() === HOUSEHOLD.spriteFolk.toLowerCase();
        if (isSprite && state.element) {
          const elementLabel = game.i18n.localize(HOUSEHOLD.spriteElements[state.element]);
          const note = `<p><em>${game.i18n.localize('HOUSEHOLD.Creation.ElementNote')}: ${elementLabel}</em></p>`;
          const system = foundry.utils.duplicate(folk.system);
          system.description = (system.description ?? '') + note;
          extra = { system };
        }
        await linkHeaderItem(this.actor, folk, extra);
        await this.actor.update({ 'system.folk': folk.name });
        const contract = await resolveItemRef(folk.system.contract, 'contract');
        if (contract) {
          const created = await addItem(this.actor, contract.uuid);
          state.grants.contract = created?.id ?? null;
        }
      }
    }

    // --- Nation ---
    if (state.nation) {
      await this.actor.update({ 'system.homeland': game.i18n.localize(HOUSEHOLD.nations[state.nation].label) });
    }

    // --- Profession + auto-granted trait(s) ---
    const profession = state.profession ? await fromUuid(state.profession) : null;
    if (profession) {
      await linkHeaderItem(this.actor, profession);
      await this.actor.update({ 'system.profession': profession.name });
      state.grants.professionTraits = [];
      for (const ref of (profession.system.traits ?? [])) {
        const trait = await resolveItemRef(ref, 'trait');
        if (trait) {
          const created = await addItem(this.actor, trait.uuid);
          if (created) state.grants.professionTraits.push(created.id);
        }
      }
    }

    // --- Companion ---
    if (state.companion) {
      const companion = await fromUuid(state.companion);
      if (companion) {
        const created = await addItem(this.actor, companion.uuid);
        state.grants.companion = created?.id ?? null;
        await this.actor.update({ 'system.companion': companion.name });
      }
    }

    // --- Move ---
    if (state.move) {
      const created = await addItem(this.actor, state.move);
      state.grants.move = created?.id ?? null;
    }

    // --- Vocation + its trait ---
    const vocation = state.vocation ? await fromUuid(state.vocation) : null;
    if (vocation) {
      await linkHeaderItem(this.actor, vocation);
      await this.actor.update({ 'system.vocation': vocation.name });
    }
    if (state.vocationTrait) {
      const created = await addItem(this.actor, state.vocationTrait);
      state.grants.vocationTrait = created?.id ?? null;
    }

    // --- Field/Skill points ---
    await applyCreationPoints(this.actor, profession, vocation);

    // Mark creation finished so the sheet hides its "Create Character" button.
    state.completed = true;
    await this._save(state);
    ui.notifications.info(game.i18n.localize('HOUSEHOLD.Creation.Applied'));
    await this.close();
  }

  /* -------------------------------------------- */
  /*  Reset (full undo)                           */
  /* -------------------------------------------- */

  /**
   * Fully undo a committed character creation, returning the actor to a blank
   * slate so the sheet's "Create Character" button reappears. Deletes every item
   * the wizard granted (tracked in `flags.household.creation.grants`) plus the
   * linked folk/profession/vocation copies, resets Field/Skill points to their
   * base (via applyCreationPoints with no sources), clears the header strings the
   * wizard set, and removes the creation flag.
   * @param {Actor} actor
   */
  static async reset(actor) {
    const state = actor.getFlag('household', 'creation') ?? {};
    const grants = state.grants ?? {};

    // Granted items (contract, traits, move, companion, vocation trait) + the
    // linked header copies (folk/profession/vocation), de-duplicated.
    const grantIds = Object.values(grants).flat().filter(Boolean);
    const headerIds = actor.items
      .filter(i => ['folk', 'profession', 'vocation'].includes(i.type))
      .map(i => i.id);
    const toDelete = [...new Set([...grantIds, ...headerIds])].filter(id => actor.items.has(id));
    if (toDelete.length) await actor.deleteEmbeddedDocuments('Item', toDelete);

    // Reset Fields/Skills to base 1 (and clear Aces).
    await applyCreationPoints(actor, null, null);

    // Clear the header strings the wizard populated.
    await actor.update({
      'system.folk': '',
      'system.homeland': '',
      'system.profession': '',
      'system.vocation': '',
      'system.companion': ''
    });

    // Remove creation state → sheet's Create button reappears.
    await actor.unsetFlag('household', 'creation');
  }
}
