// Assemble the static game hand-in and its deterministic make.fun dossier.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const projectDirectory = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(destination, { recursive: true });
cpSync(join(projectDirectory, 'game'), join(destination, 'game'), { recursive: true });

const sourceShots = join(projectDirectory, 'screenshots');
const outputShots = join(destination, 'screenshots');
mkdirSync(outputShots, { recursive: true });
if (existsSync(sourceShots)) cpSync(sourceShots, outputShots, { recursive: true });

const entryCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const dossier = buildDossier(destination, entryCaps);
writeFileSync(join(destination, 'dossier.json'), dossier);
