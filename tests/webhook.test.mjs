import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldTrigger } from '../webhook/src/trigger.js';

const env = { RENOVATE_BOT_LOGIN: 'renovate-iws[bot]' };

function prPayload({ pr = {}, ...overrides } = {}) {
  return {
    action: 'closed',
    sender: { type: 'Bot' },
    pull_request: {
      user: { login: 'renovate-iws[bot]' },
      merged: true,
      base: { ref: 'main' },
      ...pr,
    },
    repository: { id: 1, default_branch: 'main' },
    ...overrides,
  };
}

const triggers = (event, payload) => assert.ok(shouldTrigger(event, payload, env), 'expected a Renovate run to be triggered');
const ignores = (event, payload) => assert.ok(!shouldTrigger(event, payload, env), 'expected the delivery to be ignored');

describe('shouldTrigger', () => {
  it('PR merged into the default branch by the bot', () => triggers('pull_request', prPayload()));

  it('PR closed without merging', () => ignores('pull_request', prPayload({ pr: { merged: false } })));

  it('PR merged into a non-default branch', () => ignores('pull_request', prPayload({ pr: { base: { ref: 'feature/x' } } })));

  it('PR synchronize action', () => ignores('pull_request', prPayload({ action: 'synchronize' })));

  it('renovate bot PR edited by a non-bot sender', () => triggers('pull_request', prPayload({
    action: 'edited',
    sender: { type: 'User' },
  })));

  it('renovate bot PR edited by a bot sender', () => ignores('pull_request', prPayload({
    action: 'edited',
    sender: { type: 'Bot' },
  })));

  it('Dependency Dashboard issue edited by a non-bot sender', () => triggers('issues', {
    action: 'edited',
    sender: { type: 'User' },
    issue: { title: 'Dependency Dashboard' },
  }));

  it('issue edited with an unrelated title', () => ignores('issues', {
    action: 'edited',
    sender: { type: 'User' },
    issue: { title: 'Something else' },
  }));

  it('push event', () => ignores('push', {}));
});
