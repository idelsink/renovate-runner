import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_VERSION_STRING } from './helpers.mjs';
import dedent from 'dedent';

describe('version-string manager', () => {
  describe('# comment + assignment (KEY=)', () => {
    it('matches KEY="vX.Y.Z"', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        RENOVATE_VERSION="43.113.0"
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'renovatebot/renovate');
      // renovate: datasource=github-releases depName=renovatebot/renovate
      const expected = '43.113.0';
      assert.equal(dep.currentValue, expected);
    });

    it('matches KEY=version without quotes', () => {
      const content = dedent(`
        # renovate: datasource=npm depName=renovate versioning=npm
        RENOVATE_VERSION=43.120.1
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'npm');
      assert.equal(dep.depName, 'renovate');
      assert.equal(dep.versioning, 'npm');
      // renovate: datasource=npm depName=renovate versioning=npm
      const expected = '43.120.1';
      assert.equal(dep.currentValue, expected);
    });

    it('matches KEY = "vX.Y.Z" (spaces around =)', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        RENOVATE_VERSION = "43.113.0"
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=github-releases depName=renovatebot/renovate
      const expected = '43.113.0';
      assert.equal(deps[0].currentValue, expected);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        RENOVATE_VERSION="43.113.0"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });

    it('does not match a digest-pinned image reference', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });
  });

  describe('// comment + assignment (const KEY =)', () => {
    it('matches const KEY = "vX.Y.Z"', () => {
      const content = dedent(`
        // renovate: datasource=github-releases depName=renovatebot/renovate
        const RENOVATE_VERSION = '43.113.0';
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.mjs');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'renovatebot/renovate');
      // renovate: datasource=github-releases depName=renovatebot/renovate
      const expected = '43.113.0';
      assert.equal(dep.currentValue, expected);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        const RENOVATE_VERSION = '43.113.0';
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.mjs').length, 0);
    });
  });

  describe('# comment + key-value (key:)', () => {
    it('matches version: vX.Y.Z', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        version: 43.113.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'renovatebot/renovate');
      // renovate: datasource=github-releases depName=renovatebot/renovate
      const expected = '43.113.0';
      assert.equal(dep.currentValue, expected);
    });

    it('matches camelCase key (e.g. appVersion:)', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        appVersion: 43.113.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'ghcr.io/renovatebot/renovate');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = '43.113.0';
      assert.equal(dep.currentValue, expected);
    });

    it('matches key:  value (extra space after colon)', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        version:  43.113.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=github-releases depName=renovatebot/renovate
      const expected = '43.113.0';
      assert.equal(deps[0].currentValue, expected);
    });

    it('matches with extra indentation', () => {
      const content = dedent(`
        cluster:
          # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
          appVersion: 43.113.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
      const expected = '43.113.0';
      assert.equal(deps[0].currentValue, expected);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        version: 43.113.0
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.yaml').length, 0);
    });

    it('does not match an image-tag line', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:43.113.0
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.yaml').length, 0);
    });
  });

  describe('// comment + key-value (key:)', () => {
    it('matches version: vX.Y.Z', () => {
      const content = dedent(`
        // renovate: datasource=github-releases depName=renovatebot/renovate
        version: 43.113.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      // renovate: datasource=github-releases depName=renovatebot/renovate
      const expected = '43.113.0';
      assert.equal(deps[0].currentValue, expected);
    });
  });

  describe('optional annotation fields', () => {
    it('captures packageName when present', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate packageName=renovatebot/renovate
        RENOVATE_VERSION="43.113.0"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.packageName, 'renovatebot/renovate');
    });

    it('packageName is undefined when absent', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        RENOVATE_VERSION="43.113.0"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.packageName, undefined);
    });

    it('captures extractVersion when present', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate extractVersion=^v(?<version>.+)$
        RENOVATE_VERSION="43.113.0"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.extractVersion, '^v(?<version>.+)$');
    });

    it('captures registryUrl when present', () => {
      const content = dedent(`
        # renovate: datasource=npm depName=renovate registryUrl=https://registry.npmjs.org
        RENOVATE_NPM_VERSION=43.120.1
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      // Renovate normalises registryUrl → registryUrls (array) and appends a trailing slash
      assert.equal(dep.registryUrls[0], 'https://registry.npmjs.org/');
    });
  });

  describe('adjacent annotations', () => {
    it('produces two matches for two consecutive annotated lines', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        RENOVATE_VERSION="43.113.0"
        # renovate: datasource=npm depName=renovate versioning=npm
        RENOVATE_NPM_VERSION=43.120.1
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 2, 'expected two matches');
      assert.equal(deps[0].depName, 'renovatebot/renovate');
      assert.equal(deps[1].depName, 'renovate');
    });
  });

  describe('annotation typos (should not match)', () => {
    it('does not match when annotation has space around = (datasource = github-releases)', () => {
      const content = dedent(`
        # renovate: datasource = github-releases depName=renovatebot/renovate
        RENOVATE_VERSION="43.113.0"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });
  });
});
