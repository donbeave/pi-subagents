# Benchmark protocol and raw results

Reproduces the comparison in [EVALUATION.md](EVALUATION.md). Everything here
was executed on 2026-11-11 with Pi 1.5.0, Node 26.13.0, on a loaded host
(load average ~16, 10 cores) — interleave candidates if you re-run, and treat
wall times as comparative, not absolute.

## Frozen inputs

| Item | Value |
|---|---|
| Fixture | [`benchmark/fixture/`](benchmark/fixture/) — `src/calc.js` with two planted bugs (`add` subtracts; `clamp` returns `v+1` in range), acceptance `npm test` (4 tests, 2 failing at base) |
| Coordinator (all candidates) | `zai/glm-5.3-flash`, thinking `high`, `pi -p -a --no-extensions -e <candidate extension>` |
| Worker round 1 | `minimax/MiniMax-M3.1-Flash`, thinking `high` |
| Worker round 2 | `xiaomi-token-plan-sgp/mimo-v2.6-flash`, thinking `high` |
| Worker task (verbatim) | "In this repo npm test fails. Find and fix the bugs in src/calc.js only. Run npm test until it passes. Report what you changed." |
| Six-worker probe | Six concurrent workers, `minimax/MiniMax-M3.1-Flash:low`, each running `sleep 25 && echo TOKEN-<candidate>-<i>`; success = all six tokens collected by the coordinator |
| Acceptance | Independent `npm test` re-run **and** `git diff` confined to `src/calc.js`; a "completed" label alone never counted |

Candidate entry points used (cloned at the versions in EVALUATION.md):
`tintinweb` `src/index.ts` · `xian0x5a` `src/index.ts` ·
`anasalqoyyum` `src/extension.ts` (plus its documented `approved: true`
project role for headless write delegation) ·
`purboo` `index.js` (after its own `npm run build`).

## Raw results

### Own test suites

| Candidate | Command | Result |
|---|---|---|
| tintinweb | `npx vitest run` | 124 files, 2558 passed, 7 skipped, 0 failed (24 s) |
| xian0x5a | `npm run test:fast` | ~1215 tests, 1 failed: `tests/child-runtime-preparation.test.ts` expects a non-`/private` macOS temp path |
| anasalqoyyum | `npm test` | 55 passed, 0 failed (16 s) |
| purboo | `npm run test:unit` | 1001 passed, 3 failed, 1018 total; each failing test passes in isolation |
| purboo | `npm run test:pi` | 233 passed, 12 failed, 246 total (shared live orchestrator present) |
| purboo | `npx pi-durable-subagents chaos` | 9/9 scenarios, duplicate runs 0, lost results 0, restarts-from-scratch 0 |

### Real-model runs

| Round | tintinweb | xian0x5a | anasalqoyyum | purboo |
|---|---|---|---|---|
| 1 · MiniMax `high` | Pass 41 s | Pass 43 s | Pass 45 s | Pass 69 s (thinking not applied; disclosed) |
| 2 · MiMo Flash `high` | Pass 57 s | Pass 54 s | Pass 53 s | Pass 38 s |
| 6 workers · MiniMax `low` | 6/6, 58 s | 6/6, 56 s | 6/6, 75 s | Queued at configured 2/provider slots; stopped by own run id before completion |

Every passing round produced the identical `src/calc.js` diff and an
independent 4/4 `npm test`. Model calibration without any extension
(plain `pi -p`, same fixture): GLM-5.3-Flash `high` 29 s, GLM-5.3 `high` 12 s,
MiMo-V2.6-Pro `high` 20 s, MiMo-V2.6-Flash `off` 24 s, MiniMax-M3.1-Flash
`max` 18 s — all passed; the fixture does not rank models.

## Re-run it

```bash
# 1. Create the fixture worktree for one candidate
git clone benchmark/fixture /tmp/bench-work && cd /tmp/bench-work

# 2. Run a coordinator with exactly one candidate extension loaded
pi -p -a --no-extensions -e /path/to/candidate/extension \
  --model zai/glm-5.3-flash --thinking high \
  "Delegate this fix to exactly one subagent on minimax/MiniMax-M3.1-Flash, thinking high: 'In this repo npm test fails. Find and fix the bugs in src/calc.js only. Run npm test until it passes.' Wait for it, then run npm test yourself and report the subagent's actual model and the test result."

# 3. Accept only on independent evidence
npm test && git diff -- src/
```

Rules that keep the comparison honest: exact `provider/modelId` pins only;
verify the effective model from the result/session, never the request;
rotate which model gets which task across rounds; never benchmark on a live
integration branch; count coordinator interventions separately from worker calls.
