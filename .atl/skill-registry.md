# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" | judgment-day | /home/vprado/.claude/skills/judgment-day/SKILL.md |
| Writing Go tests, using teatest, or adding test coverage | go-testing | /home/vprado/.claude/skills/go-testing/SKILL.md |
| User asks to create a new skill, add agent instructions, or document patterns for AI | skill-creator | /home/vprado/.claude/skills/skill-creator/SKILL.md |
| Creating a pull request, opening a PR, or preparing changes for review | branch-pr | /home/vprado/.claude/skills/branch-pr/SKILL.md |
| Creating a GitHub issue, reporting a bug, or requesting a feature | issue-creation | /home/vprado/.claude/skills/issue-creation/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### judgment-day
- Launch TWO judge sub-agents in parallel (async) — never sequential
- Neither judge knows about the other — no cross-contamination
- Orchestrator synthesizes verdicts: Confirmed (both found) = fix immediately; Contested (one found) = use judgment; Unique (one found) = note and fix if >7/10 confidence
- Inject compact rules from skill-registry into BOTH judge prompts AND fix agent prompt
- After fixes, re-run both judges — escalate after 2 iterations if still failing
- NEVER do the review yourself as orchestrator

### go-testing
- Use table-driven tests with `[]struct{name, input, expected, wantErr}` pattern
- Run tests with `go test ./...` and coverage with `go test -cover ./...`
- For Bubbletea TUI: use `teatest` package with `tt.FinalModel(t, m, teatest.WithFinalTimeout(time.Second))`
- Golden files: read from `testdata/*.golden`, update with `-update` flag
- Integration tests: use `net/http/httptest` (built-in, no extra deps)
- Test names: `TestFunctionName_Scenario` format
- Always use `t.Parallel()` for independent tests

### skill-creator
- Skill file location: `skills/{skill-name}/SKILL.md` (project) or `~/.claude/skills/{skill-name}/SKILL.md` (user)
- Required frontmatter: name, description (with Trigger:), license, metadata.author
- Compact rules are the most critical output — 5-15 lines max, only actionable patterns
- After creating a skill, run `skill-registry` to update the registry
- SKILL.md structure: frontmatter → When to Use → Critical Patterns → Rules

### branch-pr
- Every PR MUST link an approved issue (status:approved label) — no exceptions
- Branch naming: `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$`
- Every PR MUST have exactly one `type:*` label
- Run shellcheck on any modified scripts before opening PR
- Use conventional commits: `type(scope): description`
- Automated checks must pass before merge

### issue-creation
- MUST use a template (bug report or feature request) — blank issues are disabled
- Every issue gets `status:needs-review` automatically on creation
- A maintainer MUST add `status:approved` before any PR can be opened
- Questions go to Discussions, not issues
- Search for duplicates before creating a new issue

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| — | — | No project-level convention files found (empty project) |

Read the convention files listed above for project-specific patterns and rules.
