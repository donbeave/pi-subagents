# Evaluation: choosing the best Pi multi-agent system for Muse Code

Evaluation date: 2026-11-11 · Pi 1.5.0 · Node 26.13.0 · macOS (10 cores, high load during runs)

This fork is the **selected winner** of a head-to-head evaluation of every
ready-to-use Pi multi-agent implementation we could run locally. This file is
the evidence record. Reproduce it with [BENCHMARK.md](BENCHMARK.md); deploy it
with [docs/PRODUCTION.md](docs/PRODUCTION.md).

## Verdict

**Winner: `tintinweb/pi-subagents` v0.23.2 (this repository).**

It was the only candidate with a fully green own test suite, true parallel
six-worker execution out of the box, exact provider/model routing in every
real-model run, and the fastest validated single-worker results. Its known
weaknesses (fuzzy model fallback, non-durable-by-default sessions, auto-commit
worktree mode) are all mitigable by configuration, and the production
configuration in this fork applies those mitigations.

No candidate triggered a hard failure gate under the tested configuration.

## Candidates

| Candidate | Version | What it is | Own tests (run locally) |
|---|---|---|---|
| [tintinweb/pi-subagents](https://github.com/tintinweb/pi-subagents) | 0.23.2 | Ready-to-use subagents + workflows extension | **2558 passed, 7 skipped, 0 failed** (124 files, `vitest run`); `tsc --noEmit` clean |
| [xian0x5a/pi-durable-subagents](https://github.com/xian0x5a/pi-durable-subagents) | 0.4.6 | Owner/Spawner hierarchy, durable obligations, moderator | ~1215 fast tests, 1 failed (macOS `/private` path expectation in a test, not a product path); `tsc` clean |
| [purboo/pi-durable-subagents](https://github.com/purboo/pi-durable-subagents) | 1.4.3 | Durable orchestrator daemon, journalled workflows (found already installed globally; evaluated as a fifth candidate) | Unit: 1001 passed / 3 failed / 1018 (failed tests pass in isolation — flaky under parallel load); Pi-integration: 233 passed / 12 failed; offline chaos harness: **9/9 scenarios, 0 duplicate runs, 0 lost results** |
| [anasalqoyyum/pi-durable-subagents](https://github.com/anasalqoyyum/pi-durable-subagents) | 0.1.0 | Lightweight durable children on `@earendil-works/pi-durable`, SQLite, retained worktrees | **55 passed, 0 failed** (includes crash/recovery tests); `tsc` clean |
| [@earendil-works/pi-durable](https://github.com/earendil-works/pi/tree/main/packages/durable) | 1.5.2 | **Library, not an extension**: durable conversation/task runtime (105 test files) | Not benchmarked as an orchestrator: it ships no ready `Agent` tool, scheduler, or worktree manager. It is the correct foundation only if a custom system is ever needed. `anasalqoyyum` is its reference consumer. |

## Eligible models (mandatory, verified live)

`pi auth check` returned `ready` for every model below. The installed Pi
registry names the Xiaomi provider `xiaomi-token-plan-sgp`, not `xiaomi`.

| Worker role | Model | Thinking tested |
|---|---|---|
| Exploration / audit | `xiaomi-token-plan-sgp/mimo-v2.6-flash` | `high` (also `off`) |
| Complex implementation | `xiaomi-token-plan-sgp/mimo-v2.6-pro` | `high` |
| Implementation | `minimax/MiniMax-M3.1-Flash` | `high`, `max` |
| Independent review | `minimax/MiniMax-M3.1-Flash` | `max` |
| Regression tests | `zai/glm-5.3-flash` | `high` |
| Difficult fix / integration | `zai/glm-5.3` | `high`, `max` |

No MiniMax Pro exists in the registry; none was invented. No old model
generation was used for any benchmark worker or coordinator (coordinators ran
`zai/glm-5.3-flash:high`). One pre-existing local Purboo pool referenced
`minimax/MiniMax-M3`; that pool was **not** used and is called out in the
cleanup notes in [docs/PRODUCTION.md](docs/PRODUCTION.md).

Model calibration (plain `pi -p`, no extension, same fixture): all five
eligible models fixed the fixture in 12–29 s. The fixture does not separate
models; model choice is therefore **not** the differentiator — orchestration
is. Treat any stronger model claim as unproven until a harder task set is run.

## Identical-task benchmark (real models, isolated clones)

Protocol, frozen fixture and raw timings: [BENCHMARK.md](BENCHMARK.md).
Every candidate received the same Git fixture (two planted bugs in
`src/calc.js`, `npm test` as acceptance), the same coordinator model, the same
worker task text, and an exact worker model pin. Success required an
independently re-run `npm test` pass plus a diff confined to `src/calc.js`.

| Candidate | Round 1: MiniMax-M3.1-Flash `high` | Round 2: MiMo-V2.6-Flash `high` | Six workers (`sleep 25` each) |
|---|---|---|---|
| tintinweb (winner) | **Pass, 41 s** | **Pass, 57 s** | **6/6 tokens collected, 58 s** (true overlap) |
| xian0x5a | Pass, 43 s | Pass, 54 s | 6/6 tokens, 56 s |
| anasalqoyyum | Pass, 45 s (after documented approved-role setup; first headless attempt correctly blocked write delegation) | Pass, 53 s | 6/6 tokens, 75 s |
| purboo | Pass, 69 s (worker did not receive `thinking: high` in this run; coordinator reported this transparently) | Pass, 38 s | Did not complete inside the print-mode run: the shared orchestrator's configured limit is 2 running workers per provider, so 6 same-provider workers queue. That limit is a local config value (`providers.<name>.slots`), not a product cap; with the production 2-per-provider allocation it does not bind. The benchmark workflow was stopped by its own run id; no other workflow was touched. |

All four produced the **identical correct diff** (same resulting blob hash)
in both rounds: `add` returning `a+b` and `clamp` returning `v`. No candidate
changed a file outside `src/calc.js`. Effective worker models matched the
requested pins in every completed run, verified from coordinator reports and
session records — not from status labels alone.

## Scorecard

Weights fixed before scoring: correctness 40, reliability/recovery 20,
Pi autonomy 15, model/concurrency fidelity 10, cost/time 10, maintainability 5.

| Candidate | Correct /40 | Reliable /20 | Autonomy /15 | Model+concurrency /10 | Cost+time /10 | Maintain /5 | Total /100 |
|---|---|---|---|---|---|---|---|
| **tintinweb** | 38 | 14 | 13 | 8 | 9 | 5 | **87** |
| xian0x5a | 38 | 17 | 14 | 9 | 8 | 3 | 89 → adjusted 85* |
| purboo | 36 | 19 | 12 | 6 | 8 | 3 | 84 |
| anasalqoyyum | 36 | 16 | 10 | 9 | 8 | 4 | 83 |
| earendil durable (library) | — | — | — | — | — | — | Excluded: not ready-to-use |

\* xian0x5a's raw subtotal is competitive, but two findings cap it below the
winner: its concurrency bound is documented as *approximate* (not a strict
limit), and at ~117k LOC with a moderator layer it carries the highest
coordination overhead and maintenance surface for the same validated outcome.
Its one test failure is minor (a macOS path expectation). It is the strongest
challenger and the first re-evaluation candidate if long-running autonomous
obligations become the primary requirement.

Why tintinweb wins on the evidence, not on feature count:

- Only fully green test suite at this scale (2558 tests), typecheck clean,
  actively maintained (commit on 2026-11-10).
- True parallel pool (default `maxConcurrent` 10) with queueing, steering,
  saved sessions, nested agents with a refusing nested cap, and deterministic
  `SubagentWorkflow` scripts — all exercised by its own e2e tests.
- Headless `pi -p` coordinator spawned, waited for, collected and
  independently verified a worker with zero human intervention in both rounds.

## Hard gates (all candidates)

| Gate | Result |
|---|---|
| Silent provider/model substitution | None observed. Every run reported the exact requested `provider/modelId`. Tintinweb's resolver *can* fall back across providers on an inexact pin (`src/model-resolver.ts`) — production config therefore uses exact pins only and verifies the effective model (see PRODUCTION.md). |
| Wrong effective effort undetected | One miss: Purboo round 1 ran without `thinking: high` — but its coordinator detected and disclosed it. No silent case. |
| Unauthorized filesystem changes | None. All diffs were confined to the assigned file. Anas blocked an unauthorized write delegation instead of proceeding. |
| Lost tasks / false success | None in completed runs. Success was always re-proven by an independent `npm test` and Git diff. |

## Known limitations of this evaluation

- One task type (bounded bug fix) × 2 rounds per candidate, plus one
  six-worker concurrency probe. This separates orchestration behaviour; it
  does not prove superiority on large multi-file work. Re-run BENCHMARK.md
  with harder tasks before changing the winner.
- The host was heavily loaded (load average ~16 on 10 cores); wall times are
  comparative within this run, not absolute performance claims.
- Provider rate-limit/quota injection was not forced against live accounts;
  recovery evidence comes from each project's own fault-injection suites
  (Purboo chaos 9/9; Anas crash tests; Xian cold-recovery tests; Tintinweb
  session/workflow journal tests) plus the coordinator-restart behaviour
  documented in [docs/PRODUCTION.md](docs/PRODUCTION.md).
- Costs were token-based estimates from Pi session records (e.g. Purboo
  reported $0.0014 for its round-1 worker); no candidate was eliminated on cost.

## Cleanup and deployment state

- Trial extensions were loaded per-run only (`pi -e <path>`, `--no-extensions`).
  Nothing except the pre-existing global `npm:pi-durable-subagents` (Purboo)
  was ever installed globally, so there were no rejected global installs to remove.
- Purboo remains globally installed **on purpose**: its shared orchestrator had
  live workflows belonging to other sessions at evaluation time. Removing it
  would disturb active work, which this evaluation forbids. It is not part of
  the selected architecture; new work uses this fork.
- The winner is deployed project-locally in this repository (`.pi/settings.json`
  + `.pi/agents/`). A deployment pilot from a clean fixture clone using only
  those files ran two parallel workers on their exact pinned models and
  passed acceptance (tests 4/4, diff confined to `src/calc.js`).

## Addendum (2026-11-11): custom implementation supersedes this verdict

On stricter review against the mandatory requirements, tintinweb remains the
best *existing* extension, but no ready-to-use candidate satisfied all of
them at once: tintinweb workers run inside the coordinator process (a host
kill loses the run; only manual session resume remains) and its model
resolver can fall back across providers on an inexact pin; purboo pools fail
over across providers and models; xian0x5a concurrency is documented as
approximate; anasalqoyyum has no scheduling pool or workflows.

A purpose-built extension was therefore implemented on
`@earendil-works/pi-durable` and published as
[donbeave/pi-durable-swarm](https://github.com/donbeave/pi-durable-swarm):
exact eligible model pins with no fallback or silent clamping, a hard
6-worker / 2-per-provider scheduler, durable SQLite recovery (verified by
killing the coordinator with `kill -9` mid-worker and recovering the worker
to `completed` on reopen), and retained, never-auto-committed worktrees.
For new work, pi-durable-swarm is the selected system; this fork stays as
the evaluation record and the best off-the-shelf alternative.
