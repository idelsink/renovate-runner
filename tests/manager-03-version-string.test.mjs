import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_VERSION_STRING } from './helpers.mjs';
import dedent from 'dedent';

describe('version-string manager', () => {
  describe('# comment + assignment (KEY=)', () => {
    it('matches KEY="vX.Y.Z"', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp
        APP_VERSION="1.2.3"
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'example/myapp');
      const expected = '1.2.3';
      assert.equal(dep.currentValue, expected);
    });

    it('matches KEY=version without quotes', () => {
      const content = dedent(`
        # renovate: datasource=npm depName=example-package versioning=npm
        APP_VERSION=1.2.3
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'npm');
      assert.equal(dep.depName, 'example-package');
      assert.equal(dep.versioning, 'npm');
      const expected = '1.2.3';
      assert.equal(dep.currentValue, expected);
    });

    it('matches KEY = "vX.Y.Z" (spaces around =)', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp
        APP_VERSION = "1.2.3"
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const expected = '1.2.3';
      assert.equal(deps[0].currentValue, expected);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        APP_VERSION="1.2.3"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });

    it('does not match a digest-pinned image reference', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });
  });

  describe('// comment + assignment (const KEY =)', () => {
    it('matches const KEY = "vX.Y.Z"', () => {
      const content = dedent(`
        // renovate: datasource=github-releases depName=example/myapp
        const APP_VERSION = '1.2.3';
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.mjs');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'example/myapp');
      const expected = '1.2.3';
      assert.equal(dep.currentValue, expected);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        const APP_VERSION = '1.2.3';
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.mjs').length, 0);
    });
  });

  describe('# comment + key-value (key:)', () => {
    it('matches version: vX.Y.Z', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp
        version: 1.2.3
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'github-releases');
      assert.equal(dep.depName, 'example/myapp');
      const expected = '1.2.3';
      assert.equal(dep.currentValue, expected);
    });

    it('matches camelCase key (e.g. appVersion:)', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp
        appVersion: 1.2.3
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'registry.example.com/myapp');
      const expected = '1.2.3';
      assert.equal(dep.currentValue, expected);
    });

    it('matches key:  value (extra space after colon)', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp
        version:  1.2.3
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const expected = '1.2.3';
      assert.equal(deps[0].currentValue, expected);
    });

    it('matches with extra indentation', () => {
      const content = dedent(`
        cluster:
          # renovate: datasource=docker depName=registry.example.com/myapp
          appVersion: 1.2.3
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const expected = '1.2.3';
      assert.equal(deps[0].currentValue, expected);
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        version: 1.2.3
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.yaml').length, 0);
    });

    it('does not match an image-tag line', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp
        image: registry.example.com/myapp:1.2.3
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.yaml').length, 0);
    });
  });

  describe('// comment + key-value (key:)', () => {
    it('matches version: vX.Y.Z', () => {
      const content = dedent(`
        // renovate: datasource=github-releases depName=example/myapp
        version: 1.2.3
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const expected = '1.2.3';
      assert.equal(deps[0].currentValue, expected);
    });
  });

  describe('optional annotation fields', () => {
    it('captures packageName when present', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp packageName=example/myapp
        APP_VERSION="1.2.3"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.packageName, 'example/myapp');
    });

    it('packageName is undefined when absent', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp
        APP_VERSION="1.2.3"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.packageName, undefined);
    });

    it('captures extractVersion when present', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp extractVersion=^v(?<version>.+)$
        APP_VERSION="1.2.3"
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(dep.extractVersion, '^v(?<version>.+)$');
    });

    it('captures registryUrl when present', () => {
      const content = dedent(`
        # renovate: datasource=npm depName=renovate registryUrl=https://registry.npmjs.org
        APP_NPM_VERSION=1.2.3
      `);
      const [dep] = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      // Renovate normalises registryUrl → registryUrls (array) and appends a trailing slash
      assert.equal(dep.registryUrls[0], 'https://registry.npmjs.org/');
    });
  });

  describe('adjacent annotations', () => {
    it('produces two matches for two consecutive annotated lines', () => {
      const content = dedent(`
        # renovate: datasource=github-releases depName=example/myapp
        APP_VERSION="1.2.3"
        # renovate: datasource=npm depName=example-package versioning=npm
        APP_NPM_VERSION=1.2.3
      `);
      const deps = extractWith(MANAGER_VERSION_STRING, content, 'test.sh');
      assert.equal(deps.length, 2, 'expected two matches');
      assert.equal(deps[0].depName, 'example/myapp');
      assert.equal(deps[1].depName, 'example-package');
    });
  });

  describe('annotation typos (should not match)', () => {
    it('does not match when annotation has space around = (datasource = github-releases)', () => {
      const content = dedent(`
        # renovate: datasource = github-releases depName=example/myapp
        APP_VERSION="1.2.3"
      `);
      assert.equal(extractWith(MANAGER_VERSION_STRING, content, 'test.sh').length, 0);
    });
  });
});
