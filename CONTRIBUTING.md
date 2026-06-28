# Contributing

First off, thanks for taking the time to contribute!

## Setup

```sh
git clone <your-fork>
cd gerbaudo

cd cli
npm install

cd ../sdk/node
npm install
```

## Code style

- TypeScript with strict mode
- ESM (`"type": "module"`, imports use `.js` extension)
- No semicolons preference, but not enforced
- Formatting handled by Prettier (run `npx prettier --write .` before committing)

## Tests

```sh
cd cli && npm test            # unit tests
cd sdk/node && npm test       # SDK tests
npx tsx test-integration.ts   # integration (from repo root)
```

All tests must pass before submitting a PR.

## Project structure

```
cli/             @gerbaudo/cli      — CLI + Express daemon + SQLite
sdk/node/        @gerbaudo/sdk-node — Express middleware + client
test-integration.ts                — end-to-end smoketest
```

## Pull request process

1. Fork the repo and create a branch from `main`
2. If adding code, add tests
3. Ensure all CI checks pass
4. Update docs if needed (README, JSDoc)
5. Open a PR with a clear title and description

## Commit messages

Use conventional commits: `fix:`, `feat:`, `docs:`, `chore:`, etc.

## Questions?

Open a [Discussion](https://github.com/gerbaudo19/gerbaudo/discussions).
