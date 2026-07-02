import * as actions from "../../helpers/actions.mjs";
import { isGm } from "../../helpers/utils.mjs";

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

export function characterData(actor, tokenId) {

  const items = {
    "Weapons": actor.items.filter(el => el.type == "weapon"),
    "Moves": actor.items.filter(el => el.type == "move"),
    "Traits": actor.items.filter(el => el.type == "trait"),
    "Contracts": actor.items.filter(el => el.type == "contract"),

  };
  const abilities = getCharAbilities(actor);
  const skills = getCharSkills(actor);

  const decorum_name = "Decent"; //actor.system.decorum
  const decorum_value = actor.system.decorum;
  const ttt = actor.system.ttt;
  const decorum = actor.system.decorum;
  const stress = actor.system.stress;
  let actions = {};
  let threat = {};
  let crucial_boxes = [];
  let conditions = {};
  if (actor.type == "npc" || actor.type == "opponent") {
    actions = actor.system.actions;
    threat = actor.system.threat;
    crucial_boxes = actor.system.crucial_boxes;
  } else {
    conditions = actor.system.conditions;
  }

  // Crucial/danger warning: true when the current stress marker sits on a
  // crucial box. The marked box index mirrors the sheets' fill logic
  // (`max - value`). Characters have a single `danger` position; opponents list
  // positions in `crucial_boxes` (a comma-separated string, e.g. "4, 7").
  const markedBox = stress.max - stress.value;
  let stressCrucial = false;
  if (markedBox > 0) {
    if (actor.type === "character") {
      stressCrucial = markedBox === stress.danger;
    } else {
      stressCrucial = String(crucial_boxes ?? "")
        .split(",")
        .map(s => Number(s.trim()))
        .includes(markedBox);
    }
  }

  return {
    id: tokenId,
    isCharacter: actor.type === 'character',
    name: actor.name,
    profession: actor.system.profession,
    aces: actor.system.aces,
    picture: actor.img,
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
    stressCrucial,
    crucial_boxes,
    conditions
  };
}

/* -------------------------------------------- */
/*  HUD rendering                               */
/* -------------------------------------------- */

function activatePlayerListeners(elem) {
  const sheet = elem.querySelector('#player-character .sheet-open');
  sheet.addEventListener("click", actions.openSheet);
  setupHealthPointsTracker("#current-health");

  const skills = elem.querySelectorAll('#player-character .skill');

  const editvalues = elem.querySelectorAll("#player-character .editValue");
  for (let item of editvalues) {
    item.addEventListener("click", actions.editValue);
  }

  const editInputs = elem.querySelectorAll("#player-character .InputeditValue");
  for (let item of editInputs) {
    item.addEventListener("input", actions.InputeditValue);
  }

  const rollaction = elem.querySelectorAll('#player-character .roll-action');
  for (let item of rollaction) {
    item.addEventListener('click', actions.rollAction);
  }

  const itemActs = elem.querySelectorAll('#player-character .hh-item-act');
  for (let item of itemActs) {
    item.addEventListener('click', actions.rollAction);
  }

  const itemsChat = elem.querySelectorAll('#player-character .item-chat');
  for (let item of itemsChat) {
    item.addEventListener('click', actions.itemChat);
  }

  const itemsOpen = elem.querySelectorAll('#player-character .item-open');
  for (let item of itemsOpen) {
    item.addEventListener('click', actions.openItem);
  }

  const decorum = elem.querySelectorAll('#player-character .decorum');
  const items = elem.querySelectorAll('#player-character .item');
  for (let item of items) {
    item.addEventListener("click", actions.useItem);
  }
  const aces = elem.querySelectorAll('#player-character .aces');
  for (let ace of aces) {

    ace.addEventListener("click", actions.useAce);
  }
  //$(elem).on("click", "#player-character .item", actions.useItem);
  for (let dec of decorum) {
    dec.addEventListener("click", actions.setAttribute);
  }

  for (let skill of skills) {
    skill.addEventListener("click", actions.dialogRollSkill);
  }
  const abilities = elem.querySelectorAll('#player-character .ability')
  for (let ability of abilities) {
    ability.addEventListener("click", actions.rollAbility);
  }
  const actions_menu = elem.querySelector('#player-character .actions-toggle');
  if (actions_menu)
    actions_menu.addEventListener("click", toggleActions);


  const skills_menu = elem.querySelectorAll('#player-character .skills-toggle');
  if (skills_menu)
    skills_menu.forEach(sk => {
      sk.addEventListener("click", toggleSkills);
    });

}

// Single pop-over now holds both Actions and Stats side by side.
function toggleActions(event) {
  event.stopPropagation();
  $(".character-actions").toggleClass("show");
  $(".actions-toggle").toggleClass("active");

  $(".skills-toggle").removeClass("active");
  $(".character-skills").removeClass("show");

}

