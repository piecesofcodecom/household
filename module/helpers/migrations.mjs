/*
* Manual, GM-triggered migration of legacy item references.
*
* Old items stored their related items as NAMES (companion.profession,
* vocation.profession and folk.contract = one name; companion/profession moves
* & traits = comma-separated names), and weapons stored their skill/field as
* free-typed names (now picked as enum keys). The new Item models store UUIDs / enum keys
* instead. These migrations are intentionally NOT run
* automatically on load — worlds may be opened before they are ready to
* migrate. They are shipped as macros (packs/macros) whose commands call
* `game.household.migrations.{companions,professions,all}()`.
*
* Each scans items whose references are still names (not UUIDs), looks them up
* by name (world + premium compendiums, mirroring professions.mjs) and rewrites
* the references to UUIDs. Idempotent and lossless: entries that are already
* UUIDs are left untouched, and names that cannot be resolved are kept as-is so
* a later run can pick them up once the named item exists.
*/
import { HOUSEHOLD } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;

/** Premium compendium suffix used to look up each item type by name. */
const PREMIUM_PACK = {
  profession: "equipments",
  move: "moves",
  trait: "traits",
  contract: "character",
};

/** UUIDs always contain a dot (e.g. "Item.abc", "Compendium.pkg.coll.id"); plain names do not. */
function looksLikeUuid(value) {
  return typeof value === "string" && value.includes(".");
}

/**
 * Resolve an item of a given type by name, searching world items first and the
 * matching premium compendium second.
 * @returns {Promise<string|null>} the item's UUID, or null if not found.
 */
async function resolveUuidByName(type, name) {
  const lower = name.toLowerCase();
  let match = game.items.find((i) => i.type === type && i.name.toLowerCase() === lower);
  if (match) return match.uuid;

  if (HOUSEHOLD.premium && PREMIUM_PACK[type]) {
    const pack = game.packs.get(`${HOUSEHOLD.premium_name}.${PREMIUM_PACK[type]}`);
    if (pack) {
      const contents = await pack.getDocuments();
      match = contents.find((i) => i.type === type && i.name.toLowerCase() === lower);
      if (match) return match.uuid;
    }
  }
  return null;
}

/**
 * Resolve name entries in an array of references to UUIDs. Keeps already-UUID
 * entries and any name that can't be resolved (recorded in `unresolved`).
 * @returns {Promise<{resolved: string[], changed: boolean}>}
 */
async function migrateRefsArray(entries, type, unresolved, label) {
  let changed = false;
  const resolved = [];
  for (const entry of entries) {
    if (looksLikeUuid(entry)) {
      resolved.push(entry);
      continue;
    }
    const uuid = await resolveUuidByName(type, entry);
    if (uuid) {
      resolved.push(uuid);
      changed = true;
    } else {
      resolved.push(entry); // keep the name so a later run can resolve it
      unresolved.push(`${label}: ${type} "${entry}"`);
    }
  }
  return { resolved, changed };
}

/** Migrate the move/trait array fields on an item, returning whether it changed. */
async function migrateItemArrays(item, unresolved) {
  const update = {};
  for (const [key, type] of [["moves", "move"], ["traits", "trait"]]) {
    const entries = item.system[key] ?? [];
    if (!entries.some((e) => !looksLikeUuid(e))) continue; // already all UUIDs
    const { resolved, changed } = await migrateRefsArray(entries, type, unresolved, item.name);
    if (changed) update[`system.${key}`] = resolved;
  }
  return update;
}

async function _migrateCompanions(unresolved) {
  let count = 0;
  for (const companion of game.items.filter((i) => i.type === "companion")) {
    const update = await migrateItemArrays(companion, unresolved);

    // profession: single reference.
    const prof = companion.system.profession;
    if (prof && !looksLikeUuid(prof)) {
      const uuid = await resolveUuidByName("profession", prof);
      if (uuid) update["system.profession"] = uuid;
      else unresolved.push(`${companion.name}: profession "${prof}"`);
    }

    if (Object.keys(update).length > 0) {
      await companion.update(update);
      count++;
    }
  }
  return count;
}

/**
 * The profession now owns the lists of its vocations and companions. Build a
 * profession's `field` list from the items that still point back at it via their
 * legacy `system.profession` (resolving names to UUIDs as needed). Adds only —
 * never removes — so it is idempotent and lossless. Writes into `update`.
 */
async function backfillOwnedRefs(profession, items, field, update) {
  const linked = [];
  for (const item of items) {
    let prof = item.system.profession;
    if (!prof) continue;
    if (!looksLikeUuid(prof)) prof = await resolveUuidByName("profession", prof);
    if (prof === profession.uuid && !linked.includes(item.uuid)) linked.push(item.uuid);
  }
  const existing = profession.system[field] ?? [];
  const merged = [...new Set([...existing, ...linked])];
  if (merged.length !== existing.length) update[`system.${field}`] = merged;
}

