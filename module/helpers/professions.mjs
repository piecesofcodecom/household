import { HOUSEHOLD } from "./config.mjs";

async function addMove(actor, itemUuid, _item) {
    addItem(actor, itemUuid)

    //Time to pick vocation
    if (_item.type == 'profession') {
        let collection_vocations = game.items.filter(el => el.type === 'vocation' && el.system.profession.toLowerCase() == _item.name.toLowerCase());
        if(HOUSEHOLD.premium) {
            const packs = game.packs.get(HOUSEHOLD.premium_name+'.character')
            const contents = await packs.getDocuments();
            const compendium_items = contents.filter(el => el.type === 'vocation' && el.system.profession.toLowerCase() == _item.name.toLowerCase())
            if(compendium_items.length>0) {
                collection_vocations = collection_vocations.concat(compendium_items)
            }
        }
        let html = '<form><div class="f-group"><select class="profession-select" id="vocation" name="vocation"><option value"" selected>Select your Vocation</option>';
       
        collection_vocations.forEach(vocation => {
            html += '<option value="'+vocation.uuid+'">'+vocation.name+'</option>';
        })
        html += '</div></select><div id="profession-description-popup" class="description"></div></form>'

        //dialog
        const myDialogOptions = {
            width: 400,
            height: 400,
            classes: ["household-dialog-class"]
          };
        let d = new Dialog({
            title: "Select your Vocation",
            content: html,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: "OK",
                callback: async (html) => {const _item = await fromUuid(html.find("select#vocation").val()); addNewProfession(_item,actor)}
                }
            },
            default: "one",
            options: {
                classes: ["household-dialog-class"]
            },
        }, myDialogOptions);
        d.render(true);
    }
      
}
async function chooseMove(actor, item) {
    let list_moves = item.system.moves.split(',')
    list_moves = list_moves.map(s => s.trim());
    if(item.system.has_companion) {
        let companion = game.items.filter(el => el.type=="companion" && el.name.toLowerCase() ==actor.system.companion.toLowerCase())
        if(HOUSEHOLD.premium) {
            const packs = game.packs.get(HOUSEHOLD.premium_name+'.equipments')
            const contents = await packs.getDocuments();
            const compendium_items = contents.filter(el => el.type === 'companion' && el.name.toLowerCase() ==actor.system.companion.toLowerCase())
            if(compendium_items.length>0) {
                companion = companion.concat(compendium_items)
            }
        }
        if(companion.length > 0) {
            let comp_moves = companion[0].system.moves.split(',')
            list_moves = list_moves.concat(comp_moves)
        }
    }
    list_moves = list_moves.map(s => s.toLowerCase().trim());
    
    let collection_item = game.items.filter(el => el.type == 'move' && list_moves.includes(el.name.toLowerCase()))
    if(HOUSEHOLD.premium) {
        const packs = game.packs.get(HOUSEHOLD.premium_name+'.moves')
        const contents = await packs.getDocuments();
        const compendium_items = contents.filter(el => el.type == 'move' && list_moves.includes(el.name.toLowerCase()))
        if(compendium_items.length>0) {
            collection_item = collection_item.concat(compendium_items)
        }
    }
    const dialog_title = item.system.has_companion ? "Select a Move from your Companion" : "Select a Move from your Profession";
    let html = '<form><div class="f-group"><select class="profession-select" id="move" name="move"><option value"" selected>'+dialog_title+'</option>';
    collection_item.forEach(move => {
        html += '<option value="'+move.uuid+'">'+move.name+'</option>';
    })
    html += '</div></select><div id="profession-description-popup" class="description"></div></form>'
    

    //dialog
    const myDialogOptions = {
        width: 400,
        height: 400,
        classes: ["household-dialog-class"]
      };
    let d = new Dialog({
        title: dialog_title,
        content: html,
        buttons: {
            one: {
            icon: '<i class="fas fa-check"></i>',
            label: "OK",
            callback: (html) => addMove(actor, html.find("select#move").val(), item)
            }
        },
        default: "one",
        options: {
            classes: ["household-dialog-class"]
        },
    }, myDialogOptions);
    d.render(true);

}

async function chooseTrait(actor, item) {
    //validate moves before ask
    let list_traits = item.system.traits.split(',')
    list_traits = list_traits.map(s => s.trim());
    if(item.system.has_companion) {
        const companion = game.items.filter(el => el.type=="companion" && el.name.toLowerCase()==actor.system.companion.toLowerCase())
        if(companion.length > 0) {
            let comp_traits = companion[0].system.traits.split(',')
            comp_traits = comp_traits.map(s => s.trim());
            list_traits = list_traits.concat(comp_traits)
        }
    }
    list_traits = list_traits.map(s => s.toLowerCase().trim());

    let collection = game.items.filter(el => el.type == 'trait' && list_traits.includes(el.name.toLowerCase()))
    if(HOUSEHOLD.premium) {
        const packs = game.packs.get(HOUSEHOLD.premium_name+'.traits')
        const contents = await packs.getDocuments();
        const compendium_items = contents.filter(el => el.type == 'trait' && list_traits.includes(el.name.toLowerCase()))
        if(compendium_items.length>0) {
            collection = collection.concat(compendium_items)
        }
    }
    const dialog_title = item.system.has_companion ? "Select a Trait from your Vocation/Companion" : "Select a Trait from your Vocation";
    let html = '<form><div class="f-group"><select class="profession-select" id="trait" name="trait"><option value"" selected>'+dialog_title+'</option>';
    collection.forEach(trait => {
        html += '<option value="'+trait.uuid+'">'+trait.name+'</option>';
    })
    html += '</div></select><div id="profession-description-popup" class="description"></div></form>'
    
    //dialog
    const myDialogOptions = {
        width: 400,
        height: 400,
        classes: ["household-dialog-class"]
      };
    let d = new Dialog({
        title: dialog_title,
        content: html,
        buttons: {
            one: {
            icon: '<i class="fas fa-check"></i>',
            label: "OK",
            callback: (html) => addItem(actor, html.find("select#trait").val())
            }
        },
        default: "one",
    }, myDialogOptions);
    d.render(true);
}

