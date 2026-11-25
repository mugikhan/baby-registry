# CLAUDE.md

## TypeScript changes

Before you write or change any TypeScript, load the `/typescript-best-practices` skill and follow it.
This applies to subagents too: tell each implementer subagent to read that skill first.

Zod is the schema library. Parse env vars, form data, cookies, and external JSON with Zod at the boundary.

## GitHub account

This is a personal repo. Use the personal account `mugikhan` for every Git and GitHub action.
Never use the work account `MugiKhanTFG`.

The global git identity, the default `github.com` SSH host, and the active `gh` account all point at the work account.

### Git

- Use the SSH alias `personal.github.com` for every remote:

  ```sh
  git remote set-url origin git@personal.github.com:mugikhan/baby-registry.git
  ```

- Keep the local identity set in this repo:

  ```sh
  git config user.name "Mughees Khan"
  git config user.email "mugikhan@gmail.com"
  ```

- Before a commit or push, check the identity and remote:

  ```sh
  git config user.email   # must print mugikhan@gmail.com
  git remote -v           # must show personal.github.com
  ```

### gh CLI

Prefix every `gh` command with the personal token. Do not run `gh auth switch`.

```sh
GH_TOKEN=$(gh auth token --user mugikhan) gh pr create ...
GH_TOKEN=$(gh auth token --user mugikhan) gh pr list
GH_TOKEN=$(gh auth token --user mugikhan) gh api user --jq .login   # must print mugikhan
```
