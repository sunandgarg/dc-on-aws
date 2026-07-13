#!/usr/bin/env bash
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"
MESSAGE="${1:-deploy: production update}"
NODE20_BIN="/opt/homebrew/opt/node@20/bin"

if [ -d "$NODE20_BIN" ]; then
  export PATH="$NODE20_BIN:$PATH"
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository."
  exit 1
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "You are on '$CURRENT_BRANCH'. Switch to '$BRANCH' before deploying."
  exit 1
fi

echo "Running TypeScript check..."
npx tsc --noEmit

echo "Running production build..."
npx vite build

if git diff --quiet && git diff --cached --quiet; then
  echo "No local changes to commit."
else
  git add .
  git commit -m "$MESSAGE"
fi

echo "Pushing '$BRANCH' to origin..."
git push origin "$BRANCH"

echo "Pushed. Cloudflare Pages should start deployment automatically once Git integration is connected."
