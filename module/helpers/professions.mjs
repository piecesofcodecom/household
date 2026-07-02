import { HOUSEHOLD } from "./config.mjs";
import { CREATION_SOURCE_KEY, CREATION_COMPENDIUM_KEY } from "./settings.mjs";
const { DialogV2 } = foundry.applications.api;

/**
 * Look up an item by bare id (`<id>` from an `Item.<id>` ref) across compendium
 * packs, since `fromUuid("Item.<id>")` only checks the world. Searches the
 * configured creation compendium first, then the premium packs that may hold the
 * given type (or all premium item packs when `type` is unknown). Uses each pack's
 * index to avoid loading documents from packs that don't contain the id.
 * @param {string} id
 * @param {string} [type]
 * @returns {Promise<Item|null>}
 */
async function findItemInPacksById(id, type) {
    const tried = new Set();
    const tryPack = async (pid) => {
        if (!pid || tried.has(pid)) return null;
        tried.add(pid);
        const pack = game.packs.get(pid);
        if (!pack || pack.metadata.type !== 'Item') return null;
        const entry = pack.index.get(id);
        if (!entry) return null;
        if (type && entry.type !== type) return null;
        const doc = await pack.getDocument(id);
        return (doc && (!type || doc.type === type)) ? doc : null;
    };
    let doc = await tryPack(game.settings.get('household', CREATION_COMPENDIUM_KEY));
    if (doc) return doc;
    if (HOUSEHOLD.premium) {
        const suffixes = type
            ? (PREMIUM_PACKS[type] ?? [])
            : [...new Set(Object.values(PREMIUM_PACKS).flat())];
        for (const suffix of suffixes) {
            doc = await tryPack(HOUSEHOLD.premium_name + '.' + suffix);
            if (doc) return doc;
        }
    }
    return null;
}

/**
 * Resolve an item reference to a Document. `ref` is either a UUID (contains a
 * dot) or a legacy item name. UUIDs are resolved via fromUuid; a bare `Item.<id>`
 * that points at a compendium item (fromUuid only checks the world) falls back to
 * a by-id search of the creation/premium packs. Names are looked up by type in
 * world items and the matching premium compendium. `type` is optional — when
 * omitted, the result is returned regardless of its type (used for display).
 * Returns null if unresolved or type-mismatched.
 */
export async function resolveItemRef(ref, type) {
    if (!ref) return null;
    if (ref.includes('.')) {
        const doc = await fromUuid(ref);
        if (doc) return (!type || doc.type === type) ? doc : null;
        if (ref.startsWith('Item.')) return await findItemInPacksById(ref.slice(5), type);
        return null;
    }
    const lower = ref.toLowerCase();
    let doc = game.items.find(el => el.type === type && el.name.toLowerCase() === lower);
    if (doc) return doc;
    if (HOUSEHOLD.premium) {
        const suffix = PREMIUM_PACKS[type]?.[0] ?? 'equipments';
        const pack = game.packs.get(HOUSEHOLD.premium_name + '.' + suffix);
        if (pack) {
            const contents = await pack.getDocuments();
            doc = contents.find(el => el.type === type && el.name.toLowerCase() === lower);
            if (doc) return doc;
        }
    }
    return null;
}

/**
 * Premium compendium packs that may hold each creation item type. Used as a
 * fallback source when reading from the world (see getCreationItems).
 */
const PREMIUM_PACKS = {
    folk: ['character'],
    profession: ['character'],
    vocation: ['character'],
    contract: ['character'],
    companion: ['character', 'equipments'],
    move: ['moves', 'equipments'],
    trait: ['traits']
};

/**
 * Gather the available creation items of a given type for the wizard. Reads from
 * the world's Items directory by default; when the GM sets the creation source
 * to a compendium (settings), that pack is used instead. Premium packs are
 * merged in as a fallback for the world source. De-duplicated by name.
 * @param {string} type  Item type (e.g. "folk", "profession", "vocation")
 * @returns {Promise<Item[]>}
 */
export async function getCreationItems(type) {
    const source = game.settings.get('household', CREATION_SOURCE_KEY);
    const packId = game.settings.get('household', CREATION_COMPENDIUM_KEY);

    if (source === 'compendium' && packId) {
        const pack = game.packs.get(packId);
        if (pack) {
            const docs = await pack.getDocuments();
            return docs.filter(d => d.type === type);
        }
        ui.notifications.warn("Compendium not found: " + packId);
    }

    const collected = game.items.filter(d => d.type === type);
    const seen = new Set(collected.map(d => d.name.toLowerCase()));
    if (HOUSEHOLD.premium) {
        for (const suffix of (PREMIUM_PACKS[type] ?? [])) {
            const pack = game.packs.get(HOUSEHOLD.premium_name + '.' + suffix);
            if (!pack) continue;
            const docs = await pack.getDocuments();
            for (const d of docs) {
                if (d.type === type && !seen.has(d.name.toLowerCase())) {
                    seen.add(d.name.toLowerCase());
                    collected.push(d);
                }
            }
        }
    }
    return collected;
}

