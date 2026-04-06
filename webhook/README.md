# renovate-webhook

Cloudflare Worker that receives GitHub webhook events and triggers a Renovate scan via `workflow_dispatch` on this repository, passing the source repository ID.

## How it works

1. The [renovate-iws](https://github.com/settings/apps/renovate-iws) GitHub App sends webhook events to `https://renovate.iws.dels.ink`
2. The worker verifies the HMAC-SHA256 signature
3. Matching events trigger `renovate.yaml` via the [renovate-iws-runner-trigger](https://github.com/settings/apps/renovate-iws-runner-trigger) app with the source repository ID
4. All invalid/ignored requests return no body

### Handled events

| Event | Condition | Action |
|-------|-----------|--------|
| `issues.edited` | Issue title starts with `Dependency Dashboard`, sender is not a bot | Trigger Renovate |
| `pull_request.edited` | PR was opened by the configured Renovate bot, sender is not a bot | Trigger Renovate |

## Setup

### 1. Configure `wrangler.toml`

Update the `[vars]` section for your setup:

| Variable | Description | Example |
|---|---|---|
| `RUNNER_REPO` | GitHub repo running the Renovate workflow | `idelsink/renovate-runner` |
| `RUNNER_REF` | Branch to dispatch against | `main` |
| `RENOVATE_BOT_LOGIN` | GitHub login of the Renovate bot | `renovate-iws[bot]` |

### 2. Deploy the worker

```bash
wrangler login
wrangler secret put WEBHOOK_SECRET              # generate with: openssl rand -hex 64
wrangler secret put GITHUB_APP_ID               # renovate-iws-runner-trigger App ID
mise run webhook:set-private-key <key.pem>      # private key from renovate-iws-runner-trigger settings
wrangler secret put GITHUB_APP_INSTALLATION_ID  # see environment variables below
wrangler deploy
```

For a custom domain, go to **Workers & Pages > your worker > Triggers > Custom Domains**. Cloudflare creates the DNS record automatically if your domain is on Cloudflare, otherwise add a `CNAME` to `<worker>.<subdomain>.workers.dev`.

### 3. Configure the renovate-iws webhook

In [renovate-iws > Edit](https://github.com/settings/apps/renovate-iws):

| Field | Value |
|-------|-------|
| Webhook URL | your worker's public URL |
| Webhook secret | same value as `WEBHOOK_SECRET` |
| Subscribe to events | **Issues**, **Pull request** |

### 4. Add a managed repo

Install [renovate-iws](https://github.com/settings/apps/renovate-iws) on the repository. The app-level webhook will automatically receive events from all installations.

## Operations

```bash
wrangler tail        # stream live logs
wrangler deploy      # redeploy after code changes
wrangler secret put  # update a secret (triggers a new deployment)
```

Persistent logs are also available in the Cloudflare dashboard under **Workers & Pages > renovate-webhook > Logs**.

## Environment variables

| Variable | Description |
|----------|-------------|
| `WEBHOOK_SECRET` | Shared secret configured in the [renovate-iws](https://github.com/settings/apps/renovate-iws) webhook |
| `GITHUB_APP_ID` | [renovate-iws-runner-trigger](https://github.com/settings/apps/renovate-iws-runner-trigger) App ID |
| `GITHUB_APP_PRIVATE_KEY` | renovate-iws-runner-trigger private key (PKCS#8 PEM) |
| `GITHUB_APP_INSTALLATION_ID` | Installation ID of renovate-iws-runner-trigger on `idelsink/renovate-runner` - find at **Settings > Developer settings > GitHub Apps > renovate-iws-runner-trigger > Install App**, the URL of the installation page contains the ID |
