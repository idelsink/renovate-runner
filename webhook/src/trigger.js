// Decides whether an issues/pull_request webhook delivery should trigger a Renovate run.
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

  // Only PRs can change what Renovate must do
  if (event !== "pull_request") return false;

  // Rebase/retry checkbox on a Renovate PR; bot edits are ignored to avoid loops
  const rebaseRequested =
    payload.action === "edited" &&
    payload.sender?.type !== "Bot" &&
    payload.pull_request?.user?.login === env.RENOVATE_BOT_LOGIN;

  const mergedToDefault =
    // One action covers both merged and unmerged PRs
    payload.action === "closed" &&
    // An unmerged PR changed nothing, and Renovate autocloses its own stale PRs
    payload.pull_request?.merged === true &&
    // Renovate only tracks the default branch
    payload.pull_request?.base?.ref === payload.repository?.default_branch;
  // No bot filter: an automerge by Renovate is the wanted case and cannot cause another merge

  return rebaseRequested || mergedToDefault;
}
