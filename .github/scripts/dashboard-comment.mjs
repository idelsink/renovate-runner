const MAX_ENTRIES = 10;

/**
 * Converts an ISO timestamp to a filesystem/branch-safe slug.
 * e.g. "2026-04-05T12:34:56.000Z" becomes "2026-04-05-123456"
 * @param {string} ts
 * @returns {string}
 */
function toSlug(ts) {
  return ts.replace('T', '-').replace(/:/g, '').replace(/\.\d+Z$/, '');
}

/**
 * Extracts the stored entries array from a comment body's hidden data block.
 * Returns an empty array if the comment is missing or malformed.
 * @param {string|undefined} commentBody
 * @returns {object[]}
 */
function parseEntries(commentBody) {
  if (!commentBody) return [];
  const match = commentBody.match(/<!-- renovate-logs-data: (.*) -->/);
  if (!match) return [];
  try {
    const entries = JSON.parse(match[1]);
    // Migrate legacy entries that used `ts` instead of `started_at`.
    return entries.map(e => {
      if (e.ts && !e.started_at) {
        const { ts, ...rest } = e;
        return { started_at: ts, ...rest };
      }
      return e;
    });
  } catch { return []; }
}

/** @type {Record<string, string>} Human-readable label for each run status. */
const STATUS_LABEL = {
  running: '🔄 Running...',
  success: '✅ Passed',
  failure: '❌ Failed',
};

/**
 * Builds the full markdown comment body from an entries array.
 * @param {object[]} entries
 * @param {string} runnerRepo - "owner/repo" of this runner, used for workflow run links
 * @param {string} targetOwner - owner of the managed repo, used for log file links
 * @param {string} targetRepo - name of the managed repo, used for log file links
 * @returns {string}
 */
function buildBody(entries, runnerRepo, targetOwner, targetRepo) {
  const durationFmt = new Intl.DurationFormat('en', { style: 'narrow' });

  const rows = entries.map(e => {
    const label = STATUS_LABEL[e.status] ?? `⚠️ Unknown (${e.status})`;
    const durationSecs = e.started_at && e.completed_at
      ? Math.round((new Date(e.completed_at) - new Date(e.started_at)) / 1000)
      : null;
    const result = durationSecs != null
      ? `${label} in ${durationFmt.format({ seconds: durationSecs })}`
      : label;
    const runDate = new Date(e.started_at).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
    const workflowUrl = `https://github.com/${runnerRepo}/actions/runs/${e.workflow_id}`;
    const slug = toSlug(e.started_at);
    const logUrl = e.status !== 'running'
      ? `https://github.com/${targetOwner}/${targetRepo}/blob/renovate-logs/${slug}-${e.workflow_id}/.github/logs/renovate-${slug}-${e.workflow_id}.log`
      : null;
    return `| ${runDate} | ${result} | [${e.workflow_id}](${workflowUrl}) | ${logUrl ? `[renovate-${slug}-${e.workflow_id}.log](${logUrl})` : '-'} |`;
  }).join('\n');

  return [
    '<!-- renovate-logs -->',
    `<!-- renovate-logs-data: ${JSON.stringify(entries)} -->`,
    '',
    '### Renovate Run History',
    '',
    `Automatically posted by the [renovate-runner](https://github.com/${runnerRepo}) after each run on this repository.`,
    '',
    '| Run date (UTC) | Result | Runner workflow | Renovate output |',
    '| -------------- | ------ | --------------- | --------------- |',
    rows,
  ].join('\n');
}

/**
 * Finds the Dependency Dashboard issue, retrying every 5s up to 30s if not found.
 * @param {object} github
 * @param {string} owner
 * @param {string} repo
 * @param {string} appSlug
 * @param {boolean} [retry=false]
 * @returns {Promise<object|null>}
 */
async function findDashboard(github, owner, repo, appSlug, retry = false) {
  const maxAttempts = retry ? 6 : 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 5_000));
    const issues = await github.paginate(github.rest.issues.listForRepo, {
      owner, repo, state: 'open', creator: `${appSlug}[bot]`,
    });
    const dashboard = issues.find(issue => issue.title.includes('Dependency Dashboard'));
    if (dashboard) return dashboard;
  }
  return null;
}

/**
 * Finds the Dependency Dashboard issue in the target repo and upserts the run history comment.
 * The entry for the current run (matched by workflow_id) is replaced, so a pre-run 'running'
 * entry becomes the final result without creating a duplicate row.
 * @param {object} github - Octokit client from actions/github-script
 * @param {object} context - Actions context from actions/github-script
 * @param {object} options
 * @param {string} options.owner - target repo owner
 * @param {string} options.repo - target repo name
 * @param {string} options.appSlug - GitHub App slug used to find the dashboard issue
 * @param {{ started_at: string, status: 'running'|'success'|'failure', completed_at?: string }} options.entry
 * @param {boolean} [options.deleteBranches=false] - prune log branches outside the keep window
 * @param {boolean} [options.retryOnMissing=false] - retry finding the dashboard if not immediately found (for first run where Renovate just created it)
 * @returns {Promise<boolean>} true if the dashboard was found and the comment was posted, false if the dashboard does not exist
 */
async function postEntry(github, context, { owner, repo, appSlug, entry, deleteBranches = false, retryOnMissing = false }) {
  const runnerRepo = `${context.repo.owner}/${context.repo.repo}`;

  const dashboard = await findDashboard(github, owner, repo, appSlug, retryOnMissing);
  if (!dashboard) return false;

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner, repo, issue_number: dashboard.number,
  });
  const existingComment = comments.find(comment => comment.body.includes('<!-- renovate-logs -->'));

  entry.workflow_id = String(context.runId);

  const allEntries = [entry, ...parseEntries(existingComment?.body).filter(e => e.workflow_id !== entry.workflow_id)];

  if (deleteBranches) {
    const keepSlugs = new Set(
      allEntries.slice(0, MAX_ENTRIES)
        .filter(e => e.started_at && e.workflow_id)
        .map(e => `${toSlug(e.started_at)}-${e.workflow_id}`)
    );
    const allLogRefs = await github.paginate(github.rest.git.listMatchingRefs, {
      owner, repo, ref: 'heads/renovate-logs/',
    });
    for (const { ref } of allLogRefs) {
      // ref = "refs/heads/renovate-logs/SLUG"
      const slug = ref.split('/renovate-logs/')[1];
      if (slug && !keepSlugs.has(slug)) {
        try { await github.rest.git.deleteRef({ owner, repo, ref: `heads/renovate-logs/${slug}` }); } catch {}
      }
    }
  }

  const body = buildBody(allEntries.slice(0, MAX_ENTRIES), runnerRepo, owner, repo);

  if (existingComment) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existingComment.id, body });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: dashboard.number, body });
  }
  return true;
}

export {
  toSlug,
  parseEntries,
  buildBody,
  postEntry,
};
