import { isGm } from "../helpers/utils.mjs";

export function getCharacter() {
  if (isGm() && canvas.tokens?.placeables.length > 0) {
    const tokens = canvas.tokens.controlled;

    if (tokens.length === 0 || tokens.length > 1) return null;
    //alert("adsd")
    const token = tokens[0];
    return token;
    //return game.actors.get(token.document.actorId);
  }

  let character = game.users.get(game.userId).character;
  if (!character) {
    for (let actor of Array.from(game.actors.values())) {
      if (actor.owner) {
        character = actor;
        break;
      }
    }
  }

  return character;
}

function getCharSkills(actor) {
  const skills = [];
  if (actor.type == "character") {
    const fields = Object.keys(actor.system.skills);
    for (let skill of fields) {
      let ab = {
        "name": skill, // game.i18n.localize(`HOUSEHOLD.Field.${field}.long`),
        "ab": skill,
        "mod": actor.system.skills[skill].value,
        "value": actor.system.skills[skill].value,
        "field": actor.system.skills[skill].field,
        "label": skill,
        "suit": actor.system.skills[skill].suit,
        "id": skill
      }
      skills.push(ab)
    }
  }
  return skills;
}

function getCharAbilities(actor) {
  const abilities = [];
  if (actor.type == "character") {
    const fields = Object.keys(actor.system.fields);
    for (let field of fields) {
      let ab = {
        "name": field, // game.i18n.localize(`HOUSEHOLD.Field.${field}.long`),
        "ab": field,
        "mod": actor.system.fields[field].value,
        "value": actor.system.fields[field].value,
        "suit": actor.system.fields[field].suit,
        "id": field
      }
      abilities.push(ab)
    }
  }
  return abilities;
}

function getCharActions(c) {
  const attack_items = [];
    const spell_actions = [];
  if (c.type == "character") {
    for (let action of c.system.attack_items) {
      let bad = false;
      let bac = true;
      if (action.system.type == "throwing") {
        bad = true;
      }
      attack_items.push({
        "id": action.id,
        "img": action.img,
        "name": action.name,
        "bad": bad,
        "bac": bac,
        "bad_bonus": c.system.mod_destreza >=0 ? ` + ${c.system.mod_destreza}` : ` ${c.system.mod_destreza}`,
        "bac_bonus": c.system.mod_forca >=0 ? ` + ${c.system.mod_forca}` : ` ${c.system.mod_forca}`,
        "damage": action.system.damage
      })
    }
    for (let spell of c.system.spell_items) {
      spell_actions.push({
        "id": spell.id,
        "img": spell.img,
        "name": spell.name
      })
    }
    attack_items.push({
      "id": "desarmado",
      "img": "/systems/olddragon2e/assets/icons/unarmed.svg",
      "name": "Desarmado",
      "bad": false,
      "bac": true,
      "bad_bonus": c.system.mod_destreza >=0 ? `+ ${c.system.mod_destreza}` : `${c.system.mod_destreza}`,
      "bac_bonus": c.system.mod_forca >=0 ? `+ ${c.system.mod_forca}` : `${c.system.mod_forca}`,
      "damage": "nocaute",
      "title": "Rolar chance de nocaute"
  })
  } else {
    const items = c.items.filter(el => el.type === "monster_attack");
    for (let item of items) {
      attack_items.push({
        "id": item.id,
        "img": item.img,
        "name": item.name,
        "bad": false,
        "bac": false,
        "ba": true,
        "bad_bonus": 0,
        "ba_bonus": Number(item.system.ba) > -1 ? `+ ${item.system.ba}` : `${item.system.ba}`,
        "bac_bonus": 0,
        "damage": item.system.damage_description
      })

    }
  }

  let actions = {};
  if (spell_actions.length > 0) {
    actions["spell"] = spell_actions;  
  }
  if (attack_items.length > 0) {
    actions["weapon"] = attack_items;
  }
  return actions;
}

function getItems(c) {
  const items = Array.from(c.items.filter(el => ["weapon", "armor", "item"].includes(el.type)));
  const final_items = {
    active: [],
    inactive: []
  };
  for (let i = 0; i < items.length; i++) {
    if (items[i].system.header.active) {
      final_items.active.push({
        "name": items[i].name,
        "id": items[i].id,
        "img": items[i].img,
      })
    } else {
      final_items.inactive.push({
       "name": items[i].name,
        "id": items[i].id,
        "img": items[i].img,
      })

    }

  }
  return final_items;
}

export function characterData(c, tokenId) {
  
  const items = {
    "Weapons": c.items.filter(el => el.type == "weapon"),
    "Moves": c.items.filter(el => el.type == "move"),
    "Traits": c.items.filter(el => el.type == "trait"),
    "Contracts": c.items.filter(el => el.type == "contract"),
    
  };
  const abilities = getCharAbilities(c);
  const skills = getCharSkills(c);

  const decorum_name = "Decent"; //c.system.decorum
  const decorum_value = c.system.decorum;
  const ttt = c.system.ttt;
  const decorum = c.system.decorum;
  const stress = c.system.stress;
  let actions = {};
  let threat = {};
  let crucial_boxes = [];
  let conditions = {};
  if (c.type == "npc") {
    actions = c.system.actions;
    threat = c.system.threat;
    crucial_boxes = c.system.crucial_boxes;
  } else {
    conditions = c.system.conditions;
  }

  return {
    id: tokenId,
    isCharacter: c.type === 'character',
    name: c.name,
    profession: c.system.profession,
    aces: c.system.aces,
    picture: c.img,
    actions,
    abilities,
    skills,
    items,
    decorum_name,
    decorum,
    actions,
    ttt,
    threat,
    stress,
    crucial_boxes,
    conditions
  };
}

