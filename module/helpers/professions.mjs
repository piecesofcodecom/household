import { HOUSEHOLD } from "./config.mjs";
const { DialogV2 } = foundry.applications.api;

/**
 * Resolve an item reference to a Document. `ref` is either a UUID (contains a
 * dot) or a legacy item name. Names are looked up by type in world items and
 * the matching premium compendium. Returns null if unresolved or type-mismatched.
 */
async function resolveItemRef(ref, type) {
    if (!ref) return null;
    if (ref.includes('.')) {
        const doc = await fromUuid(ref);
        return doc?.type === type ? doc : null;
    }
    const lower = ref.toLowerCase();
    let doc = game.items.find(el => el.type === type && el.name.toLowerCase() === lower);
    if (doc) return doc;
    if (HOUSEHOLD.premium) {
        const suffix = type === 'move' ? 'moves' : type === 'trait' ? 'traits' : 'equipments';
        const pack = game.packs.get(HOUSEHOLD.premium_name + '.' + suffix);
        if (pack) {
            const contents = await pack.getDocuments();
            doc = contents.find(el => el.type === type && el.name.toLowerCase() === lower);
            if (doc) return doc;
        }
    }
    return null;
}

async function addMove(actor, itemUuid, _item) {
    addItem(actor, itemUuid)

    //Time to pick vocation
    if (_item.type == 'profession') {
        // Vocations now reference their profession by UUID; match by resolved name
        // (with legacy name fallback) against the profession just added.
        const professionNameLower = _item.name.toLowerCase();
        let candidates = game.items.filter(el => el.type === 'vocation');
        if (HOUSEHOLD.premium) {
            const packs = game.packs.get(HOUSEHOLD.premium_name + '.character')
            const contents = await packs.getDocuments();
            candidates = candidates.concat(contents.filter(el => el.type === 'vocation'))
        }
        let collection_vocations = [];
        for (const el of candidates) {
            if (await itemMatchesProfession(el, professionNameLower)) collection_vocations.push(el)
        }
        let html = '<form><div class="f-group"><select class="profession-select" id="vocation" name="vocation"><option value"" selected>Select your Vocation</option>';

        collection_vocations.forEach(vocation => {
            html += '<option value="' + vocation.uuid + '">' + vocation.name + '</option>';
        })
        html += '</div></select><div id="profession-description-popup" style="margin-top: 10px;" class="description"></div></form>'

        //dialog
        DialogV2.prompt({
            window: {
                title: "Select your Vocation",
                contentClasses: ["household-dialog-class"]
            },
            content: html,
            ok: {
                icon: "fas fa-check",
                label: "OK",
                callback: async (event, button) => {
                    const _item = await fromUuid(button.form.elements.vocation.value);
                    addNewProfession(_item, actor);
                }
            },
            position: { width: 400, height: 400 },
            render: (event) => {
                const dialog = event.target; // DialogV2
                const dialogElement = dialog.element; // HTMLElement of the dialog
                const professionSelect = dialogElement.querySelector(".profession-select");
                professionSelect?.addEventListener("click", async (e) => {
                    const description = dialogElement.querySelector("#profession-description-popup");
                    const item = await fromUuid(e.currentTarget.value);
                    if (item?.system?.description) {
                        description.innerHTML = item.system.description;
                    }
                });
            }
        });
    }

}
async function chooseMove(actor, item) {
    // The profession's own moves are stored as references (UUIDs, or names on
    // un-migrated items). Gather them plus the companion's, then resolve all.
    let move_refs = [...(item.system.moves ?? [])];
    if (item.system.has_companion) {

        let companion = game.items.filter(el => el.type == "companion" && el.name.toLowerCase() == actor.system.companion.toLowerCase())
        if (HOUSEHOLD.premium) {
            const packs = game.packs.get(HOUSEHOLD.premium_name + '.equipments')
            const contents = await packs.getDocuments();
            const compendium_items = contents.filter(el => el.type === 'companion' && el.name.toLowerCase() == actor.system.companion.toLowerCase())

            if (compendium_items.length > 0) {
                companion = companion.concat(compendium_items)
            }
        }
        if (companion.length > 0) {
            move_refs = move_refs.concat(companion[0].system.moves ?? [])
        }
    }

    let collection_item = [];
    for (const ref of move_refs) {
        const moveItem = await resolveItemRef(ref, 'move');
        if (moveItem && !collection_item.some(m => m.uuid === moveItem.uuid)) {
            collection_item.push(moveItem);
        }
    }
    const dialog_title = item.system.has_companion ? "Select a Move from your Companion" : "Select a Move from your Profession";
    let html = '<form><div class="f-group"><select class="profession-select" id="move" name="move"><option value"" selected>' + dialog_title + '</option>';
    collection_item.forEach(move => {
        html += '<option value="' + move.uuid + '">' + move.name + '</option>';
    })
    html += '</div></select><div id="profession-description-popup" style="margin-top: 10px;"  class="description"></div></form>'


    //dialog
    DialogV2.prompt({
        window: {
            title: dialog_title,
            contentClasses: ["household-dialog-class"]
        },
        content: html,
        ok: {
            icon: "fas fa-check",
            label: "OK",
            callback: (event, button) => addMove(actor, button.form.elements.move.value, item)
        },
        position: { width: 400, height: 400 },
        render: (event) => {
            const dialog = event.target; // DialogV2
            const dialogElement = dialog.element; // HTMLElement of the dialog
            const professionSelect = dialogElement.querySelector(".profession-select");
            professionSelect?.addEventListener("click", async (e) => {
                const description = dialogElement.querySelector("#profession-description-popup");
                const item = await fromUuid(e.currentTarget.value);
                if (item?.system?.description) {
                    description.innerHTML = item.system.description;
                }
            });
        }
    });

}