function isEmpty(obj) {
    for (var prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            return false;
        }
    }
    return true;
}

/**
 * Copy a source item onto an actor as an embedded item. Returns the created
 * embedded Item (or null on failure), so callers can track its id.
 * @param {Actor} actor
 * @param {string} itemUuid
 * @returns {Promise<Item|null>}
 */
export async function addItem(actor, itemUuid) {
    const item = await fromUuid(itemUuid);
    if (!item || isEmpty(item)) {
        DialogV2.prompt({
            window: { title: "Error", contentClasses: ["household-dialog-class"] },
            content: "<p>Item not found. Make sure you have the item in your world.</p>",
            ok: { label: "Close" }
        });
        return null;
    }
    const [created] = await actor.createEmbeddedDocuments("Item", [{
        name: item.name,
        type: item.type,
        img: item.img,
        system: foundry.utils.duplicate(item.system)
    }]);
    return created ?? null;
}

/**
 * Copy a dropped header item (profession/vocation/folk) onto a character as an
 * embedded item so the sheet can open it, replacing any previous copy of the
 * same type. Returns the created embedded Item. Character-only.
 * @param {Actor} actor
 * @param {Item} item       Source item to copy
 * @param {object} [extra]  Optional overrides merged into the created data (e.g. a
 *                          patched `system` to append a Sprite element note)
 * @returns {Promise<Item|null>}
 */
export async function linkHeaderItem(actor, item, extra = {}) {
    if (actor.type !== 'character') return null;
    const existing = actor.items.filter(i => i.type === item.type).map(i => i.id);
    if (existing.length) await actor.deleteEmbeddedDocuments("Item", existing);
    const [created] = await actor.createEmbeddedDocuments("Item", [{
        name: item.name,
        type: item.type,
        img: item.img,
        system: foundry.utils.duplicate(item.system),
        ...extra
    }]);
    return created ?? null;
}

// Every Field and Skill starts at 1 (see the character DataModel: value
// `initial: 1, min: 1`). Creation contributions are added on top of this base.
const CREATION_BASE = 1;
// Fields are capped at 2 during creation (the original increment logic blocked
// any result of 3+). A Field reaching 2 unlocks the matching suit's Ace.
const FIELD_MAX = 2;

/**
 * Idempotently recompute a character's Field and Skill point allocation from the
 * given profession and vocation. Both start from the base value of 1; Profession
 * and Vocation each add +1 to their Field (capped at 2) and +1 to each Skill they
 * list. Because this recomputes from the base (rather than incrementing the
 * current value), re-running it after a different profession/vocation is chosen
 * yields correct totals with no doubling. A Field reaching 2 sets the matching
 * suit's Ace (and clears it when below 2).
 * @param {Actor} actor
 * @param {Item|null} profession
 * @param {Item|null} vocation
 */
export async function applyCreationPoints(actor, profession, vocation) {
    const update = {};

    // Fields: base 1 + contributions from profession + vocation, capped at 2.
    const fieldHits = {};
    for (const src of [profession, vocation]) {
        const f = src?.system?.field;
        if (f) fieldHits[f.toLowerCase()] = (fieldHits[f.toLowerCase()] ?? 0) + 1;
    }
    for (const key of Object.keys(actor.system.fields)) {
        const value = Math.min(CREATION_BASE + (fieldHits[key] ?? 0), FIELD_MAX);
        update[`system.fields.${key}.value`] = value;
        const suit = HOUSEHOLD.fieldSuits[key];
        if (suit) update[`system.aces.${suit}`] = value >= 2;
    }

    // Skills: base 1 + how many times each skill is listed across both sources.
    const skillHits = {};
    for (const src of [profession, vocation]) {
        for (const s of (src?.system?.skills ?? [])) {
            const key = String(s).trim().toLowerCase();
            if (key) skillHits[key] = (skillHits[key] ?? 0) + 1;
        }
    }
    for (const key of Object.keys(actor.system.skills)) {
        update[`system.skills.${key}.value`] = CREATION_BASE + (skillHits[key] ?? 0);
    }

    await actor.update(update);
}
