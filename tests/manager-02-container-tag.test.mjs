import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractWith, MANAGER_CONTAINER_TAG } from './helpers.mjs';
import dedent from 'dedent';

const examples = [
  // Matches
  {
    name: '# comment + image: registry/path:tag matches',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [
      { datasource: 'docker', depName: 'registry.example.com/myapp', currentValue: '1.2.3', currentDigest: undefined },
    ],
  },
  {
    name: 'indirect image reference (depName differs from value URL) matches',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [
      { datasource: 'docker', depName: 'registry.example.com/myapp', currentValue: '1.2.3' },
    ],
  },
  {
    name: '# comment + image: ... with extra indentation matches',
    file: 'test.yaml',
    content: dedent(`
      spec:
        containers:
          # renovate: datasource=docker depName=registry.example.com/myapp
          image: registry.example.com/myapp:1.2.3
    `),
    matches: [
      { currentValue: '1.2.3' },
    ],
  },
  {
    name: '# comment + image:  value (extra space after colon) matches',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      image:  registry.example.com/myapp:1.2.3
    `),
    matches: [
      { currentValue: '1.2.3' },
    ],
  },
  {
    name: '// comment + image: registry/path:tag matches',
    file: 'test.yaml',
    content: dedent(`
      // renovate: datasource=docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [
      { currentValue: '1.2.3' },
    ],
  },
  // Should not match
  {
    name: '# comment + image: ... without annotation does not match',
    file: 'test.yaml',
    content: dedent(`
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [],
  },
  {
    name: 'plain version: line (no path separator) does not match',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=github-releases depName=example/myapp
      version: 1.2.3
    `),
    matches: [],
  },
  // Optional fields
  {
    name: 'captures packageName when present',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp packageName=example/myapp registryUrl=https://ghcr.io
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [
      { packageName: 'example/myapp' },
    ],
  },
  {
    name: 'packageName is undefined when absent',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [
      { packageName: undefined },
    ],
  },
  {
    name: 'captures versioning=semver when present',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp versioning=semver
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [
      { versioning: 'semver' },
    ],
  },
  {
    name: 'versioning defaults to semver-coerced when absent',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [
      // Renovate's regex manager defaults versioning to 'semver-coerced' when not specified
      { versioning: 'semver-coerced' },
    ],
  },
  // Adjacent annotations
  {
    name: 'two adjacent annotated image lines produce two matches',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource=docker depName=registry.example.com/myapp
      imageA: registry.example.com/myapp:1.2.3
      # renovate: datasource=docker depName=registry.example.com/otherapp
      imageB: registry.example.com/otherapp:1.2.3
    `),
    matches: [
      { depName: 'registry.example.com/myapp' },
      { depName: 'registry.example.com/otherapp' },
    ],
  },
  // Annotation typos (should not match)
  {
    name: 'space around = in annotation (datasource = docker) does not match',
    file: 'test.yaml',
    content: dedent(`
      # renovate: datasource = docker depName=registry.example.com/myapp
      image: registry.example.com/myapp:1.2.3
    `),
    matches: [],
  },
];

describe('container-tag manager', () => {
  for (const example of examples) {
    it(example.name, () => {
      const deps = extractWith(MANAGER_CONTAINER_TAG, example.content, example.file ?? 'test.sh');
      assert.equal(deps.length, example.matches.length);
      for (const [i, expected] of example.matches.entries()) {
        for (const [key, value] of Object.entries(expected)) {
          assert.deepEqual(deps[i][key], value);
        }
      }
    });
  }
});