async function chooseTrait(actor, item) {
    // The vocation's own traits are stored as references (UUIDs, or names on
    // un-migrated items). Gather them plus the companion's, then resolve all.
    let trait_refs = [...(item.system.traits ?? [])];
    if (item.system.has_companion) {
        const companion = game.items.filter(el => el.type == "companion" && el.name.toLowerCase() == actor.system.companion.toLowerCase())
        if (companion.length > 0) {
            trait_refs = trait_refs.concat(companion[0].system.traits ?? [])
        }
    }

    let collection = [];
    for (const ref of trait_refs) {
        const traitItem = await resolveItemRef(ref, 'trait');
        if (traitItem && !collection.some(t => t.uuid === traitItem.uuid)) {
            collection.push(traitItem);
        }
    }
    const dialog_title = item.system.has_companion ? "Select a Trait from your Vocation/Companion" : "Select a Trait from your Vocation";
    let html = '<form><div class="f-group"><select class="profession-select" id="trait" name="trait"><option value"" selected>' + dialog_title + '</option>';
    collection.forEach(trait => {
        html += '<option value="' + trait.uuid + '">' + trait.name + '</option>';
    })
    html += '</div></select><div id="profession-description-popup" style="margin-top: 10px;" class="description"></div></form>'

    //dialog
    DialogV2.prompt({
        window: {
            title: dialog_title,
            contentClasses: ["household-dialog-class"]
        },
        content: html,
        ok: {
            icon: "fas fa-check",
            label: "OK",
            callback: (event, button) => addItem(actor, button.form.elements.trait.value)
        },
        position: { width: 400, height: 400 },
        render: (event) => {
            const dialog = event.target; // DialogV2
            const dialogElement = dialog.element; // HTMLElement of the dialog
            const professionSelect = dialogElement.querySelector(".profession-select");
            professionSelect?.addEventListener("click", async (e) => {
                const description = dialogElement.querySelector("#profession-description-popup");
                const item = await fromUuid(e.currentTarget.value);
                if (item?.system?.description) {
                    description.innerHTML = item.system.description;
                }
            });
        }
    });
}

async function populateField(actor, field) {
    const key = field.toLowerCase();
    const new_value = actor.system.fields[key].value + 1;
    if (new_value < 3 && new_value > 0) {
        await actor.update({ [`system.fields.${key}.value`]: new_value })
        if (new_value == 2) {
            await actor.update({ [`system.aces.${actor.system.fields[key].suit}`]: true })
        }
    }
}

function populateSkills(actor, skills) {
    skills = skills.map(s => s.trim());
    let new_value = actor.system.skills;
    skills.forEach(skill => {
        const sk = skill.toLowerCase()
        new_value[sk].value = actor.system.skills[sk].value + 1;

    })
    actor.update({ 'system.skills': new_value })
}

function isEmpty(obj) {
    for (var prop in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            return false;
        }
    }
    return true
}

async function addItem(actor, itemUuid) {
    const item = await fromUuid(itemUuid)
    if (isEmpty(item)) {
        DialogV2.prompt({
            window: {
                title: "Error",
                contentClasses: ["household-dialog-class"]
            },
            content: "<p>Trait not found. Make sure you have the item in your world.</p>",
            ok: { label: "Close" }
        });
    } else {
        let newItemData = {
            name: item.name,
            type: item.type,
            img: item.img,
            system: foundry.utils.duplicate(item.system)
        }
        await actor.createEmbeddedDocuments("Item", [newItemData]);
    }
}

async function addCompanion(actor, itemId, item) {
    const companion = await fromUuid(itemId)
    actor.update({ 'system.companion': companion.name })
    chooseMove(actor, item)

}

async function raiseError(message) {
    return await DialogV2.prompt({
        window: {
            title: "Error",
            contentClasses: ["household-dialog-class"]
        },
        content: message,
        ok: { label: "Close" }
    });
}

/**
 * Whether an item (companion or vocation) belongs to a given profession. These
 * now store their profession as a UUID; resolve it and compare names. Falls back
 * to a direct name comparison for legacy (un-migrated) name-based values.
 */
