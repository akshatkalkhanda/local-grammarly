import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Preserve valid fields when one old or malformed preference cannot be used.
export function recoverSettings(stored, defaults, sanitize) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid settings file.');
  const recovered = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (!Object.hasOwn(stored, key)) continue;
    try { recovered[key] = sanitize({ ...defaults, [key]: stored[key] })[key]; }
    catch (error) { console.warn(`Ignoring invalid setting: ${key}: ${error.message}`); }
  }
  return sanitize(recovered);
}

export async function readSettings(file, defaults, sanitize, legacyFiles = []) {
  for (const candidate of [file, `${file}.bak`, ...legacyFiles]) {
    try {
      const config = recoverSettings(JSON.parse(await readFile(candidate, 'utf8')), defaults, sanitize);
      return { config, migrated: candidate !== file };
    } catch (error) {
      if (error.code !== 'ENOENT') console.warn(`Could not load settings from ${candidate}: ${error.message}`);
    }
  }
  return { config: { ...defaults }, migrated: false };
}

export async function writeSettings(file, config) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(config, null, 2), { mode: 0o600 });
  // The primary file is replaced atomically; the last complete save also remains
  // available as a recovery copy. A backup error must not invalidate the primary.
  await rename(temp, file);
  try { await copyFile(file, `${file}.bak`); }
  catch (error) { console.warn(`Could not back up settings: ${error.message}`); }
}
