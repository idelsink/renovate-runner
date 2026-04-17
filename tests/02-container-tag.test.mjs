import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_CONTAINER_TAG } from './helpers.mjs';
import dedent from 'dedent';

describe('container-tag manager', () => {
  describe('# comment + key-value (key:)', () => {
    it('matches registry/path:tag', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.129
      `);
      const deps = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'ghcr.io/renovatebot/renovate');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = '43.129';
      assert.equal(dep.currentValue, expected);
      assert.equal(dep.currentDigest, undefined);
    });

    it('matches when depName differs from the value URL (indirect image reference)', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.129
      `);
      const deps = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'ghcr.io/renovatebot/renovate');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = '43.129';
      assert.equal(dep.currentValue, expected);
    });

    it('matches with extra indentation', () => {
      const content = dedent(`
        spec:
          containers:
            # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
            image: ghcr.io/renovatebot/renovate:43.129
      `);
      const deps = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = '43.129';
      assert.equal(deps[0].currentValue, expected);
    });

    it('matches key:  value (extra space after colon)', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image:  ghcr.io/renovatebot/renovate:43.129
      `);
      const deps = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = '43.129';
      assert.equal(deps[0].currentValue, expected);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        image: ghcr.io/renovatebot/renovate:43.113.0
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml').length, 0);
    });

    it('does not match a plain version: line (no path separator)', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        version: 43.113.0
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml').length, 0);
    });
  });

  describe('// comment + key-value (key:)', () => {
    it('matches', () => {
      const content = dedent(`
        // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.129
      `);
      const deps = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = '43.129';
      assert.equal(deps[0].currentValue, expected);
    });
  });

  describe('optional annotation fields', () => {
    it('captures packageName when present', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate packageName=renovatebot/renovate registryUrl=https://ghcr.io
        image: ghcr.io/renovatebot/renovate:43.129
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(dep.packageName, 'renovatebot/renovate');
    });

    it('packageName is undefined when absent', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.129
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(dep.packageName, undefined);
    });

    it('captures versioning when present', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate versioning=semver
        image: ghcr.io/renovatebot/renovate:43.113.0
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(dep.versioning, 'semver');
    });

    it('versioning defaults to semver-coerced when absent', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.129
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      // Renovate's regex manager defaults versioning to 'semver-coerced' when not specified
      assert.equal(dep.versioning, 'semver-coerced');
    });
  });

  describe('adjacent annotations', () => {
    it('produces two matches for two consecutive annotated lines', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        imageA: ghcr.io/renovatebot/renovate:43.129
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        imageB: ghcr.io/renovatebot/renovate:43.129
      `);
      const deps = extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml');
      assert.equal(deps.length, 2, 'expected two matches');
      assert.equal(deps[0].depName, 'ghcr.io/renovatebot/renovate');
      assert.equal(deps[1].depName, 'ghcr.io/renovatebot/renovate');
    });
  });

  describe('annotation typos (should not match)', () => {
    it('does not match when annotation has space around = (datasource = docker)', () => {
      const content = dedent(`
        # renovate: datasource = docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.113.0
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_TAG, content, 'test.yaml').length, 0);
    });
  });
});
