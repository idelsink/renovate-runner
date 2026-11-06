import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldTrigger } from '../webhook/src/index.js';

const env = { RENOVATE_BOT_LOGIN: 'renovate-iws[bot]' };

function prPayload(overrides = {}) {
  return {
    action: 'closed',
    sender: { type: 'Bot' },
    pull_request: {
      user: { login: 'renovate-iws[bot]' },
      merged: true,
      base: { ref: 'main' },
    },
    repository: { id: 1, default_branch: 'main' },
    ...overrides,
  };
}

describe('shouldTrigger', () => {
  it('pull_request closed + merged into default branch by bot -> true', () => {
    assert.equal(shouldTrigger('pull_request', prPayload(), env), true);
  });

  it('pull_request closed but not merged -> false', () => {
    const payload = prPayload();
    payload.pull_request.merged = false;
    assert.equal(shouldTrigger('pull_request', payload, env), false);
  });

  it('merged into a non-default branch -> false', () => {
    const payload = prPayload();
    payload.pull_request.base.ref = 'feature/x';
    assert.equal(shouldTrigger('pull_request', payload, env), false);
  });

  it('action synchronize -> false', () => {
    const payload = prPayload({ action: 'synchronize' });
    assert.equal(shouldTrigger('pull_request', payload, env), false);
  });

  it('existing behaviour: edited by non-bot sender on renovate bot PR -> true', () => {
    const payload = prPayload({
      action: 'edited',
      sender: { type: 'User' },
    });
    assert.equal(shouldTrigger('pull_request', payload, env), true);
  });

  it('edited by Bot sender -> false', () => {
    const payload = prPayload({
      action: 'edited',
      sender: { type: 'Bot' },
    });
    assert.equal(shouldTrigger('pull_request', payload, env), false);
  });

  it('issues edited non-bot with Dependency Dashboard title -> true', () => {
    const payload = {
      action: 'edited',
      sender: { type: 'User' },
      issue: { title: 'Dependency Dashboard' },
    };
    assert.equal(shouldTrigger('issues', payload, env), true);
  });

  it('issues edited with other title -> false', () => {
    const payload = {
      action: 'edited',
      sender: { type: 'User' },
      issue: { title: 'Something else' },
    };
    assert.equal(shouldTrigger('issues', payload, env), false);
  });

  it('event push -> false', () => {
    assert.equal(shouldTrigger('push', {}, env), false);
  });
});
