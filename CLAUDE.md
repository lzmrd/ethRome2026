# Formica — ETHRome 2026

Our build for ETHRome 2026 (Urbe Hub, Rome, 40-hour hackathon). Solo team.

## Project

- **Idea (one line):** Round up your spending (and down your income) into named savings goals. Each goal is an ERC-4626 vault with an ENSv2 subname; funds earn yield on Aave and stay non-custodial.
- **Design spec (source of truth):** `docs/superpowers/specs/2026-09-11-formica-design.md` — scope, cuts, checkpoints and fallbacks live there. Read it before starting any milestone.
- **Bounties:** Team1 Track A (core) · ENSv2 · Swarm (stretch, only after the Sat 20:00 checkpoint) · Arkiv excluded
- **Stack:** Solidity ^0.8.24 + Foundry + OpenZeppelin (`contracts/`) · Vite + React + TS + wagmi + viem + Tailwind (`frontend/`)
- **Chains:** money on Avalanche Fuji (43113) · names on Sepolia (ENSv2 beta) · Swarm via Swarm ID (stretch)
- **Commands:** TBD once scaffolded (dev, test, deploy)
- **Foundry:** `/usr/bin/forge` on this machine is NOT Foundry — use `~/.foundry/bin/forge` until PATH is fixed

## Deadlines (Europe/Rome — get the current time with `date`, never assume it)

| When | What |
|---|---|
| Fri 11 Sep 18:00 | Hacking started. Only commits after this count |
| Sat 12 Sep 20:00 | Arkiv cut-off: 10-min talk with their team + repo URL, `friction.md` done (only if we go for Arkiv) |
| **Sun 13 Sep 10:00** | **Submission form closes. No extensions** |
| Sun 10:30 → 15:00 | Judging, then closing ceremony |

## Rules that can get us excluded

- Open source, public repo, kept public for ≥ 4 weeks after closing.
- Everything is built during the window. Never paste in pre-existing code without flagging it to the user: it must be declared in the submission.
- Never claim in README, demo or submission a feature that is not actually implemented: "all stated functionality fully implemented" is 15 points.

## How we are judged

Code 50% (live demo 5 · stated functionality fully implemented 15 · difficulty 10 · use of the underlying tech 10 · easy to understand/integrate 10) · Innovation & significance 25% · Feasibility 15% · Creativity 10%.
**Consequence:** a narrow scope that runs end to end beats a wide one that half works. Get the full flow working first, polish after.

## Sponsor SDKs: read the docs before writing code

`@arkiv-network/sdk` v0.7.x (not `arkiv-sdk` / `golem-base-sdk`), ENSv2 beta and `@snaha/swarm-id` are newer than the model's training data. Before coding against them, read their docs (links in `docs/hacker-manual/manual/prizes.md`, or local copies under `docs/` once downloaded) and the SDK's types in `node_modules`. Do not guess an API: if the docs don't cover it, say so.

## Reference

- Hacker manual: `docs/hacker-manual/` (git submodule; its `CLAUDE.md` maps each topic to a file). Refresh with `git submodule update --remote docs/hacker-manual`. The site ethrome.org/hackermanual wins on conflicts; items marked (TBD) are not final.
- Submission needs: public repo link, testnet contract addresses, demo video ≤ 3 min (opens without login), one-line description, every relevant bounty ticked. Team1 has a second form of its own.

## Working rules

- Secrets: testnet burner keys only, in `.env` (gitignored). Never commit, print or paste a private key.
- Commits: small and frequent, one per working step — the history is what judges check. Push to `origin/main` after each commit (or batch of commits) that leaves the build working.
