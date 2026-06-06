import { skills_list } from "./utils.mjs";

const actionTypeNames = {
  action: "actions",
  bonus: "bonus_actions",
  reaction: "reactions",
  crew: "crew_actions",
  weapon: "weapons",
  spell: "spells",
  active: "active",
  inactive: "inactive"
};

/**
 * Register every Household Handlebars helper. Called once from the `init` hook.
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
    return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper("range", function (n, block) {
    let accum = "";
    for (let i = 0; i < n; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  Handlebars.registerHelper("last", function (array) {
    if (!Array.isArray(array) || array.length === 0) {
      return null;
    }
    return array[array.length - 1];
  });

  // If you need to add Handlebars helpers, here is a useful example:
  Handlebars.registerHelper('toLowerCase', function (str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('doCheck', function (data) {
    if (data) return "checked";
    return "";
  });

  Handlebars.registerHelper('getSuitFromField', function (raw_data) {
    const field = raw_data.trim().toLowerCase();
    if (field === 'society' || field === 'heart') return 'heart';
    if (field === 'academia' || field === 'diamond') return 'diamond';
    if (field === 'war' || field === 'club') return 'club';
    if (field === 'street' || field === 'spade') return 'spade';
    return "empty-set";
  });

  Handlebars.registerHelper('getWeaponTypeIcon', function (raw_data) {
    const type = raw_data.trim().toLowerCase();
    if (type.includes('melee')) return 'fa-hand-back-fist';
    if (type.includes('ranged')) return 'fa-bullseye';
    if (type.includes('dueling')) return 'fa-swords';
    return "empty-set";
  });

  Handlebars.registerHelper('getFieldColor', function (raw_data) {
    const field = raw_data.trim().toLowerCase();
    if (field === 'society' || field === 'heart' || skills_list["society"].includes(field)) return '#fd5c63';
    if (field === 'academia' || field === 'diamond' || skills_list["academia"].includes(field)) return '#7CB9E8';
    if (field === 'war' || field === 'club' || skills_list["war"].includes(field)) return '#32de84';
    if (field === 'street' || field === 'spade' || skills_list["street"].includes(field)) return '#343434';
    return "#343434";
  });

  Handlebars.registerHelper('doCheckIf', function (operand_1, operator, operand_2) {

    let operators = {                     //  {{#when <operand1> 'eq' <operand2>}}
      'eq': (l, r) => l == r,              //  {{/when}}
      'noteq': (l, r) => l != r,
      'gt': (l, r) => (+l) > (+r),                        // {{#when var1 'eq' var2}}
      'gteq': (l, r) => ((+l) > (+r)) || (l == r),        //               eq
      'lt': (l, r) => (+l) < (+r),                        // {{else when var1 'gt' var2}}
      'lteq': (l, r) => ((+l) < (+r)) || (l == r),        //               gt
      'or': (l, r) => l || r,                             // {{else}}
      'and': (l, r) => l && r,                            //               lt
      '%': (l, r) => (l % r) === 0,
      'in': (l, r) => r.split(',').includes(l)                        // {{/when}
    }

    let result = operators[operator](operand_1, operand_2);
    if (result) return "checked";
    return "";
  });

  Handlebars.registerHelper('reduceBy', function (value, rd) {
    return Number(value) - Number(rd);
  });

  Handlebars.registerHelper('increaseBy', function (value, rd) {
    return Number(value) + Number(rd);
  });

  Handlebars.registerHelper("multipleOf", function (value, multipler, options) {
    if ((Number(value) % Number(multipler)) == 0) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  Handlebars.registerHelper('stressPercentage', function (stress) {
    if (!stress || stress.max === 0) {
      return 1;
    }
    const percentage = ((stress.max - stress.value) / stress.max);
    return percentage; // Clamping the value between 0 and 100
  });

  Handlebars.registerHelper('getOpacyDecorum', function (decorum) {
    // Example logic: adjust as needed

    if (decorum == 1) {
      return 1; // Fully opaque
    }
    if (decorum == 2) {
      return 0.7; // Semi-opaque
    }
    if (decorum == 3) {
      return 0.5 // Mostly transparent
    }
    if (decorum == 4) {
      return 0.3 // Mostly transparent
    }
    if (decorum == 5) {
      return 0 // Mostly transparent
    }
  });

  Handlebars.registerHelper("when", function (operand_1, operator, operand_2, options) {
    let operators = {                     //  {{#when <operand1> 'eq' <operand2>}}
      'eq': (l, r) => l == r,              //  {{/when}}
      'noteq': (l, r) => l != r,
      'gt': (l, r) => (+l) > (+r),                        // {{#when var1 'eq' var2}}
      'gteq': (l, r) => ((+l) > (+r)) || (l == r),        //               eq
      'lt': (l, r) => (+l) < (+r),                        // {{else when var1 'gt' var2}}
      'lteq': (l, r) => ((+l) < (+r)) || (l == r),        //               gt
      'or': (l, r) => l || r,                             // {{else}}
      'and': (l, r) => l && r,                            //               lt
      '%': (l, r) => (l % r) === 0,
      'in': (l, r) => r.split(',').includes(String(l))                          // {{/when}}
    }

    let result = operators[operator](operand_1, operand_2);
    if (result) return options.fn(this);
    return options.inverse(this);
  });

  Handlebars.registerHelper('numLoop', function (num, options) {
    let ret = ''

    for (let i = 1, j = num; i <= j; i++) {
      ret = ret + options.fn(i)
    }

    return ret
  });

  Handlebars.registerHelper('hasSuccess', function (obj, options) {
    let initialValue = 0;
    Object.entries(obj).reduce(
      (accumulator, [key, currentValue]) => { obj[key].locked ? initialValue += 1 : 0 },
      {},
    );
    if (initialValue)
      return options.fn(this);
    return options.inverse(this);
  });

  Handlebars.registerHelper('hasNoSuccess', function (obj, options) {
    let initialValue = 0;
    Object.entries(obj).reduce(
      (accumulator, [key, currentValue]) => { !obj[key].locked ? initialValue += 1 : 0 },
      {},
    );
    if (initialValue)
      return options.fn(this);
    return options.inverse(this);
  });

  Handlebars.registerHelper("ifNotEmpty", (input, block) => {
    if (
      input &&
      ((input.length && input.length > 0) || (input.size && input.size > 0))
    ) {
      return block.fn(this);
    }
  });

  Handlebars.registerHelper('trimString', function (str, maxSize) {
    if (str.length > maxSize) {
      return str.substring(0, maxSize) + '...';  // Append ellipsis if truncated
    } else {
      return str;
    }
  });

  Handlebars.registerHelper('ifLength', function (array, length, options) {
    if (array.length === length) {
      return options.fn(this); // block executes
    }
    return options.inverse(this); // else block
  });

  Handlebars.registerHelper("actionTypeName", (type) => {
    const key = actionTypeNames[type] || "other_actions";
    return game.i18n.localize(`HOUSEHOLD.${key}`);
  });

  Handlebars.registerHelper("modifier", (x) => (x < 0 ? x : `+${x}`));

  Handlebars.registerHelper("abilityName", (id) =>
    game.i18n.localize(`HOUSEHOLD.Ability${id.titleCase()}Abbr`)
  );

  Handlebars.registerHelper("firstWord", (str) => str.split(" ")[0]);

  Handlebars.registerHelper('math', function (a, operator, b) {
    a = Number(a);
    b = Number(b);

    switch (operator) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : 0;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  });
}
