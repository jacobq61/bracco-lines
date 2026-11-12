#!/usr/bin/env bash
# Kaz Flock scope guard. Fails if a change adds a reference to an out-of-scope system
# (see "Project scope (hard boundary)" in AGENTS.md).
#   .github/scripts/scope-guard.sh [base-ref]     (default origin/main; compares base...HEAD)
# Exemptions live in .github/scope-guard-allow.txt (CODEOWNERS-protected), one per line:
#   <path-glob> file    the whole file is exempt
#   <path-glob> block   only lines inside the kaz-flock-scope BEGIN/END markers are exempt
# It also fails if AGENTS.md loses its scope block.
set -euo pipefail

BASE="${1:-origin/main}"
PATTERN='bet105|bracco[-_ ]?(social|analytics|admin)|mad[-_ ]?haus'
ALLOW_FILE=.github/scope-guard-allow.txt
BEGIN_MARK='BEGIN:kaz-flock-scope'
END_MARK='END:kaz-flock-scope'

mode_for() {
  local path=$1 glob mode
  [ -f "$ALLOW_FILE" ] || return 0
  while read -r glob mode _; do
    [ -z "${glob:-}" ] && continue
    [[ $glob == \#* ]] && continue
    # shellcheck disable=SC2053
    if [[ $path == $glob ]]; then echo "$mode"; return 0; fi
  done < "$ALLOW_FILE"
}

in_block() {
  # in_block <file> <line>: is the line inside a scope block of the file at HEAD?
  awk -v n="$2" -v b="$BEGIN_MARK" -v e="$END_MARK" '
    index($0, b) { inside = 1 }
    NR == n { found = inside; exit }
    index($0, e) { inside = 0 }
    END { exit found ? 0 : 1 }' "$1"
}

fail=0
report() { echo "::error file=$1,line=$2::Out-of-scope reference: $3"; fail=1; }

while IFS= read -r path; do
  if grep -qiE "$PATTERN" <<<"$path" && [ -z "$(mode_for "$path")" ]; then report "$path" 1 "file name"; fi
done < <(git diff --name-only --diff-filter=ACMR "$BASE"...HEAD)

file=""
lineno=0
while IFS= read -r line; do
  case "$line" in
    "+++ b/"*) file=${line#+++ b/}; continue ;;
    "+++ "*) file=""; continue ;;
    "@@ "*)
      lineno=$(sed -E 's/^@@ -[0-9,]+ \+([0-9]+).*/\1/' <<<"$line"); continue ;;
    "+"*)
      if [ -n "$file" ] && grep -qiE "$PATTERN" <<<"${line:1}"; then
        mode=$(mode_for "$file")
        if [ "$mode" = file ]; then :
        elif [ "$mode" = block ] && in_block "$file" "$lineno"; then :
        else report "$file" "$lineno" "$(grep -oiE "$PATTERN" <<<"${line:1}" | head -1)"
        fi
      fi
      lineno=$((lineno + 1)) ;;
  esac
done < <(git diff --unified=0 --no-color --no-ext-diff --diff-filter=ACMR "$BASE"...HEAD)

for f in AGENTS.md; do
  if ! grep -q "$BEGIN_MARK" "$f" || ! grep -q "OUT OF SCOPE (hard boundary)" "$f"; then
    echo "::error file=$f,line=1::The Project scope (hard boundary) block is missing from $f"; fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  echo "Scope guard failed. Kaz Flock repos must not reference out-of-scope systems (AGENTS.md, Project scope)."
  echo "If this is a legitimate exemption, ask Jacob; exemptions go in $ALLOW_FILE (owner review required)."
  exit 1
fi
echo "Scope guard passed."