async function populateField(actor, field) {
    const key = field.toLowerCase();
    const new_value = actor.system.fields[key].value + 1;
    if(new_value < 3 && new_value > 0) {
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
        new Dialog({
            title: "Error",
            content: "<p>Trait not found. Make sure you have the item in your wolrd.</p>",
            buttons: {},
            options: {
                classes: ["household-dialog-class"]
            },
          }).render(true);
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
    return await new Dialog({
        title: "Error",
        content: message,
        buttons: {},
        options: {
            classes: ["household-dialog-class"]
        },
      }).render(true);
}

async function selectCompanion(actor, item) {
    let items = game.items.filter(el => el.type == 'companion' && el.system.profession.toLowerCase()==item.name.toLowerCase())
    if(HOUSEHOLD.premium) {
        const packs = game.packs.get(HOUSEHOLD.premium_name+'.equipments')
        const contents = await packs.getDocuments();
        const compendium_items = contents.filter(el => el.type == 'companion' && el.system.profession.toLowerCase()==item.name.toLowerCase())
        if(compendium_items.length>0) {
            items = items.concat(compendium_items)
        }
    }
    if (items.length == 0) {
        return await raiseError("<p>Trait not found. Make sure you have the item in your wolrd.</p>");

    } else {
        let html = '<form><div class="f-group"><select class="profession-select" id="companion" name="companion"><option value"" selected>Select one</option>';
        items.forEach(companion => {
            html += '<option value="'+companion.uuid+'">'+companion.name+'</option>'
        })
        html += '</div></select><div id="profession-description-popup" class="description"></div></form>'
        const myDialogOptions = {
            width: 400,
            height: 400,
            classes: ["household-dialog-class"]
        };
        let d = new Dialog({
            title: "Select your Animal Companion",
            content: html,
            buttons: {
                one: {
                icon: '<i class="fas fa-check"></i>',
                label: "OK",
                callback: (html) => addCompanion(actor, html.find("select#companion").val(), item)
                }
            },
            default: "one",
            options: {
                classes: ["household-dialog-class"]
            },
        }, myDialogOptions);
        return await d.render(true);

    }
    
}

export async function addProfession(actor, item) {

    if (actor.system.profession.trim() != '') {
        let d = new Dialog({
          title: "New Profession",
          content: `<p>You already have the profession ${actor.system.profession}</p><p>Do you want to proceed and add this new profession ${item.name}?</p>`,
          buttons: {
           one: {
            icon: '<i class="fas fa-check"></i>',
            label: "Yes",
            callback: () => addNewProfession(item, actor)
           }
          },
          default: "one",
          options: {
            classes: ["household-dialog-class"]
        },
         });
         d.render(true);
      } else {
        addNewProfession(item, actor)
      }
}
async function addNewProfession(item, actor) {
    if(item.type == 'profession') {
        await actor.update({ 'system.profession': item.name });
        populateSkills(actor, item.system.skills.split(","));
        populateField(actor, item.system.field);
        let trait_list = item.system.traits.split(",");
        trait_list = trait_list.map(s => s.toLowerCase().trim());
        if(trait_list.length == 1) {
            let trait_item = game.items.filter(el => el.name.toLowerCase() == trait_list[0].toLowerCase() && el.type == 'trait')
            if(HOUSEHOLD.premium) {
                const packs = game.packs.get(HOUSEHOLD.premium_name+'.traits')
                const contents = await packs.getDocuments();
                const compendium_items = contents.filter(el => el.name.toLowerCase() == trait_list[0].toLowerCase() && el.type == 'trait')
                if(compendium_items.length>0) {
                    trait_item = trait_item.concat(compendium_items)
                }
            }
            
            if (trait_item.length > 0)
                addItem(actor, trait_item[0].uuid)
        }
        if (item.system.has_companion) {
            if(item.type == 'profession') {
                await selectCompanion(actor, item)
            }
        } else {
            chooseMove(actor, item)
        }
    } else if (item.type == 'vocation') {
        await actor.update({'system.vocation': item.name})
        populateSkills(actor, item.system.skills.split(","));
        populateField(actor, item.system.field);
        chooseTrait(actor, item)

    }
}

