/**
 * Open the skill-roll configuration dialog: pick a field, optionally a different
 * skill, a +/- modifier and per-face difficulty, then kick off actor.onSkillRoll.
 * Extracted verbatim from HouseholdActor.dialogRollSkill (which now delegates here).
 * @param {HouseholdActor} actor
 * @param {DOMStringMap|object} dataset  the clicked element's dataset (key/field/label)
 */
export async function openSkillRollDialog(actor, dataset) {
  let guess;

  const skill = actor.system.skills[dataset.key];
  if (dataset.key && skill) {

    skill.label = game.i18n.localize(CONFIG.HOUSEHOLD.skills[dataset.key])
  }
  const fields = actor.system.fields;
  for (const [k, v] of Object.entries(fields)) {
    v.label = game.i18n.localize(CONFIG.HOUSEHOLD.fields[k]) ?? k;
  }
  const templateData = {
    ability: dataset.label,
    skill: skill,
    skill_key: dataset.key,
    fields: fields,
    key: dataset.key,
    field: dataset.field,
    actor: actor,
    //timestamp: msg.timestamp
  };

  const html = await foundry.applications.handlebars.renderTemplate("systems/household/templates/chat/dialog-skill-roll.hbs", templateData);

  const dialog = await foundry.applications.api.DialogV2.wait({
    window: { title: "Roll" },
    content: html,
    classes: ['household', 'dialog-skill-roll'],
    modal: true,
    buttons: [{
      action: "choice",
      label: "HOUSEHOLD.RollAbility.long",
      default: true,
      callback: (event, button, dialog) => {
        const modifier_value = button.form.elements.modifier?.value ? button.form.elements.modifier.value : "0";
        const basic_value = button.form.elements.basic?.value ? button.form.elements.basic.value : "0";
        const critical_value = button.form.elements.critical?.value ? button.form.elements.critical.value : "0";
        const extreme_value = button.form.elements.extreme?.value ? button.form.elements.extreme.value : "0";
        const impossible_value = button.form.elements.impossible?.value ? button.form.elements.impossible.value : "0";
        const data = {
          field: button.form.elements.field.value,
          skill: button.form.elements.skill.value,
          modifier: modifier_value,
          diff: {
            '2': basic_value,
            '3': critical_value,
            '4': extreme_value,
            '5': impossible_value
          }
        }
        actor.onSkillRoll(
          button.form.elements.field.value,
          button.form.elements.skill.value,
          modifier_value, {
          '2': basic_value.replace("x", ""),
          '3': critical_value.replace("x", ""),
          '4': extreme_value.replace("x", ""),
          '5': impossible_value.replace("x", "")
        })
      }
    }],
    position: {
      width: "420",
    },
    render: (event) => {
      // Add event listeners for collapsible headers
      const $html = $(event.target.element);
      $html.find(".collapsible-header").on("click", (event) => {
        const header = event.currentTarget;
        const content = header.nextElementSibling;

        if (content.style.display === "block") {
          content.style.display = "none";
        } else {
          content.style.display = "block";
        }
      });

      $html.find('.difficulty-item').on('mousedown', function (event) {
        // Prevent the default context menu on right-click
        if (event.button === 2) event.preventDefault();

        // Find the input inside the clicked difficulty-item
        const input = $(this).find('.difficulty-option');

        // Get the current input value
        let currentValue = parseInt(input.val().replace('x', '')) || 0;

        // Increase or decrease based on the mouse button
        if (event.button === 0) {
          // Left-click: Increase value
          currentValue++;
        } else if (event.button === 2) {
          // Right-click: Decrease value, but ensure it doesn't go below 0
          currentValue = Math.max(0, currentValue - 1);
        }

        // Update the input value
        input.val(`x${currentValue}`);
      });

      $html.find('.modifier-item').on('mousedown', function (event) {
        // Prevent the default context menu on right-click
        if (event.button === 2) event.preventDefault();

        // Find the input inside the clicked difficulty-item
        const input = $(this).find('.difficulty-option');

        // Get the current input value
        let currentValue = parseInt(input.val());

        // Increase or decrease based on the mouse button
        if (event.button === 0) {
          // Left-click: Increase value not more than +3
          //currentValue++;
          currentValue = Math.min(3, Math.max(0, currentValue + 1));
        } else if (event.button === 2) {
          // Right-click: Decrease value, but ensure it doesn't go below -3
          currentValue = Math.max(-3, currentValue - 1);
        }

        // Update the input value
        input.val(currentValue);
      });

      // Optional: Prevent default context menu entirely (for all right-clicks on the inputs)
      $html.find('.difficulty-item').on('contextmenu', function (event) {
        event.preventDefault();
      });

      $html.find(".skill-select-dropdown").on("change", (event) => {

        const selectedSkill = event.currentTarget.value; // Get the selected skill key
        const input_skill = $html.find('#skill'); // Find the hidden input for skill
        const icon_img = $html.find('.suit-icon'); // Find the icon image element
        if (input_skill.length > 0) {

          input_skill.val(selectedSkill); // Update the hidden input value
          const skill_data = actor.system.skills[selectedSkill];
          if (skill_data) {
            const suit = skill_data.suit;
            const value = skill_data.value;

            $html.find('.value-display span').text(`x${value}`); // Update the skill value display

            icon_img.attr("class", `suit-icon fa-household-${suit}-full`);
          }
        }

      });

      $html.find(".toggle-input").on("change", (event) => {
        const selectedInputId = event.target.id; // Get the ID of the selected input

        // Iterate through all toggle inputs
        $html.find(".toggle-input").each((index, input) => {
          const label = $html.find(`label[for="${input.id}"]`); // Find the associated label
          if (label.length > 0) {
            const img = label.find("img"); // Find the <img> inside the label

            if (img.length > 0) {
              const currentSrc = img.attr("src");
              // Update the image based on whether this input is checked
              if (input.id === selectedInputId) {
                if (!currentSrc.includes('-filled'))
                  img.attr("src", currentSrc.replace('.png', '-filled.png')); // Set checked image for selected input
              } else {
                img.attr("src", currentSrc.replace('-filled', '')); // Reset image for other inputs
              }
            }
          }
        });

      })
    },
  });
}
