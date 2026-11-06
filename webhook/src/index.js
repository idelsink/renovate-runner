import { verify } from "@octokit/webhooks-methods";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/core";

// Decide whether a validated issues/pull_request payload should trigger a Renovate run.
// Pulled out of fetch() so the decision logic can be unit-tested without mocking the
// GitHub API client or Cloudflare request/response objects.
export function shouldTrigger(event, payload, env) {
  if (event === "issues") {
    // Ignore edits by bots to avoid triggering loops
    if (payload.action !== "edited" || payload.sender?.type === "Bot") {
      return false;
    }
    // Only the Dependency Dashboard issue triggers a run
    const title = payload.issue?.title ?? "";
    return title.startsWith("Dependency Dashboard");
  }

  // event === "pull_request"
  // Rebase/retry checkbox edits: only process PRs opened by the configured Renovate bot,
  // and ignore edits made by bots to avoid triggering loops.
  const rebaseRequested =
    payload.action === "edited" &&
    payload.sender?.type !== "Bot" &&
    payload.pull_request?.user?.login === env.RENOVATE_BOT_LOGIN;

  const mergedToDefault =
    // pull_request event — only PRs matter to Renovate here
    event === "pull_request" &&
    // action closed — the single action that covers both merged and unmerged PRs
    payload.action === "closed" &&
    // merged === true — a closed-but-unmerged PR changed nothing on the default branch,
    // so there is nothing for Renovate to react to (and it avoids re-triggering on
    // Renovate's own autoclosed PRs)
    payload.pull_request?.merged === true &&
    // base.ref === default_branch — Renovate only tracks the default branch, so a merge
    // into a feature branch is irrelevant
    payload.pull_request?.base?.ref === payload.repository?.default_branch;
  // No bot-sender filter here: an automerge by the Renovate bot is exactly the case we
  // want, and a merge cannot cause another merge, so there is no loop risk.

  return rebaseRequested || mergedToDefault;
}

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response(null, { status: 404 });
    }

    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) {
      return new Response(null, { status: 404 });
    }

    let body;
    try {
      body = await request.text();
    } catch (err) {
      console.error("Failed to read request body:", err);
      return new Response(null, { status: 404 });
    }

    let valid;
    try {
      valid = await verify(env.WEBHOOK_SECRET, body, signature);
    } catch (err) {
      console.error("Signature verification error:", err);
      return new Response(null, { status: 404 });
    }

    if (!valid) {
      return new Response(null, { status: 404 });
    }

    // Signature valid. Return 200 for all ignored events from here on to prevent GitHub from retrying the delivery
    const event = request.headers.get("x-github-event");
    if (event !== "issues" && event !== "pull_request") {
      return new Response(null, { status: 200 });
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch (err) {
      console.error("Failed to parse payload:", err);
      return new Response(null, { status: 200 });
    }

    if (!shouldTrigger(event, payload, env)) {
      return new Response(null, { status: 200 });
    }

    const repositoryId = payload.repository?.id;
    if (!repositoryId) {
      console.error("Missing repository.id in payload");
      return new Response(null, { status: 200 });
    }

    try {
      const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: env.GITHUB_APP_ID,
          privateKey: env.GITHUB_APP_PRIVATE_KEY,
          installationId: env.GITHUB_APP_INSTALLATION_ID,
        },
      });

      const [owner, repo] = env.RUNNER_REPO.split("/");
      await octokit.request("POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches", {
        owner,
        repo,
        workflow_id: "renovate.yaml",
        ref: env.RUNNER_REF ?? "main",
        inputs: { repository_id: String(repositoryId) },
      });

      console.log(`Triggered renovate for repository ${repositoryId}`);
    } catch (err) {
      console.error("Failed to trigger workflow dispatch:", err);
    }

    return new Response(null, { status: 200 });
  },
};
