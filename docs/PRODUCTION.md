# Production deployment: Pi-first multi-agent orchestration with Muse Code

This is the deployment selected by [EVALUATION.md](../EVALUATION.md).
Upstream usage documentation stays in the [README](../README.md) and
[docs/workflows.md](workflows.md); this file only records the decisions,
guardrails and verification for using this fork as the single multi-agent
system behind Muse Code.

## Architecture

```text
Muse Code (supervisor: objective, acceptance, escalation)
  -> one persistent Pi coordinator (pi --mode rpc, or pi -p for bounded work)
       -> this extension's Agent / SubagentWorkflow tools
            -> up to 6 workers, 2 per provider, each in its own Git worktree
       -> Pi-owned review, test, repair and integration
  <- validated milestone + evidence (diff, tests, effective models)
```

Target: at least 80% of agent-level execution, coordination and verification
inside Pi. Muse receives milestones and blockers, not tool-call noise.
A coordinator prompt response means "accepted", never "completed" — completion
is proven by tests and Git state.

## Install (project-local, the only supported deployment here)

```bash
pi install --local npm:@tintinweb/pi-subagents@0.23.2
pi list   # expect exactly this one subagent package for the project
```

This repository already carries `.pi/settings.json` pinning that package and
`.pi/agents/w1..w6` worker definitions, so a fresh clone in a trusted Pi
project needs no further setup (verified by a two-worker pilot run from a
clean fixture clone using only these files: implementer on
`minimax/MiniMax-M3.1-Flash` and scout on `xiaomi-token-plan-sgp/mimo-v2.6-flash`
both completed, tests 4/4, diff confined to the assigned file). Do not install a second subagent extension
(xian0x5a, anasalqoyyum or purboo packages) into the same project: several of
them register the same `Agent`-style tools and will shadow each other.

## Worker allocation (exact pins only)

| Worker | Agent file | Model | Thinking | Role |
|---|---|---|---|---|
| W1 | `.pi/agents/w1-scout.md` | `xiaomi-token-plan-sgp/mimo-v2.6-flash` | `high` | Exploration, audits |
| W2 | `.pi/agents/w2-impl-strong.md` | `xiaomi-token-plan-sgp/mimo-v2.6-pro` | `high` | Complex implementation |
| W3 | `.pi/agents/w3-impl.md` | `minimax/MiniMax-M3.1-Flash` | `high` | Implementation |
| W4 | `.pi/agents/w4-audit.md` | `minimax/MiniMax-M3.1-Flash` | `max` | Independent review |
| W5 | `.pi/agents/w5-tests.md` | `zai/glm-5.3-flash` | `high` | Regression tests |
| W6 | `.pi/agents/w6-fix-strong.md` | `zai/glm-5.3` | `max` | Difficult fixes, integration |

Rules that are not optional:

1. **Exact `provider/modelId` pins only.** This extension's model resolver
   deliberately falls back (exact → fuzzy → cross-provider) when a pin does
   not match. A fuzzy name like `sonnet` or a typo'd provider can therefore
   run a different model than intended. Production agent files pin full IDs,
   and every coordinator report must state the *effective* model taken from
   the subagent result, which the coordinator compares against the pin.
   Mismatch = failed run, not a silent success.
2. **Only the eligible models above.** No older generations, no invented
   MiniMax Pro. Verify availability before a run:
   `pi auth check --model minimax/MiniMax-M3.1-Flash` (and likewise per model).
3. **Thinking levels are per-provider:** MiMo `off|high`, MiniMax
   `low|medium|high|xhigh|max`, GLM-5.3 family `low|high|max`. Requesting an
   unsupported level can be clamped by Pi; the effective model/effort in the
   result is the only evidence that counts.

## Worktree and integration policy

- The coordinator creates one Git worktree per writing worker *before*
  spawning (`git worktree add ../wt-<task> -b pi/<task> <base>`), and assigns
  that directory as the worker's `cwd`.
- Do **not** use the extension's built-in isolated-worktree mode for
  production code changes: it can auto-commit and remove the checkout, which
  bypasses independent validation.
- Workers never commit, merge or push. The coordinator reviews each diff,
  runs the tests itself in the worker's worktree, and only then integrates.
  Unverified changes are never merged.
- Read-only workers (W1, W4) may share the main checkout.

## Coordinator contract

Every delegation from Muse to the Pi coordinator states: objective,
base commit, worker allocation, acceptance tests, and the report format
(worker, effective model + thinking, outcome, test evidence, diff stat,
blockers). The coordinator decomposes, spawns, steers, collects, reviews,
repairs and integrates inside Pi, and returns one milestone report.
Intervene from Muse only on: effective-model mismatch, failed
acceptance after one Pi-owned repair loop, or an external blocker.

## Failure handling

| Failure | Expected behaviour |
|---|---|
| Worker fails / errors | Coordinator records it as failed (never as completed), retries once with a fresh worker or escalates. |
| One worker must stop | Stop that agent only (`stop_subagent` equivalent in the fleet UI / tool surface); unrelated workers continue. |
| Coordinator (Pi) restarts | Sessions are saved by the extension; resume explicitly and collect completed-but-uncollected results before spawning replacements. No durable journal is promised — Git worktrees are the recovery record for code. |
| Provider quota / rate limit | That provider's workers queue or fail visibly; reassign the task to another provider's worker with an exact pin. Never let a pin silently fall back. |
| Interrupted edit | The worktree diff shows the partial state; the coordinator inspects and either repairs or discards that worktree — the integration branch is never touched by workers. |

If crash-proof, journalled execution becomes the primary requirement,
re-evaluate `purboo/pi-durable-subagents` (chaos harness 9/9 in this
evaluation) or `xian0x5a/pi-durable-subagents` (durable obligations) with the
protocol in [BENCHMARK.md](../BENCHMARK.md) before switching.

## Cleanup state (2026-11-11)

- Installed globally before the evaluation and **kept**: `npm:pi-durable-subagents`
  (purboo) — its shared orchestrator had live workflows from other sessions;
  removing it would disturb active work. It is outside the selected
  architecture. Note: its local pool config referenced `minimax/MiniMax-M3`
  (an ineligible older model); do not route new work through that pool.
- Installed during the evaluation: **nothing globally.** All candidates ran
  via per-invocation `pi -e <path> --no-extensions` in isolated clones.
- One benchmark workflow on the purboo orchestrator was stopped by its own
  run id (`stop --request bench6cleanup 01M74G9GMDGZ7SEG1AWBFV6QM8`); no other
  workflow, session or worktree was touched.
- Verify at any time with `pi list` for global packages (expect only the
  pre-existing purboo entry) and by inspecting this repo's `.pi/settings.json`
  (the only project package is `@tintinweb/pi-subagents@0.23.2`; Pi resolves it
  into `.pi/npm/` on first use, as the deployment pilot in EVALUATION.md proved).
