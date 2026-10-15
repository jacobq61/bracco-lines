#!/usr/bin/env bash
# Runs inside one GitHub Actions job for ~5.5 hours: reads Bracco's lines every 3 minutes and
# force-pushes landing-lines.json to the gh-pages branch (one commit, so the repo never grows).
# A new job is always queued behind this one (see .github/workflows/lines.yml), so coverage is continuous.
set -u
REPO="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
END=$((SECONDS + ${LOOP_SECONDS:-19800}))
SITE=$(mktemp -d)
FAILS=0
while [ $SECONDS -lt $END ]; do
  start=$SECONDS
  if OUT="$SITE/landing-lines.json" node bin/run.mjs; then
    (
      cd "$SITE" && rm -rf .git && git init -q -b gh-pages &&
      printf 'Bracco landing lines feed. See landing-lines.json\n' > index.html && touch .nojekyll &&
      git add -A && git -c user.name=bracco-lines -c user.email=bracco-lines@users.noreply.github.com commit -qm "lines $(date -u +%FT%TZ)" &&
      git push -qf "$REPO" gh-pages
    ) && echo "published" && FAILS=0
  else
    echo "read failed; keeping the last published file"
    FAILS=$((FAILS + 1))
    # ~30 minutes of failures: fail the job so GitHub emails the repo owner. The next queued run keeps trying.
    [ $FAILS -ge 10 ] && { echo "::error::Bracco lines unreadable for 30 minutes (site down or layout changed)"; exit 1; }
  fi
  wait=$((180 - (SECONDS - start))); [ $wait -gt 0 ] && sleep $wait
done
