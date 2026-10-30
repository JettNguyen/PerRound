#!/bin/sh
# Puts the site on GitHub Pages: writes the price files from the local database, builds the site for
# its address under the GitHub Pages domain, and pushes the result to the gh-pages branch.
# Run `npm run crawl` first for fresh prices.
set -e
cd "$(dirname "$0")/.."

npm run export
BASE_PATH="${BASE_PATH:-/PerRound/}" npm run build
# without this, GitHub runs the files through Jekyll, which skips some of them
touch apps/web/dist/.nojekyll

# the built site lives on its own branch, checked out in .pages so the code branch never sees it
if [ ! -d .pages ]; then
  if git ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
    git fetch origin gh-pages
    git worktree add .pages gh-pages
  else
    git worktree add --orphan -b gh-pages .pages
  fi
fi

cd .pages
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R ../apps/web/dist/. .
git add --all .
if git commit -q -m "prices as of $(date '+%m/%d %H:%M')"; then
  git push origin gh-pages
else
  echo "Nothing changed since the last deploy."
fi
