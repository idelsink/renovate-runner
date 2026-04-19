/**
 * Cross-manager interference tests.
 *
 * MIXED_CONTENT contains all three annotation types. Each entry in the
 * interference table verifies that a manager picks up only its own
 * annotation and does not bleed into the others.
 *
 * `manager` — omit to run extract() across all managers combined.
 * `matches` — per-dep field assertions; empty array means no match expected.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extract, extractWith, MANAGER_CONTAINER_DIGEST, MANAGER_CONTAINER_TAG, MANAGER_VERSION_STRING } from './helpers.mjs';
import dedent from 'dedent';

const DIGEST = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';

const DIGEST_CONTENT = dedent(`
  # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
  APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST}"
`);

const TAG_CONTENT = dedent(`
  # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
  image: registry.example.com/myapp:1.2.3
`);

const VERSION_CONTENT = dedent(`
  # renovate: datasource=github-releases depName=example/myapp
  APP_VERSION="1.2.3"
`);

const MIXED_CONTENT = `${DIGEST_CONTENT}\n${TAG_CONTENT}\n${VERSION_CONTENT}`;

const interference = [
  // all managers combined
  {
    name: 'all managers combined extract exactly 3 deps from mixed content',
    file: 'test.sh', content: MIXED_CONTENT,
    matches: [
      { depName: 'registry.example.com/myapp', currentValue: '1.2.3', currentDigest: DIGEST },
      { depName: 'registry.example.com/myapp', currentValue: '1.2.3', currentDigest: undefined },
      { depName: 'example/myapp',              currentValue: '1.2.3', currentDigest: undefined },
    ],
  },
  // container-digest manager
  {
    name: 'container-digest matches only the digest-pinned line in mixed content',
    manager: MANAGER_CONTAINER_DIGEST, file: 'test.sh', content: MIXED_CONTENT,
    matches: [{ currentValue: '1.2.3', currentDigest: DIGEST }],
  },
  {
    name: 'container-digest does not match a tag-only image line',
    manager: MANAGER_CONTAINER_DIGEST, file: 'test.yaml', content: TAG_CONTENT,
    matches: [],
  },
  {
    name: 'container-digest does not match a plain version string',
    manager: MANAGER_CONTAINER_DIGEST, file: 'test.sh', content: VERSION_CONTENT,
    matches: [],
  },
  // container-tag manager
  {
    name: 'container-tag matches only the tag-only image line in mixed content',
    manager: MANAGER_CONTAINER_TAG, file: 'test.sh', content: MIXED_CONTENT,
    matches: [{ currentValue: '1.2.3', currentDigest: undefined }],
  },
  {
    name: 'container-tag does not match a digest-pinned image line',
    manager: MANAGER_CONTAINER_TAG, file: 'test.sh', content: DIGEST_CONTENT,
    matches: [],
  },
  {
    name: 'container-tag does not match a plain version string',
    manager: MANAGER_CONTAINER_TAG, file: 'test.sh', content: VERSION_CONTENT,
    matches: [],
  },
  // version-string manager
  {
    name: 'version-string matches only the plain version line in mixed content',
    manager: MANAGER_VERSION_STRING, file: 'test.sh', content: MIXED_CONTENT,
    matches: [{ currentValue: '1.2.3', currentDigest: undefined }],
  },
  {
    name: 'version-string does not match a digest-pinned image line',
    manager: MANAGER_VERSION_STRING, file: 'test.sh', content: DIGEST_CONTENT,
    matches: [],
  },
  {
    name: 'version-string does not match a tag-only image line',
    manager: MANAGER_VERSION_STRING, file: 'test.yaml', content: TAG_CONTENT,
    matches: [],
  },
];

describe('cross-manager interference', () => {
  for (const example of interference) {
    it(example.name, () => {
      const deps = example.manager
        ? extractWith(example.manager, example.content, example.file)
        : extract(example.content, example.file);
      assert.equal(deps.length, example.matches.length, `expected ${example.matches.length} match(es), got ${deps.length}`);
      for (const [i, expected] of example.matches.entries()) {
        for (const [key, value] of Object.entries(expected)) {
          assert.deepEqual(deps[i][key], value);
        }
      }
    });
  }
});
