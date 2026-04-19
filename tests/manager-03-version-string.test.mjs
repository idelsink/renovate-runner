import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_VERSION_STRING } from './helpers.mjs';
import dedent from 'dedent';

const examples = [
  // Matches
  {
    name: '# comment + KEY="vX.Y.Z" matches',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp
      APP_VERSION="1.2.3"
    `),
    matches: [
      { datasource: 'github-releases', depName: 'example/myapp', currentValue: '1.2.3' },
    ],
  },
  {
    name: '# comment + KEY=version without quotes (npm) matches',
    content: dedent(`
      # renovate: datasource=npm depName=example-package versioning=npm
      APP_VERSION=1.2.3
    `),
    matches: [
      { datasource: 'npm', depName: 'example-package', versioning: 'npm', currentValue: '1.2.3' },
    ],
  },
  {
    name: '# comment + KEY = "vX.Y.Z" (spaces around =) matches',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp
      APP_VERSION = "1.2.3"
    `),
    matches: [
      { currentValue: '1.2.3' },
    ],
  },
  {
    name: '// comment + const KEY = "vX.Y.Z" matches',
    file: 'test.mjs',
    content: dedent(`
      // renovate: datasource=github-releases depName=example/myapp
      const APP_VERSION = '1.2.3';
    `),
    matches: [
      { datasource: 'github-releases', depName: 'example/myapp', currentValue: '1.2.3' },
    ],
  },
  {
    name: '# comment + version: vX.Y.Z (YAML) matches',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp
      version: 1.2.3
    `),
    matches: [
      { datasource: 'github-releases', depName: 'example/myapp', currentValue: '1.2.3' },
    ],
  },
  {
    name: '# comment + camelCase key (appVersion:) matches',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      appVersion: 1.2.3
    `),
    matches: [
      { datasource: 'docker', depName: 'registry.example.com/myapp', currentValue: '1.2.3' },
    ],
  },
  {
    name: '# comment + key:  value (extra space after colon) matches',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp
      version:  1.2.3
    `),
    matches: [
      { currentValue: '1.2.3' },
    ],
  },
  {
    name: '# comment + key: value with extra indentation (YAML) matches',
    file: 'test.yaml',
    content: dedent(`
      cluster:
        # renovate: datasource=docker depName=registry.example.com/myapp
        appVersion: 1.2.3
    `),
    matches: [
      { currentValue: '1.2.3' },
    ],
  },
  {
    name: '// comment + version: vX.Y.Z (YAML) matches',
    file: 'test.yaml',
    content: dedent(`
      // renovate: datasource=github-releases depName=example/myapp
      version: 1.2.3
    `),
    matches: [
      { currentValue: '1.2.3' },
    ],
  },
  // Should not match
  {
    name: '# comment + KEY="vX.Y.Z" without annotation does not match',
    content: dedent(`
      APP_VERSION="1.2.3"
    `),
    matches: [],
  },
  {
    name: 'digest-pinned image reference does not match',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      APP_IMAGE="registry.example.com/myapp:1.2.3@sha256:0000000000000000000000000000000000000000000000000000000000000000"
    `),
    matches: [],
  },
  {
    name: '// comment + const KEY = "vX.Y.Z" without annotation does not match',
    file: 'test.mjs',
    content: dedent(`
      const APP_VERSION = '1.2.3';
    `),
    matches: [],
  },
  {
    name: '# comment + version: ... without annotation does not match',
    file: 'test.yaml',
    content: dedent(`
      version: 1.2.3
    `),
    matches: [],
  },
  {
    name: 'image-tag line (image: registry/path:tag) does not match',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [],
  },
  // Optional fields
  {
    name: 'captures packageName when present',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp packageName=example/myapp
      APP_VERSION="1.2.3"
    `),
    matches: [
      { packageName: 'example/myapp' },
    ],
  },
  {
    name: 'packageName is undefined when absent',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp
      APP_VERSION="1.2.3"
    `),
    matches: [
      { packageName: undefined },
    ],
  },
  {
    name: 'captures extractVersion when present',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp extractVersion=^v(?<version>.+)$
      APP_VERSION="1.2.3"
    `),
    matches: [
      { extractVersion: '^v(?<version>.+)$' },
    ],
  },
  {
    name: 'captures registryUrl (normalised to registryUrls array with trailing slash)',
    content: dedent(`
      # renovate: datasource=npm depName=renovate registryUrl=https://registry.npmjs.org
      APP_NPM_VERSION=1.2.3
    `),
    matches: [
      // Renovate normalises registryUrl → registryUrls (array) and appends a trailing slash
      { registryUrls: ['https://registry.npmjs.org/'] },
    ],
  },
  // Adjacent annotations
  {
    name: 'two adjacent annotations (github-releases + npm) produce two matches',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp
      APP_VERSION="1.2.3"
      # renovate: datasource=npm depName=example-package versioning=npm
      APP_NPM_VERSION=1.2.3
    `),
    matches: [
      { depName: 'example/myapp' },
      { depName: 'example-package' },
    ],
  },
  // Annotation typos (should not match)
  {
    name: 'space around = in annotation (datasource = github-releases) does not match',
    content: dedent(`
      # renovate: datasource = github-releases depName=example/myapp
      APP_VERSION="1.2.3"
    `),
    matches: [],
  },
];

describe('version-string manager', () => {
  for (const example of examples) {
    it(example.name, () => {
      const deps = extractWith(MANAGER_VERSION_STRING, example.content, example.file ?? 'test.sh');
      assert.equal(deps.length, example.matches.length);
      for (const [i, expected] of example.matches.entries()) {
        for (const [key, value] of Object.entries(expected)) {
          assert.deepEqual(deps[i][key], value);
        }
      }
    });
  }
});
