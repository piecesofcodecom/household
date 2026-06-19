// Compile compendium pack sources (JSON) into LevelDB packs under packs/.
// Sources live in src/packs/<name>/ (one JSON file per document, each with a
// "_key" of the form "!<collection>!<id>"); the compiled LevelDB goes to
// packs/<name>/, which is what system.json ships.
//
// We write the LevelDB directly with classic-level (the same store Foundry
// uses) instead of the Foundry CLI's compilePack(): under recent Node versions
// compilePack throws "Iterator is not open: cannot call all() after close()".
const fs = require('fs');
const path = require('path');
const { ClassicLevel } = require('classic-level');

const PACKS = [
  { name: 'macros' },
];

async function buildPack(name) {
  const srcDir = path.join(__dirname, 'src', 'packs', name);
  const destDir = path.join(__dirname, 'packs', name);

  const files = fs.readdirSync(srcDir).filter((f) => f.endsWith('.json'));
  const db = new ClassicLevel(destDir, { keyEncoding: 'utf8', valueEncoding: 'json' });
  await db.open();
  await db.clear(); // rebuild cleanly, dropping any stale entries
  for (const file of files) {
    const doc = JSON.parse(fs.readFileSync(path.join(srcDir, file), 'utf8'));
    const key = doc._key;
    if (!key) throw new Error(`Missing "_key" in src/packs/${name}/${file}`);
    delete doc._key; // _key is the LevelDB key, not part of the stored document
    await db.put(key, doc);
  }
  await db.close();
  console.log(`Compiled pack "${name}" (${files.length} doc(s)) -> packs/${name}`);
}

async function buildPacks() {
  for (const { name } of PACKS) {
    await buildPack(name);
  }
}

buildPacks().catch((err) => {
  console.error('Erro ao compilar packs:', err);
  process.exit(1);
});
