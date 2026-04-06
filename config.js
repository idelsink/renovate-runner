if (!process.env.RENOVATE_RUNNER_REPO) {
  throw new Error('RENOVATE_RUNNER_REPO is not set');
}

module.exports = {
  platform: 'github',
  repositoryCache: 'enabled',
  containerbaseDir: '/tmp/containerbase',

  dependencyDashboardFooter: `- [ ] <!-- trigger-run --> Trigger a Renovate run - [workflow runs & logs ↗](https://github.com/${process.env.RENOVATE_RUNNER_REPO}/actions/workflows/renovate.yaml)`,

  onboardingConfig: {
    $schema: 'https://docs.renovatebot.com/renovate-schema.json',
    extends: ['github>idelsink/renovate-runner'],
  },
};