// Single pop-over now shows all four skill fields side by side.
function toggleSkills(event) {
  event.stopPropagation();
  $(".actions-toggle").removeClass("active");
  $(".character-actions").removeClass("show");

  $(".skills-toggle").toggleClass("active");
  $(".character-skills").toggleClass("show");
}

function setupHealthPointsTracker(element) {
  $(document).on("focus", element, function () {
    this.value = "";
  });

  $(document).on("blur", element, function () {
    this.value = this.dataset.value;
  });

  $(document).on("keyup", element, function (e) {
    if (e.keyCode !== 13) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const actor = game.actors.get(this.dataset.id);
    if (!actor) {
      return;
    }

    const current = this.dataset.value;
    const text = this.value.trim();

    let dmg;
    if (text.startsWith("+") || text.startsWith("-")) {
      dmg = -Number(text);
    } else {
      const num = Number(text);
      dmg = num > current ? -(num - current) : current - num;
    }

    if (!isNaN(dmg)) {
      actor.applyDamage(dmg);
    }
  });
}

export async function renderCharacter() {
  const elem = document.getElementById("player-character");
  if (!elem) return;


  const character = getCharacter();
  if (!character) {
    elem.parentNode.removeChild(elem);
    $("body.game").append('<div id="player-character"></div>');
    return;
  }

  let actor = character;
  if (character instanceof TokenDocument || character instanceof foundry.canvas.placeables.Token) {
    actor = character.actor;
  }

  // Mirror the actor's chosen sheet theme on the HUD: `actor.sheet` resolves the
  // per-actor override → type default, so the HUD follows whichever sheet the
  // player picked. The Garden sheet tags itself with the `garden` class.
  elem.classList.toggle("garden", !!actor?.sheet?.options?.classes?.includes("garden"));
  const data = characterData(actor, character.id);
  if (!data) return;
  let scroll_1 = $('.character-actions-content').scrollTop();
  if (!scroll_1) {
    scroll_1 = $('.npc-actions-content').scrollTop();
  }
  const scroll_2 = $('.character-stats-content').scrollTop();
  const scroll_3 = $('.character-skills-content-society').scrollTop();
  const scroll_4 = $('.character-skills-content-academia').scrollTop();
  const scroll_5 = $('.character-skills-content-war').scrollTop();
  const scroll_6 = $('.character-skills-content-street').scrollTop();
  data["tabs"] = {
    characterSkills: $(".character-skills").length > 0 ? ($(".character-skills").attr("class")).replace("character-skills", "") : "",
    characterStats: $(".character-stats").length > 0 ? ($(".character-stats").attr("class")).replace("character-stats", "") : "",
    skillsToggle: $(".skills-toggle").length > 0 ? ($(".skills-toggle").attr("class")).replace("skills-toggle", "") : "",
    statsToggle: $(".stats-toggle").length > 0 ? ($(".stats-toggle").attr("class")).replace("stats-toggle", "") : "",
    actionsToggle: $(".actions-toggle").length > 0 ? ($(".actions-toggle").attr("class")).replace("actions-toggle", "") : "",
    characterActions: $(".character-actions").length > 0 ? ($(".character-actions").attr("class")).replace("character-actions", "") : "",
  }
  data["tabs"].characterSkills = data["tabs"].characterSkills.trim().replace('undefined', '')
  data["tabs"].characterStats = data["tabs"].characterStats.trim().replace('undefined', '')
  data["tabs"].skillsToggle = data["tabs"].skillsToggle.trim().replace('undefined', '')
  data["tabs"].statsToggle = data["tabs"].statsToggle.trim().replace('undefined', '')
  data["tabs"].actionsToggle = data["tabs"].actionsToggle.trim().replace('undefined', '')
  data["tabs"].characterActions = data["tabs"].characterActions.trim().replace('undefined', '')
  let tpl;


  if (actor.type == "npc" || actor.type == "opponent") {
    tpl = await foundry.applications.handlebars.renderTemplate(
      "systems/household/templates/actor/hud/hud-npc.hbs",
      data
    );
  } else {
    tpl = await foundry.applications.handlebars.renderTemplate(
      "systems/household/templates/actor/hud/hud-character.hbs",
      data
    );
  }

  elem.innerHTML = tpl;
  $('.character-actions-content').scrollTop(scroll_1);
  $('.npc-actions-content').scrollTop(scroll_1);
  $('.character-stats-content').scrollTop(scroll_2);
  $('.character-skills-content-society').scrollTop(scroll_3);
  $('.character-skills-content-academia').scrollTop(scroll_4);
  $('.character-skills-content-war').scrollTop(scroll_5);
  $('.character-skills-content-street').scrollTop(scroll_6);
  activatePlayerListeners(elem);
}
