import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_CONTAINER_DIGEST } from './helpers.mjs';
import dedent from 'dedent';

describe('container-digest manager', () => {
  describe('# comment + assignment (KEY=)', () => {
    it('matches', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'registry.example.com/myapp');
      assert.equal(dep.versioning, 'semver');
      const expected = 'registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000';
      assert.equal(`${dep.currentValue}@${dep.currentDigest}`, expected.split(':').slice(1).join(':'));
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh').length, 0);
    });

    it('matches KEY = "value" (spaces around =)', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp
        APP_IMAGE = "registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const expected = 'registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000';
      assert.equal(`${deps[0].currentValue}@${deps[0].currentDigest}`, expected.split(':').slice(1).join(':'));
    });
  });

  describe('// comment + assignment (const KEY =)', () => {
    it('matches', () => {
      const content = dedent(`
        // renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
        const APP_IMAGE = 'registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000';
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.mjs');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'registry.example.com/myapp');
      const expected = 'registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000';
      assert.equal(`${dep.currentValue}@${dep.currentDigest}`, expected.split(':').slice(1).join(':'));
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        const APP_IMAGE = 'registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000';
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.mjs').length, 0);
    });
  });

  describe('# comment + key-value (key:)', () => {
    it('matches', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp
        image: registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.datasource, 'docker');
      assert.equal(dep.depName, 'registry.example.com/myapp');
      const expected = 'registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000';
      assert.equal(`${dep.currentValue}@${dep.currentDigest}`, expected.split(':').slice(1).join(':'));
    });

    it('matches with extra indentation', () => {
      const content = dedent(`
        spec:
          containers:
            # renovate: datasource=docker depName=registry.example.com/myapp
            image: registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const expected = 'registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000';
      assert.equal(`${deps[0].currentValue}@${deps[0].currentDigest}`, expected.split(':').slice(1).join(':'));
    });

    it('does not match without annotation', () => {
      const content = dedent(`
        image: registry.example.com/myapp:1.2.3@sha256:262d3c
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml').length, 0);
    });
  });

  describe('// comment + key-value (key:)', () => {
    it('matches', () => {
      const content = dedent(`
        // renovate: datasource=docker depName=registry.example.com/myapp
        image: registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.yaml');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      const expected = 'registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000';
      assert.equal(`${dep.currentValue}@${dep.currentDigest}`, expected.split(':').slice(1).join(':'));
    });
  });

  describe('optional annotation fields', () => {
    it('captures packageName when present', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp packageName=example/myapp registryUrl=https://ghcr.io
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(dep.packageName, 'example/myapp');
    });

    it('matches with packageName only (no depName)', () => {
      const content = dedent(`
        # renovate: datasource=docker packageName=example/myapp versioning=semver
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(dep.depName, undefined);
      assert.equal(dep.packageName, 'example/myapp');
    });

    it('packageName is undefined when absent', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(dep.packageName, undefined);
    });

    it('captures registryUrl when present', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp registryUrl=https://ghcr.io
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      const [dep] = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      // Renovate normalises registryUrl → registryUrls (array) and appends a trailing slash
      assert.equal(dep.registryUrls[0], 'https://ghcr.io/');
    });
  });

  describe('digest algorithm variants', () => {
    it('matches sha512 digest', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha512:cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e"
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(deps.length, 1, 'expected exactly one match');
      const [dep] = deps;
      assert.equal(dep.currentValue, '1.2.3');
      assert.equal(dep.currentDigest, 'sha512:cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e');
    });
  });

  describe('adjacent annotations', () => {
    it('produces two matches for two consecutive annotated lines', () => {
      const content = dedent(`
        # renovate: datasource=docker depName=registry.example.com/myapp
        IMAGE_A="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
        # renovate: datasource=docker depName=registry.example.com/myapp
        IMAGE_B="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh');
      assert.equal(deps.length, 2, 'expected two matches');
      assert.equal(deps[0].depName, 'registry.example.com/myapp');
      assert.equal(deps[1].depName, 'registry.example.com/myapp');
    });
  });

  describe('annotation typos (should not match)', () => {
    it('does not match when annotation has space around = (datasource = docker)', () => {
      const content = dedent(`
        # renovate: datasource = docker depName=registry.example.com/myapp
        APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
      `);
      assert.equal(extractWith(MANAGER_CONTAINER_DIGEST, content, 'test.sh').length, 0);
    });
  });
});
