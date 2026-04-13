import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_CONTAINER_DIGEST } from './helpers.mjs';
import dedent from 'dedent';

describe('container-digest manager', () => {
  describe('# comment + assignment (KEY=)', () => {
    it('matches', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate versioning=semver
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'ghcr.io/renovatebot/renovate');
      assert.equal(dep.versioning, 'semver');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate versioning=semver
      const expected = 'ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b';
      assert.equal(`${dep.currentValue}@${dep.currentDigest}`, expected.split(':').slice(1).join(':'));
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh').length, 0);
    });

    it('matches KEY = "value" (spaces around =)', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        RENOVATE_IMAGE = "ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = 'ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b';
      assert.equal(`${deps[0].currentValue}@${deps[0].currentDigest}`, expected.split(':').slice(1).join(':'));
    });
  });

  describe('// comment + assignment (const KEY =)', () => {
    it('matches', () => {
      const content = dedent(`
        // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate versioning=semver
        const RENOVATE_IMAGE = 'ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b';
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.mjs');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'ghcr.io/renovatebot/renovate');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate versioning=semver
      const expected = 'ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b';
      assert.equal(`${dep.currentValue}@${dep.currentDigest}`, expected.split(':').slice(1).join(':'));
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        const RENOVATE_IMAGE = 'ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b';
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.mjs').length, 0);
    });
  });

  describe('# comment + key-value (key:)', () => {
    it('matches', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'ghcr.io/renovatebot/renovate');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = 'ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b';
      assert.equal(`${dep.currentValue}@${dep.currentDigest}`, expected.split(':').slice(1).join(':'));
    });

    it('matches with extra indentation', () => {
      const content = dedent(`
        spec:
          containers:
            # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
            image: ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = 'ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b';
      assert.equal(`${deps[0].currentValue}@${deps[0].currentDigest}`, expected.split(':').slice(1).join(':'));
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        image: ghcr.io/renovatebot/renovate:43.113.0@sha256:262d3c
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml').length, 0);
    });
  });

  describe('// comment + key-value (key:)', () => {
    it('matches', () => {
      const content = dedent(`
        // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = 'ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b';
      assert.equal(`${dep.currentValue}@${dep.currentDigest}`, expected.split(':').slice(1).join(':'));
    });
  });

  describe('optional annotation fields', () => {
    it('captures packageName when present', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate packageName=renovatebot/renovate registryUrl=https://ghcr.io
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(dep.packageName, 'renovatebot/renovate');
    });

    it('captures lookupName when present', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate lookupName=renovatebot/renovate registryUrl=https://ghcr.io
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(dep.packageName, 'renovatebot/renovate');
    });

    it('packageName is undefined when absent', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(dep.packageName, undefined);
    });

    it('captures registryUrl when present', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate registryUrl=https://ghcr.io
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      // Renovate normalises registryUrl → registryUrls (array) and appends a trailing slash
      assert.equal(dep.registryUrls[0], 'https://ghcr.io/');
    });
  });

  describe('adjacent annotations', () => {
    it('produces two matches for two consecutive annotated lines', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        IMAGE_A="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        IMAGE_B="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(deps.length, 2, 'expected two matches');
      assert.equal(deps[0].depName, 'ghcr.io/renovatebot/renovate');
      assert.equal(deps[1].depName, 'ghcr.io/renovatebot/renovate');
    });
  });

  describe('annotation typos (should not match)', () => {
    it('does not match when annotation has space around = (datasource = docker)', () => {
      const content = dedent(`
        # renovate: datasource = docker depName=ghcr.io/renovatebot/renovate
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh').length, 0);
    });
  });
});
