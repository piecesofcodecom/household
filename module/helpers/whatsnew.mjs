/*
* GM-only "What's New" dialog, shown once per system version.
*
* The v14 restructure changed how several items link to each other: fields that
* used to store a typed NAME now store a proper reference (UUID), and some
* free-text fields became drag-and-drop or dropdowns. Existing worlds need a
* one-time migration (the macros under game.household.migrations.*), so this
* dialog nudges the GM to run it. "Don't show again" records the current version
* so it won't reappear; closing/cancel leaves it to show again next load.
*/
const { DialogV2 } = foundry.applications.api;

const SETTING_KEY = "whatsNewVersion";

/** Register the world setting that records the last version whose news was dismissed. */
export function registerWhatsNewSetting() {
  game.settings.register("household", SETTING_KEY, {
    scope: "world",
    config: false,
    type: String,
    default: ""
  });
}

/** Show the dialog if (and only if) a GM hasn't dismissed it for this version. */
export async function showWhatsNew() {
  if (!game.user.isGM) return;
  const version = game.system.version;
  if (game.settings.get("household", SETTING_KEY) === version) return;

  const content = `
    <div class="household-whatsnew">
      <p>This version reworks how several items link to each other. Fields that used to
      store a string now store a proper reference to items. That allows drag-and-drop items and avoid typos.</p>
      <ul>
        <li><strong>Profession / Companion</strong> — moves &amp; traits are set by dropping items onto the sheet.</li>
        <li><strong>Vocation</strong> — its <em>profession</em> is now set by dropping a profession item.</li>
        <li><strong>Folk</strong> — its <em>contract</em> is now set by dropping a contract item.</li>
        <li><strong>Weapon</strong> — <em>skill</em> and <em>field</em> are now chosen from dropdowns.</li>
      </ul>
      <p><strong>Action needed:</strong> your existing items still use the old format. Run the
      migration script once to convert their references. Open the <em>Macros</em> compendium and run
      <strong>"Migrate ALL old items to new Item Model"</strong> or individually.</p>
      <br />
      <strong>BEFORE MIGRATE, ALWAYS MAKE A BACKUP OF YOUR WORLD</strong>
    </div>`;

  await DialogV2.wait({
    window: { title: `Household — What's New (v${version})`, contentClasses: ["household-dialog-class"] },
    position: { width: 560 },
    content,
    buttons: [
      {
        action: "dismiss",
        icon: "fas fa-check",
        label: "Don't show again",
        default: true,
        callback: () => game.settings.set("household", SETTING_KEY, version)
      },
      {
        action: "later",
        icon: "fas fa-clock",
        label: "Remind me later"
      }
    ],
    rejectClose: false
  });
}
