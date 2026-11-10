# Clean 4: the branch clean-up list (10 Nov 2026)

Lane R decision R-153 item 5, step 2. **Not done by the build session**: the session's GitHub access is refused every delete (the API answered "Write access to this GitHub API path is not permitted through this proxy" and a `git push --delete` answered 403). Nothing was deleted. Rashid, or the lane R chat with a login that may delete branches, runs the script below. The list was made on 10 Nov 2026 at 17:39 UTC against main 4662c46 (a full clone, not shallow).

Counts: **475 remote branches before** (main included). **463 to delete**, **12 kept** (main, 9 with an open pull request, 1 that is the base of an open pull request, 1 unmerged with no pull request). **After the script: 12.**

The 463:

- 433 are fully merged into main and have a pull request.
- 3 are fully merged into main and have no pull request (`claude/fix1-replies`, `claude/web3-shell`, `claude/web5-design-9-g7uc4h`).
- 27 are not merged into main, their pull request is closed, and the branch tip is exactly the pull request's last commit, so GitHub keeps every commit on the pull request (`refs/pull/<n>/head`) and nothing is lost. A closed-pull-request branch whose tip was newer than its pull request would have been kept; none was.

The full list with each tip commit (so any branch can be put back with `git push origin <sha>:refs/heads/<name>` while the commit is still in the repository) is `2026-11-10-clean4-branches.tsv` in this folder: name, tip sha, last commit date, reason.

## Kept (12)

| Branch | Last commit | Why kept |
|---|---|---|
| `main` | 2026-11-10 | the default branch |
| `dependabot/github_actions/github-actions-5d433b694c` | 2026-11-10 | open pull request 207 (into main) |
| `claude/q06` | 2026-09-29 | open pull request 11 (into claude/q07-owner) |
| `claude/q07-owner` | 2026-09-29 | open pull request 10 (into claude/q07-staff) |
| `claude/q07-staff` | 2026-09-29 | open pull request 9 (into claude/q07) |
| `claude/q07` | 2026-09-29 | open pull request 8 (into claude/q08) |
| `claude/q08` | 2026-09-29 | open pull request 7 (into claude/q04) |
| `claude/q04` | 2026-09-29 | open pull request 6 (into claude/q05) |
| `claude/q05` | 2026-09-29 | open pull request 5 (into claude/special-hours-guard) |
| `claude/special-hours-guard` | 2026-09-29 | open pull request 4 (into claude/q09) |
| `claude/q09` | 2026-09-29 | the base branch of open pull request 4; kept |
| `claude/fix1-web` | 2026-11-02 | unmerged, no pull request |

The eight `claude/q04` to `claude/q08`, `claude/q06`, `claude/q07*` and `claude/special-hours-guard` pull requests (4 to 11) have been open since 29 Sep 2026 (a chain of stacked pull requests that never merged). They are Rashid's to close or merge; once they are closed, their branches fall under the rule and the script deletes them.

## The script (run with your own GitHub login, in a checkout of this repository)

It re-reads the open pull requests for each branch first, and skips main, any branch with an open pull request, any branch that is the base of an open pull request, and any branch whose tip is no longer the sha in the list (someone pushed to it since). Run it once with `DRY=1` to see what it would do.

```bash
cd docs/progress/archive
DRY=1 bash -c '
repo=itskaysyoga-gif/kabsi-canvas
open=$(gh api --paginate "repos/$repo/pulls?state=open&per_page=100" --jq ".[]|.head.ref,.base.ref" | sort -u)
while IFS=$(printf "\t") read -r name sha date why; do
  [ "$name" = main ] && continue
  if printf "%s\n" "$open" | grep -qxF "$name"; then echo "skip (open pull request): $name"; continue; fi
  tip=$(gh api "repos/$repo/git/ref/heads/$name" --jq .object.sha 2>/dev/null || true)
  [ -z "$tip" ] && { echo "gone already: $name"; continue; }
  [ "$tip" = "$sha" ] || { echo "skip (tip moved): $name"; continue; }
  if [ -n "${DRY:-}" ]; then echo "would delete: $name"; else gh api -X DELETE "repos/$repo/git/refs/heads/$name" --silent && echo "deleted: $name"; fi
done < 2026-11-10-clean4-branches.tsv'
```

Run it again without `DRY=1` to delete. Read back: `gh api --paginate "repos/itskaysyoga-gif/kabsi-canvas/branches?per_page=100" --jq ".[].name" | wc -l` should print 12.
