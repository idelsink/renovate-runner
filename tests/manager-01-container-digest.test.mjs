import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_CONTAINER_DIGEST } from './helpers.mjs';
import dedent from 'dedent';

const DIGEST = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
const DIGEST_512 = 'sha512:cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e';

const examples = [
  // Matches
  {
    name: '# comment + KEY="image:tag@digest" matches',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
      APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST}"
    `),
    matches: [
      { datasource: 'docker', depName: 'registry.example.com/myapp', versioning: 'semver', currentValue: '1.2.3', currentDigest: DIGEST },
    ],
  },
  {
    name: '# comment + KEY = "image:tag@digest" (spaces around =) matches',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      APP_IMAGE = "registry.example.com/myapp:1.2.3@${DIGEST}"
    `),
    matches: [
      { currentValue: '1.2.3', currentDigest: DIGEST },
    ],
  },
  {
    name: '// comment + const KEY = "image:tag@digest" matches',
    file: 'test.mjs',
    content: dedent(`
      // renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
      const APP_IMAGE = 'registry.example.com/myapp:1.2.3@${DIGEST}';
    `),
    matches: [
      { datasource: 'docker', depName: 'registry.example.com/myapp', currentValue: '1.2.3', currentDigest: DIGEST },
    ],
  },
  {
    name: '# comment + image: registry/path:tag@digest (YAML) matches',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3@${DIGEST}
    `),
    matches: [
      { datasource: 'docker', depName: 'registry.example.com/myapp', currentValue: '1.2.3', currentDigest: DIGEST },
    ],
  },
  {
    name: '# comment + image: ... with extra indentation (YAML) matches',
    file: 'test.yaml',
    content: dedent(`
      spec:
        containers:
          # renovate: datasource=docker depName=registry.example.com/myapp
          image: registry.example.com/myapp:1.2.3@${DIGEST}
    `),
    matches: [
      { currentValue: '1.2.3', currentDigest: DIGEST },
    ],
  },
  {
    name: '// comment + image: registry/path:tag@digest (YAML) matches',
    file: 'test.yaml',
    content: dedent(`
      // renovate: datasource=docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3@${DIGEST}
    `),
    matches: [
      { currentValue: '1.2.3', currentDigest: DIGEST },
    ],
  },
  // Should not match
  {
    name: '# comment + KEY="image:tag@digest" without annotation does not match',
    content: dedent(`
      APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST}"
    `),
    matches: [],
  },
  {
    name: '// comment + const KEY = "image:tag@digest" without annotation does not match',
    file: 'test.mjs',
    content: dedent(`
      const APP_IMAGE = 'registry.example.com/myapp:1.2.3@${DIGEST}';
    `),
    matches: [],
  },
  {
    name: '# comment + image: ... without annotation does not match',
    file: 'test.yaml',
    content: dedent(`
      image: registry.example.com/myapp:1.2.3@sha256:262d3c
    `),
    matches: [],
  },
  // Optional fields
  {
    name: 'captures packageName when present alongside depName',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp packageName=example/myapp registryUrl=https://ghcr.io
      APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST}"
    `),
    matches: [
      { packageName: 'example/myapp' },
    ],
  },
  {
    name: 'matches with packageName only (no depName)',
    content: dedent(`
      # renovate: datasource=docker packageName=example/myapp versioning=semver
      APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST}"
    `),
    matches: [
      { depName: undefined, packageName: 'example/myapp' },
    ],
  },
  {
    name: 'packageName is undefined when absent',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST}"
    `),
    matches: [
      { packageName: undefined },
    ],
  },
  {
    name: 'captures registryUrl (normalised to registryUrls array with trailing slash)',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp registryUrl=https://ghcr.io
      APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST}"
    `),
    matches: [
      // Renovate normalises registryUrl → registryUrls (array) and appends a trailing slash
      { registryUrls: ['https://ghcr.io/'] },
    ],
  },
  {
    name: 'sha512 digest matches',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST_512}"
    `),
    matches: [
      { currentValue: '1.2.3', currentDigest: DIGEST_512 },
    ],
  },
  // Adjacent annotations
  {
    name: 'two adjacent annotated assignments produce two matches',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      IMAGE_A="registry.example.com/myapp:1.2.3@${DIGEST}"
      # renovate: datasource=docker depName=registry.example.com/otherapp
      IMAGE_B="registry.example.com/otherapp:1.2.3@${DIGEST}"
    `),
    matches: [
      { depName: 'registry.example.com/myapp' },
      { depName: 'registry.example.com/otherapp' },
    ],
  },
  // Annotation typos (should not match)
  {
    name: 'space around = in annotation (datasource = docker) does not match',
    content: dedent(`
      # renovate: datasource = docker depName=registry.example.com/myapp
      APP_IMAGE="registry.example.com/myapp:1.2.3@${DIGEST}"
    `),
    matches: [],
  },
];

describe('container-digest manager', () => {
  for (const example of examples) {
    it(example.name, () => {
      const deps = extractWith(MANAGER_CONTAINER_DIGEST, example.content, example.file ?? 'test.sh');
      assert.equal(deps.length, example.matches.length);
      for (const [i, expected] of example.matches.entries()) {
        for (const [key, value] of Object.entries(expected)) {
          assert.deepEqual(deps[i][key], value);
        }
      }
    });
  }
});