async function itemMatchesProfession(item, professionNameLower) {
    const prof = item.system.profession;
    if (!prof) return false;
    if (!prof.includes('.')) return prof.toLowerCase() == professionNameLower; // legacy name
    const resolved = await fromUuid(prof);
    return resolved?.name?.toLowerCase() == professionNameLower;
}

async function selectCompanion(actor, item) {
    const professionNameLower = item.name.toLowerCase();
    let candidates = game.items.filter(el => el.type == 'companion')
    if (HOUSEHOLD.premium) {
        const packs = game.packs.get(HOUSEHOLD.premium_name + '.equipments')
        const contents = await packs.getDocuments();
        candidates = candidates.concat(contents.filter(el => el.type == 'companion'))
    }
    let items = [];
    for (const el of candidates) {
        if (await itemMatchesProfession(el, professionNameLower)) items.push(el)
    }
    if (items.length == 0) {
        return await raiseError("<p>Trait not found. Make sure you have the item in your wolrd.</p>");

    } else {
        let html = '<form><div class="f-group"><select class="profession-select" id="companion" name="companion"><option value"" selected>Select one</option>';
        items.forEach(companion => {
            html += '<option value="' + companion.uuid + '">' + companion.name + '</option>'
        })
        html += '</div></select><div id="profession-description-popup" style="margin-top: 10px;"  class="description"></div></form>'
        return await DialogV2.prompt({
            window: {
                title: "Select your Animal Companion",
                contentClasses: ["household-dialog-class"]
            },
            content: html,
            ok: {
                icon: "fas fa-check",
                label: "OK",
                callback: (event, button) => addCompanion(actor, button.form.elements.companion.value, item)
            },
            position: { width: 400, height: 400 },
            render: (event) => {
                const dialog = event.target; // DialogV2
                const dialogElement = dialog.element; // HTMLElement of the dialog
                const professionSelect = dialogElement.querySelector(".profession-select");
                professionSelect?.addEventListener("click", async (e) => {
                    const description = dialogElement.querySelector("#profession-description-popup");
                    const item = await fromUuid(e.currentTarget.value);
                    if (item?.system?.description) {
                        description.innerHTML = item.system.description;
                    }
                });
            }
        });

    }

}

/**
 * Copy a dropped header item (profession/vocation/folk) onto a character as an
 * embedded item so the sheet can open it, replacing any previous copy of the
 * same type. Character-only; opponents don't show these header links.
 */
export async function linkHeaderItem(actor, item) {
    if (actor.type !== 'character') return;
    const existing = actor.items.filter(i => i.type === item.type).map(i => i.id);
    if (existing.length) await actor.deleteEmbeddedDocuments("Item", existing);
    await actor.createEmbeddedDocuments("Item", [{
        name: item.name,
        type: item.type,
        img: item.img,
        system: foundry.utils.duplicate(item.system)
    }]);
}

export async function addProfession(actor, item) {

    if (actor.system.profession.trim() != '') {
        DialogV2.confirm({
            window: {
                title: "New Profession",
                contentClasses: ["household-dialog-class"]
            },
            content: `<p>You already have the profession ${actor.system.profession}</p><p>Do you want to proceed and add this new profession ${item.name}?</p>`,
            yes: {
                icon: "fas fa-check",
                label: "Yes",
                callback: () => addNewProfession(item, actor)
            },
            render: (event) => {
            }
        });
    } else {
        addNewProfession(item, actor)
    }
}
export async function addVocation(actor, item) {

    if (actor.system.vocation.trim() != '') {
        DialogV2.confirm({
            window: {
                title: "New Vocation",
                contentClasses: ["household-dialog-class"]
            },
            content: `<p>You already have the vocation ${actor.system.vocation}</p><p>Do you want to proceed and add this new vocation ${item.name}?</p>`,
            yes: {
                icon: "fas fa-check",
                label: "Yes",
                callback: () => addNewProfession(item, actor)
            },
            render: (event) => {
            }
        });
    } else {
        addNewProfession(item, actor)
    }
}
async function addNewProfession(item, actor) {
    if (item.type == 'profession') {
        await actor.update({ 'system.profession': item.name });
        await linkHeaderItem(actor, item);
        populateSkills(actor, item.system.skills);
        populateField(actor, item.system.field);
        // Profession traits are now stored as references (UUIDs / legacy names).
        // When the profession grants exactly one trait, auto-add it.
        const trait_refs = item.system.traits ?? [];
        if (trait_refs.length == 1) {
            const trait_item = await resolveItemRef(trait_refs[0], 'trait');
            if (trait_item)
                addItem(actor, trait_item.uuid)
            else {
                ui.notifications.warn("Trait not found: " + trait_refs[0])
            }
        }
        if (item.system.has_companion) {
            if (item.type == 'profession') {
                await selectCompanion(actor, item)
            }
        } else {
            chooseMove(actor, item)
        }
    } else if (item.type == 'vocation') {
        await actor.update({ 'system.vocation': item.name })
        await linkHeaderItem(actor, item);
        populateSkills(actor, item.system.skills);
        populateField(actor, item.system.field);
        chooseTrait(actor, item)

    }
}