async function _migrateProfessions(unresolved) {
  let count = 0;
  const allVocations = game.items.filter((i) => i.type === "vocation");
  const allCompanions = game.items.filter((i) => i.type === "companion");
  for (const profession of game.items.filter((i) => i.type === "profession")) {
    // Only moves/traits are item references; skills are plain keys (no resolve).
    const update = await migrateItemArrays(profession, unresolved);

    // Build the profession's vocations/companions from items pointing back at it.
    await backfillOwnedRefs(profession, allVocations, "vocations", update);
    await backfillOwnedRefs(profession, allCompanions, "companions", update);

    if (Object.keys(update).length > 0) {
      await profession.update(update);
      count++;
    }
  }
  return count;
}

/**
 * Weapons used to store `skill` (and `field`) as free-typed names, which are now
 * picked from dropdowns as enum keys (lowercase). Normalize legacy values to a
 * valid key; values that don't match a known skill/field are reported and left
 * untouched. Idempotent: already-valid keys are skipped.
 */
async function _migrateWeapons(unresolved) {
  let count = 0;
  for (const weapon of game.items.filter((i) => i.type === "weapon")) {
    const update = {};
    for (const [key, valid] of [["skill", HOUSEHOLD.skills], ["field", HOUSEHOLD.fields]]) {
      const value = weapon.system[key];
      if (!value || value in valid) continue; // empty or already a valid key
      const normalized = value.toLowerCase().trim();
      if (normalized in valid) update[`system.${key}`] = normalized;
      else unresolved.push(`${weapon.name}: ${key} "${value}"`);
    }
    if (Object.keys(update).length > 0) {
      await weapon.update(update);
      count++;
    }
  }
  return count;
}

/**
 * Folks used to store their contract as a plain name; it's now a single
 * contract-item UUID (drag-dropped on the sheet). Resolve the legacy name to a
 * UUID (world + premium "character" pack). Idempotent; unresolved names kept.
 */
async function _migrateFolks(unresolved) {
  let count = 0;
  for (const folk of game.items.filter((i) => i.type === "folk")) {
    const update = {};
    const contract = folk.system.contract;
    if (contract && !looksLikeUuid(contract)) {
      const uuid = await resolveUuidByName("contract", contract);
      if (uuid) update["system.contract"] = uuid;
      else unresolved.push(`${folk.name}: contract "${contract}"`);
    }
    if (Object.keys(update).length > 0) {
      await folk.update(update);
      count++;
    }
  }
  return count;
}

async function _migrateVocations(unresolved) {
  let count = 0;
  for (const vocation of game.items.filter((i) => i.type === "vocation")) {
    // Vocations reference traits (no moves field); skills are plain keys.
    const update = await migrateItemArrays(vocation, unresolved);

    // profession: single reference.
    const prof = vocation.system.profession;
    if (prof && !looksLikeUuid(prof)) {
      const uuid = await resolveUuidByName("profession", prof);
      if (uuid) update["system.profession"] = uuid;
      else unresolved.push(`${vocation.name}: profession "${prof}"`);
    }

    if (Object.keys(update).length > 0) {
      await vocation.update(update);
      count++;
    }
  }
  return count;
}

/** Shared runner: GM-guard, confirm, run worker(s), report. */
async function run(label, worker) {
  if (!game.user.isGM) {
    ui.notifications.warn("Only a GM can run the item migration.");
    return;
  }
  const proceed = await DialogV2.confirm({
    window: { title: label, contentClasses: ["household-dialog-class"] },
    content: `<p>Run "${label}"? This converts legacy values on existing items to the new format.</p>`,
  });
  if (!proceed) return;

  const unresolved = [];
  const count = await worker(unresolved);

  ui.notifications.info(`Household: migrated ${count} item(s).`);
  if (unresolved.length > 0) {
    console.warn("Household | Unresolved references during migration:", unresolved);
    ui.notifications.warn(
      `Household: ${unresolved.length} reference(s) could not be resolved and were left as names (see console).`
    );
  }
}

export function migrateCompanions() {
  return run("Migrate Companions to new Item Model", (u) => _migrateCompanions(u));
}

export function migrateProfessions() {
  return run("Migrate Professions to new Item Model", (u) => _migrateProfessions(u));
}

export function migrateVocations() {
  return run("Migrate Vocations to new Item Model", (u) => _migrateVocations(u));
}

export function migrateWeapons() {
  return run("Migrate Weapons to new Item Model", (u) => _migrateWeapons(u));
}

export function migrateFolks() {
  return run("Migrate Folks to new Item Model", (u) => _migrateFolks(u));
}

export function migrateAll() {
  return run("Migrate ALL old items to new Item Model", async (u) => {
    return (
      (await _migrateCompanions(u)) +
      (await _migrateProfessions(u)) +
      (await _migrateVocations(u)) +
      (await _migrateWeapons(u)) +
      (await _migrateFolks(u))
    );
  });
}
