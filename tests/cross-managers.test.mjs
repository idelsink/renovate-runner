/**
 * Cross-manager interference tests.
 *
 * A single content block contains all three annotation types. Each test
 * verifies that every manager picks up exactly its own annotations and does
 * not bleed into the others.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extract, extractWith, MANAGER_CONTAINER_DIGEST, MANAGER_CONTAINER_TAG, MANAGER_VERSION_STRING } from './helpers.mjs';
import dedent from 'dedent';

const MIXED_CONTENT = dedent(`
  # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
  APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"

  # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
  image: registry.example.com/myapp:1.2.3

  # renovate: datasource=github-releases depName=example/myapp
  APP_VERSION="1.2.3"
`);

describe('combined manager (no interference)', () => {
  it('extracts exactly 3 deps total across all managers', () => {
    const deps = extract(MIXED_CONTENT, 'test.sh');
    assert.equal(deps.length, 3, `expected 3 deps, got ${deps.length}: ${JSON.stringify(deps.map(d => d.depName))}`);
  });

  describe('container-digest manager', () => {
    it('matches only the digest-pinned line', () => {
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, MIXED_CONTENT, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      assert.equal(deps[0].currentValue, '1.2.3');
      assert.equal(deps[0].currentDigest, 'sha256:0000000000000000000000000000000000000000000000000000000000000000');
    });

    it('does not match the tag-only image line', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
        image: registry.example.com/myapp:1.2.3
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml').length, 0);
    });

    it('does not match the plain version string', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp
        APP_VERSION="1.2.3"
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh').length, 0);
    });
  });

  describe('container-tag manager', () => {
    it('matches only the tag-only image line', () => {
      const deps = extractWith(MANAGER_CONTAINER_TAG, MIXED_CONTENT, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      assert.equal(deps[0].currentValue, '1.2.3');
      assert.equal(deps[0].currentDigest, undefined);
    });

    it('does not match the digest-pinned image line', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_TAG, content, 'test.sh').length, 0);
    });

    it('does not match the plain version string', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp
        APP_VERSION="1.2.3"
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_TAG, content, 'test.sh').length, 0);
    });
  });

  describe('version-string manager', () => {
    it('matches only the plain version line', () => {
      const deps = extractWith(MANAGER_VERSION_STRING, MIXED_CONTENT, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      assert.equal(deps[0].currentValue, '1.2.3');
      assert.equal(deps[0].currentDigest, undefined);
    });

    it('does not match the digest-pinned image line', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });

    it('does not match the tag-only image line', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
        image: registry.example.com/myapp:1.2.3
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.yaml').length, 0);
    });
  });
});
