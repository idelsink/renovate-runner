/**
 * Shared helpers for testing customManagers in default.json using Renovate's
 * own extractPackageFile function
 */

import { readFileSync } from 'node:fs';
import JSON5 from 'json5';

// Import Renovate's own extractPackageFile to run the exact same extraction
// logic it uses in production against our customManagers config.
//
// Approach based on: https://www.jvt.me/posts/2024/06/28/renovate-regex-test/
// That article uses: import { extractPackageFile } from 'renovate/dist/modules/manager/custom/regex'
//
// As of Renovate v39+ (Rolldown bundler), the module no longer exports named
// symbols directly. Instead the entire namespace is wrapped under `regex_exports`
// a CJS interop key injected by Rolldown. We therefore import the file and
// pull extractPackageFile out of that wrapper. If a future Renovate upgrade
// breaks this, the guard below will throw a clear message.
const regexMod = await import('renovate/dist/modules/manager/custom/regex/index.js');
if (!regexMod.regex_exports?.extractPackageFile) {
  throw new Error(
    'Could not find extractPackageFile in renovate/dist/modules/manager/custom/regex/index.js. ' +
    'The internal path or export shape may have changed. Update the import in tests/helpers.mjs.'
  );
}
const { extractPackageFile } = regexMod.regex_exports;

// default.json is JSON5 (line comments + trailing commas).
const raw = readFileSync(new URL('../default.json', import.meta.url), 'utf8');

export const config = JSON5.parse(raw);
export const MANAGERS = config.customManagers;

export const MANAGER_CONTAINER_DIGEST = MANAGERS[0];
export const MANAGER_CONTAINER_TAG    = MANAGERS[1];
export const MANAGER_VERSION_STRING   = MANAGERS[2];

/**
 * Run Renovate's regex extraction against the given content string using all
 * customManagers. Returns a merged deps array across all managers.
 */
export function extract(content, filename = 'test-file') {
  return MANAGERS.flatMap(
    manager => extractPackageFile(content, filename, manager)?.deps ?? []
  );
}

/**
 * Run extraction using a specific manager object.
 */
export function extractWith(manager, content, filename = 'test-file') {
  return extractPackageFile(content, filename, manager)?.deps ?? [];
}
