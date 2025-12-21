# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is an unofficial Foundry VTT game system implementation for the **Household RPG** by Two Little Mice. The system is built for Foundry VTT v11+ (verified up to v12.331) and is currently being migrated to support v13 on the `support-v13` branch.

## Build Commands

### Development
```bash
npm run build        # Build both CSS and JS
npm run build-css    # Compile SCSS to CSS
npm run build-js     # Bundle JS with Rollup
npm run watch        # Watch SCSS changes and auto-compile
npm run dev          # Run development build script
```

### Production
```bash
npm run minify       # Minify both CSS and JS
npm run minify-css   # Minify CSS with PostCSS
npm run minify-js    # Minify JS with Terser
npm run build-all    # Build and minify everything
npm run release      # Create release bundle in ./release/
```

### Utility
```bash
npm run normalize-eol  # Normalize line endings
```

## Architecture

### System Entry Point
- **module/household.mjs**: Main system file that registers document classes, sheet applications, Handlebars helpers, and hooks
  - Registers `HouseholdActor` for both character and NPC types
  - Registers `HouseholdActorSheet` and `HouseholdNPCActorSheet` using Foundry v2 sheet API
  - Registers `HouseholdItemSheet` for all item types
  - Sets up custom dice integration with Dice So Nice module (required dependency)

### Document Classes
- **module/documents/actor.mjs**: `HouseholdActor` - extends base Actor with custom roll mechanics and stress/skill management
- **module/documents/item.mjs**: `HouseholdItem` - extends base Item

### Data Models
- **module/data/**: Contains data model classes
  - `character.mjs`: Character-specific data model
  - `base-model.mjs`: Base model for shared functionality

### Sheet Classes (Foundry v2 API)
- **module/sheets/actor-sheet.mjs**: `HouseholdActorSheet` - character sheet using `ActorSheetV2` and `HandlebarsApplicationMixin`
- **module/sheets/actor-npc-sheet.mjs**: `HouseholdNPCActorSheet` - NPC/opponent sheet
- **module/sheets/item-sheet.mjs**: `HouseholdItemSheet` - item sheet for all item types
- **module/sheets/actor-hud.mjs**: Custom HUD overlay for character/token display

All sheets use Foundry VTT's v2 Application API with static `DEFAULT_OPTIONS`, `PARTS`, and `TABS` configuration.

### Helpers
- **module/helpers/actions.mjs**: UI action handlers (rolls, item usage, character interactions)
- **module/helpers/config.mjs**: System configuration constants (HOUSEHOLD object)
- **module/helpers/effects.mjs**: Active effects management
- **module/helpers/professions.mjs**: Profession/vocation application logic
- **module/helpers/templates.mjs**: Handlebars template preloading
- **module/helpers/utils.mjs**: Utility functions (isGm, capitalizeFirstLetter, skills_list)

### Templates
- **templates/actor/**: Actor sheet templates (character, NPC, HUD)
  - Uses parts-based structure: `parts/actor-header.hbs`, `parts/actor-tabs-nav.hbs`, etc.
- **templates/item/**: Item sheet templates
- **templates/chat/**: Chat message templates for dice rolls and skill checks
- **templates/dialog/**: Dialog templates

### Styles
- **src/scss/**: Source SCSS files
  - `household.scss`: Main entry point
  - `components/`: Component-specific styles (_hud.scss, _npcsheetlight.scss, etc.)
  - `global/`: Global styles and variables
  - `dialogs/`: Dialog styles
- Compiled to **css/household.css** and minified to **styles/household.css**

### Data Structure
- **template.json**: Defines actor and item data schemas
  - Actor types: `character`, `npc`
  - Item types: `item`, `gadget`, `weapon`, `move`, `contract`, `trait`, `profession`, `vocation`, `companion`, `folk`
  - Character has fields (society/heart, academia/diamond, war/club, street/spade) and 20 skills across these fields
  - Stress system with current/max/danger tracking
  - Aces system (club, heart, diamond, spade, joker)
  - Conditions system (embarrassed, confused, hurt, frightened, tired, sick, poisoned, broken)
  - Decorum tracking (0-5)

## Game Mechanics Implementation

### Dice System
- Uses custom d6 dice with special faces for Household RPG
- Integrates with Dice So Nice module (required dependency) for 3D dice rolling
- Custom dice presets registered in `household.mjs` at lines 878-951
- Two dice systems: "household" (default) and "household-garden" (premium)
- Custom `HHDice` class extends `foundry.dice.terms.Die`

### Skill Rolls
- Skills are grouped into 4 fields (society, academia, war, street)
- Each field corresponds to a suit (heart, diamond, club, spade)
- Roll mechanics support: re-rolls, free re-rolls, and "all-in" rolls
- Success levels: basic, critical, extreme, impossible, jackpot
- Interactive chat cards allow selecting field, difficulty, and modifiers after rolling

### Chat Message System
- Custom chat cards with interactive elements (stored in `message.flavor` as HTML)
- Supports dice pool tracking, success evaluation, and re-roll buttons
- Chat messages use `flags.household.customCss` to identify custom formatting
- DOM manipulation for updating roll state without creating new messages

### Character HUD
- Custom overlay HUD rendered at `#player-character` div
- Shows character stress, actions, stats, skills
- Refreshes on token control, actor updates, and item changes
- Only visible to non-GM players for their controlled character
- GM sees special view when controlling tokens

## Important Notes

### V2 Sheet Migration
The system is migrating from Foundry v1 to v2 sheet API:
- Old v1 code exists in `actor-sheetv1.mjs` but is commented out in `household.mjs`
- New sheets extend `ActorSheetV2` with `HandlebarsApplicationMixin`
- Use static properties: `DEFAULT_OPTIONS`, `PARTS`, `TABS`
- Form submission uses `_onSubmitForm` instead of `_updateObject`
- Context preparation uses `_prepareContext` and `_preparePartContext`

### Foundry Version Support
- Currently on `support-v13` branch for Foundry VTT v13 compatibility
- Main branch targets v11-v12
- Check `system.json` for verified compatibility version

### Handlebars Helpers
The system registers extensive custom Handlebars helpers in `household.mjs`:
- `ifEquals`, `when`: Conditional logic
- `getSuitFromField`, `getFieldColor`: Field/suit mapping and styling
- `stressPercentage`, `getOpacyDecorum`: Visual calculations
- `hasSuccess`, `hasNoSuccess`: Dice poll evaluation
- `actionTypeName`: Localized action type names
- `trimString`, `numLoop`, `range`: Utility helpers

### Premium Module
The system checks for optional `household-premium` module and sets `HOUSEHOLD.premium = true` if active (line 89-92 in household.mjs).

### Localization
Supports multiple languages via `lang/` directory:
- English (en.json)
- Italian (it.json)
- Portuguese Brazilian (pt-BR.json)
