# ⬆️ Renovate Runner

Self-hosted [Renovate](https://github.com/renovatebot/renovate) runner with per-repo concurrent runs and private logs.

## Getting started

**Prerequisites:**

* [mise](https://mise.jdx.dev/getting-started.html) for  dev tools and task runner

```bash
# Install dependencies
mise install
```

## How it works

Renovate runs as a Docker container in a GitHub Actions matrix job where each managed repo gets its own concurrent run. Logs are captured away from the public Actions log and pushed to a branch in the target repo instead.

Two [GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) keep credentials separated:

| App | Purpose |
|-----|---------|
| Renovate app: [Renovate IWS](https://github.com/settings/apps/renovate-iws) | Runs Renovate, opens PRs, pushes logs with read/write on managed repos |
| Trigger app: [Renovate IWS Runner Trigger](https://github.com/settings/apps/renovate-iws-runner-trigger) | Triggers the Renovate workflow via Cloudflare Worker with Actions write on this repo only |

The Renovate app has a webhook pointing at the Cloudflare Worker. When triggered, the worker uses the Trigger app to dispatch a workflow run.

<details>
<summary>Full event flow</summary>

Webhook-triggered:

1. A GitHub event (e.g. issue edit, PR update) triggers the Renovate app webhook to fire at the Cloudflare Worker
2. The worker validates the signature and extracts the numeric repo ID
3. The worker uses the Trigger app to dispatch a `workflow_dispatch` on this repo
4. The `discover` job lists all accessible repos and fans out a matrix
5. Each `renovate` job leg runs Renovate in Docker and pushes the log to a branch in the target repo

Scheduled / manual dispatch skip steps 1–3 and enter at step 4, running all repos.

Repo details are kept out of the Actions UI and logs. See the workflow file for details.

</details>

## Renovate annotations

Any dependency in any file can be tracked by adding a `# renovate:` comment above it:

```bash
# renovate: datasource=docker depName=ghcr.io/renovatebot/renovate versioning=semver
RENOVATE_IMAGE="ghcr.io/renovatebot/renovate:43.113.0@sha256:9dd3f426078a6ce9461c87264e4bcd1853698dc5ebb594fe5fab1f0afd25ef9b"

# renovate: datasource=github-releases depName=cli/cli
CLI_VERSION="v2.90.0"
```

Renovate will keep the tag and digest up to date automatically. This works in any file type — shell scripts, Makefiles, YAML — anywhere the standard managers don't reach.

## Managed repo config

When Renovate first runs on a managed repo it opens an onboarding PR proposing a `renovate.json` that extends this runner's shared preset:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["github>idelsink/renovate-runner"]
}
```

This gives the repo `config:best-practices`, a weekly update schedule, and the `# renovate:` annotation support out of the box. The preset can be extended or overridden in the repo's own `renovate.json`.

## Setup

### Prerequisites

- A Cloudflare account
- Two GitHub Apps (see detailed steps below)

### Steps

1. Create the **Renovate app** and install it on all managed repos
2. Create the **Trigger app** and install it on this repo
3. Set **repo secrets and variables** in this runner repo
4. Deploy the **Cloudflare Worker**
5. Configure the **webhook** on the runner-trigger app pointing at the worker URL
6. Verify with a **manual dispatch** via *Actions > Renovate > Run workflow*

### 1. Renovate app

The identity Renovate uses to open PRs, post comments, and push branches.

1. Go to **GitHub > Settings > Developer settings > GitHub Apps > New GitHub App**
2. Set a name (e.g. `Renovate IWS`) and homepage URL (e.g. this repo)
3. Disable webhook (uncheck *Active*) (this will be updated later when we have a webhook endpoint)
4. Set permissions per the [Renovate GitHub App docs](https://docs.renovatebot.com/modules/platform/github/#running-as-a-github-app):

   **Repository permissions**

   | Permission | Level |
   |---|---|
   | Checks | Read & write |
   | Commit statuses | Read & write |
   | Contents | Read & write |
   | Dependabot alerts | Read |
   | Issues | Read & write |
   | Pull requests | Read & write |
   | Workflows | Read & write |

   **Organization permissions**

   | Permission | Level |
   |---|---|
   | Administration | Read |
   | Dependabot alerts | Read |
   | Members | Read |

5. Choose *Any account* if you manage repos across multiple owners, otherwise *Only on this account*
6. Install the app on all repos Renovate should manage
7. Generate a private key and note the **App ID**

### 2.Trigger app

Used exclusively by the Webhook endpoint (Cloudflare Worker) to trigger workflow dispatches.

1. Create another GitHub App (e.g. `Renovate Runner Trigger`)
2. Disable webhook
3. Set repository permissions on this runner repo only:

   | Permission | Level |
   |---|---|
   | Actions | Read & write |
   | Metadata | Read (mandatory) |

4. Install on this runner repo only
5. Generate a private key, note the **App ID** and **Installation ID** (visible in the installation URL: `github.com/settings/installations/<id>`)

### 3. Runner repo secrets and variables

**Settings > Secrets and variables > Actions**

| Type | Name | Value |
|------|------|-------|
| Variable | `RENOVATE_APP_ID` | Numeric App ID of the Renovate app |
| Secret | `RENOVATE_APP_PRIVATE_KEY` | Full PEM contents of the Renovate app private key |

### 4. Cloudflare Worker

See [`webhook/`](webhook/) for full setup instructions.

### 6. Verification

- [ ] **Manual dispatch** - go to *Actions > Renovate > Run workflow* and trigger a run. Confirm the `discover` job lists your repos (using their IDs) and `renovate` succeeds for at least one.
- [ ] **Dashboard comment** - after a run, open the Dependency Dashboard in a managed repo and confirm a *Renovate Run History* comment appears.
- [ ] **Webhook trigger** - tick a checkbox in a Dependency Dashboard issue. A new workflow run should appear in *Actions* within seconds.
- [ ] **PR checkbox** - tick the *rebase* checkbox on a Renovate PR and confirm a new run starts.
