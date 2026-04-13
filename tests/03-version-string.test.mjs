import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_VERSION_STRING } from './helpers.mjs';
import dedent from 'dedent';

// renovate: datasource=github-releases depName=renovatebot/renovate
const RENOVATE_GH_VERSION = '39.0.0';

// renovate: datasource=npm depName=renovate versioning=npm
const RENOVATE_NPM_VERSION = '39.0.0';

// renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
const RENOVATE_DOCKER_VERSION = '39.0.0';

describe('version-string manager', () => {
  describe('# comment + assignment (KEY=)', () => {
    it('matches KEY="vX.Y.Z"', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        RENOVATE_VERSION="39.0.0"
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'renovatebot/renovate');
      assert.equal(dep.currentValue, RENOVATE_GH_VERSION);
    });

    it('matches KEY=version without quotes', () => {
      const content = dedent(`
        # renovate: datasource=npm depName=renovate versioning=npm
        RENOVATE_VERSION=39.0.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'npm');
      assert.equal(dep.depName, 'renovate');
      assert.equal(dep.versioning, 'npm');
      assert.equal(dep.currentValue, RENOVATE_NPM_VERSION);
    });

    it('matches KEY = "vX.Y.Z" (spaces around =)', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        RENOVATE_VERSION = "39.0.0"
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      assert.equal(deps[0].currentValue, RENOVATE_GH_VERSION);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        RENOVATE_VERSION="39.0.0"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });

    it('does not match a digest-pinned image reference', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:39.0.0@sha256:262d3c2d7e61da7a7eef61fdbdcf26d80cb0d13f65baaa99ace4163a4d56c0fa"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });
  });

  describe('// comment + assignment (const KEY =)', () => {
    it('matches const KEY = "vX.Y.Z"', () => {
      const content = dedent(`
        // renovate: datasource=github-releases depName=renovatebot/renovate
        const RENOVATE_VERSION = '39.0.0';
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.mjs');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'renovatebot/renovate');
      assert.equal(dep.currentValue, RENOVATE_GH_VERSION);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        const RENOVATE_VERSION = '39.0.0';
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.mjs').length, 0);
    });
  });

  describe('# comment + key-value (key:)', () => {
    it('matches version: vX.Y.Z', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        version: 39.0.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'renovatebot/renovate');
      assert.equal(dep.currentValue, RENOVATE_GH_VERSION);
    });

    it('matches kubernetesVersion: vX.Y.Z', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        kubernetesVersion: 39.0.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'ghcr.io/renovatebot/renovate');
      assert.equal(dep.currentValue, RENOVATE_DOCKER_VERSION);
    });

    it('matches key:  value (extra space after colon)', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        version:  39.0.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      assert.equal(deps[0].currentValue, RENOVATE_GH_VERSION);
    });

    it('matches with extra indentation', () => {
      const content = dedent(`
        cluster:
          # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
          kubernetesVersion: 39.0.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      assert.equal(deps[0].currentValue, RENOVATE_DOCKER_VERSION);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        version: 39.0.0
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.yaml').length, 0);
    });

    it('does not match an image-tag line', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=ghcr.io/renovatebot/renovate
        image: ghcr.io/renovatebot/renovate:39.0.0
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.yaml').length, 0);
    });
  });

  describe('// comment + key-value (key:)', () => {
    it('matches version: vX.Y.Z', () => {
      const content = dedent(`
        // renovate: datasource=github-releases depName=renovatebot/renovate
        version: 39.0.0
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      assert.equal(deps[0].currentValue, RENOVATE_GH_VERSION);
    });
  });

  describe('optional annotation fields', () => {
    it('captures packageName when present', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate packageName=renovatebot/renovate
        RENOVATE_VERSION="39.0.0"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.packageName, 'renovatebot/renovate');
    });

    it('packageName is undefined when absent', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate
        RENOVATE_VERSION="39.0.0"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.packageName, undefined);
    });

    it('captures extractVersion when present', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=renovatebot/renovate extractVersion=^v(?<version>.+)$
        RENOVATE_VERSION="39.0.0"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.extractVersion, '^v(?<version>.+)$');
    });

    it('captures registryUrl when present', () => {
      const content = dedent(`
        # renovate: datasource=npm depName=renovate registryUrl=https://registry.npmjs.org
        RENOVATE_NPM_VERSION=39.0.0
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
        RENOVATE_VERSION="39.0.0"
        # renovate: datasource=npm depName=renovate versioning=npm
        RENOVATE_NPM_VERSION=39.0.0
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
        RENOVATE_VERSION="39.0.0"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });
  });
});
