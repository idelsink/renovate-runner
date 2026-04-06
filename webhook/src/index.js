import { verify } from "@octokit/webhooks-methods";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/core";

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

    if (payload.action !== "edited") {
      return new Response(null, { status: 200 });
    }

    // Ignore edits by bots to avoid triggering loops
    if (payload.sender?.type === "Bot") {
      return new Response(null, { status: 200 });
    }

    if (event === "issues") {
      // Only the Dependency Dashboard issue triggers a run
      const title = payload.issue?.title ?? "";
      if (!title.startsWith("Dependency Dashboard")) {
        return new Response(null, { status: 200 });
      }
    } else {
      // pull_request: only process PRs opened by the configured Renovate bot (rebase/retry checkboxes)
      if (payload.pull_request?.user?.login !== env.RENOVATE_BOT_LOGIN) {
        return new Response(null, { status: 200 });
      }
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
