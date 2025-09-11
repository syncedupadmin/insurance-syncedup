#!/usr/bin/env bash
set -euo pipefail

# =========================
# CONFIG
# =========================
PROJECT_NAME="INSURANCE.SYNCEDUP"
OUT_DIR="${OUT_DIR:-.audit}"
TXT="${OUT_DIR}/audit_report.txt"
JSON="${OUT_DIR}/audit_report.json"
HTML_ROOT="public"
API_ROOT="api"
IGNORE_DIRS="node_modules|.git|.next|dist|build|coverage|.vercel|.cache|__pycache__"
RG="$(command -v rg || true)"   # ripgrep if available
GREP_BIN="grep"
[[ -n "${RG}" ]] && GREP_BIN="rg --no-ignore-vcs --hidden"  # prefer ripgrep

mkdir -p "${OUT_DIR}"
: > "${TXT}"
echo '{}' > "${JSON}"

section () { printf "\n%s\n" "════════ ${1} ════════" | tee -a "${TXT}"; }
sub ()     { printf "%s\n" "-- ${1}" | tee -a "${TXT}"; }
kv ()      { printf "%s: %s\n" "${1}" "${2}" | tee -a "${TXT}"; }
append_json () {
  # append_json "path.to.key" "escaped value"
  python - <<PY >>/dev/null
import json,sys,os
p="${JSON}"
key="${1}"
val="${2}"
data=json.load(open(p))
d=data
*path,leaf=key.split(".")
for k in path:
    d=d.setdefault(k,{})
d[leaf]=val
json.dump(data,open(p,"w"),indent=2)
PY
}

filter_ignores () { sed -E "/\/(${IGNORE_DIRS})\//d"; }

# Helper search (works with grep or rg)
s() {
  local pat="$1"; shift || true
  if [[ "${GREP_BIN}" == rg* ]]; then
    # shellcheck disable=SC2086
    ${GREP_BIN} -n -H -e "${pat}" $@ 2>/dev/null | filter_ignores || true
  else
    # shellcheck disable=SC2086
    grep -R -n -H -E "${pat}" $@ 2>/dev/null | filter_ignores || true
  fi
}

# =========================
# 1. SECURITY
# =========================
section "1. CRITICAL SECURITY VULNERABILITIES"

sub "1.1 Exposed secrets & credentials"
SECRETS=$(
  {
    s "(sk|pk)_(live|test)_[A-Za-z0-9]{20,}" .
    s "(?i)api[_-]?key[\"']?\s*[:=]\s*[\"'][A-Za-z0-9_\-]{16,}[\"']" .
    s "(?i)secret[^A-Za-z0-9]{0,3}(key|token)[^A-Za-z0-9]{0,3}[\"'][A-Za-z0-9_\-]{16,}[\"']" .
    s "(?i)jwt[_-]?secret[\"']?\s*[:=]\s*[\"'][^\"']+[\"']" .
    s "(?i)supabase.{0,40}(anon|service)_key.{0,20}[\"']eyJ" .
    s "(?i)password[\"']?\s*[:=]\s*[\"'][^\"']+[\"']" . | filter_ignores
  } | sort -u
)
[[ -n "${SECRETS}" ]] && echo "${SECRETS}" | tee -a "${TXT}" || kv "Secrets" "None found"
append_json "security.secrets_found" "$(printf %q "${SECRETS:-}")"

sub "1.2 Auth endpoints sanity"
AUTH_WARN=""
for f in $(find "${API_ROOT}/auth" -name "*.js" 2>/dev/null | filter_ignores); do
  out=""
  grep -Eq "jwt\.verify|verify\(.+token" "$f" || out+="NO_TOKEN_VERIFY;"
  grep -Eq "try\s*{|\.catch\(|error" "$f" || out+="NO_ERROR_HANDLING;"
  [[ -n "$out" ]] && AUTH_WARN+="$f: $out"\n'
done
[[ -n "${AUTH_WARN}" ]] && echo "${AUTH_WARN}" | tee -a "${TXT}" || kv "Auth" "Looks sane"
append_json "security.auth_warnings" "$(printf %q "${AUTH_WARN:-}")"

sub "1.3 Injection risks (string-built queries, exec)"
INJ=$(
  { s "query.*(\+|\${).*req\." "${API_ROOT}/"
    s "(?i)(raw|exec).*query" "${API_ROOT}/"
  } | sort -u
)
[[ -n "${INJ}" ]] && echo "${INJ}" | tee -a "${TXT}" || kv "SQLi patterns" "None detected"
append_json "security.injection_hits" "$(printf %q "${INJ:-}")"

sub "1.4 CORS & security headers"
CORS_WIDE=$(s "Access-Control-Allow-Origin.*\*" "${API_ROOT}/")
HEADERS_MISS=$(s -L "X-Frame-Options|Content-Security-Policy|Strict-Transport-Security|X-Content-Type-Options" "${API_ROOT}/")
[[ -n "${CORS_WIDE}" ]] && echo "CORS ANY ORIGIN:" | tee -a "${TXT}" && echo "${CORS_WIDE}" | tee -a "${TXT}"
[[ -z "${CORS_WIDE}" ]] && kv "CORS *" "Not found"
[[ -n "${HEADERS_MISS}" ]] && echo "MISSING HEADER HANDLING:" | tee -a "${TXT}" && echo "${HEADERS_MISS}" | tee -a "${TXT}" || kv "Headers" "Present or handled at edge"
append_json "security.cors_any" "$(printf %q "${CORS_WIDE:-}")"

# =========================
# 2. BROKEN FUNCTIONALITY
# =========================
section "2. BROKEN FUNCTIONALITY DETECTION"

sub "2.1 API endpoint inventory"
API_FILES=$(find "${API_ROOT}" -name "*.js" 2>/dev/null | filter_ignores | wc -l | tr -d ' ')
kv "API files" "${API_FILES}"
append_json "apis.file_count" "${API_FILES}"

sub "2.2 Obvious TODO/throw"
BROKEN=$( { s "(?i)not\s+implemented|TODO|FIXME|throw\s+new\s+Error" "${API_ROOT}/"; } )
[[ -n "${BROKEN}" ]] && echo "${BROKEN}" | tee -a "${TXT}" || kv "Incomplete markers" "None"

sub "2.3 DB tables referenced"
TABLES=$(s "from\(['\"][A-Za-z0-9_:\.-]+['\"]\)" "${API_ROOT}/" | sed -E "s/.*from\(['\"]([^'\"]+)['\"].*/\1/" | sort -u)
[[ -n "${TABLES}" ]] && echo "${TABLES}" | tee -a "${TXT}" || kv "Tables" "None parsed"
append_json "db.tables" "$(printf %q "${TABLES:-}")"

sub "2.4 Missing migrations"
MISSING=""
if [[ -n "${TABLES}" ]]; then
  while IFS= read -r t; do
    HIT=$(s "(?i)create\s+table.*\b${t}\b" .)
    [[ -z "${HIT}" ]] && MISSING+="No migration found for: ${t}"\n'
  done <<< "${TABLES}"
fi
[[ -n "${MISSING}" ]] && echo "${MISSING}" | tee -a "${TXT}" || kv "Migrations" "All referenced have candidates"
append_json "db.missing_migrations" "$(printf %q "${MISSING:-}")"

# =========================
# 3. PORTAL CONSISTENCY
# =========================
section "3. PORTAL CONSISTENCY"
PORTALS=(agent admin manager customer-service super-admin leaderboard)
for p in "${PORTALS[@]}"; do
  sub "Portal: ${p}"
  DIR="${HTML_ROOT}/_${p}"
  if [[ -d "${DIR}" ]]; then
    PAGES=$(ls "${DIR}"/*.html 2>/dev/null | wc -l | tr -d ' ')
    CSS=$(ls "${DIR}"/*.css 2>/dev/null | wc -l | tr -d ' ')
    JS=$(ls "${DIR}"/*.js 2>/dev/null | wc -l | tr -d ' ')
    kv "pages" "${PAGES}"; kv "css" "${CSS}"; kv "js" "${JS}"
    [[ ! -f "${DIR}/index.html" ]] && echo "ERROR: ${p} missing index.html" | tee -a "${TXT}"
  else
    echo "ERROR: ${p} directory missing: ${DIR}" | tee -a "${TXT}"
  fi
done

sub "3.2 Theme contamination"
s "adminTheme"  "${HTML_ROOT}/_agent/"*.html || true
s "agentTheme"  "${HTML_ROOT}/_admin/"*.html || true
s "#4c1d95"     "${HTML_ROOT}/_agent/"*.html || true
s "#059669"     "${HTML_ROOT}/_admin/"*.html || true

sub "3.3 Navigation links per portal"
for d in $(find "${HTML_ROOT}/_"* -maxdepth 0 -type d 2>/dev/null); do
  echo "=== $(basename "$d") ===" | tee -a "${TXT}"
  grep -hPo 'href="\K[^"]+' "$d"/index.html 2>/dev/null | sort -u | tee -a "${TXT}" || true
done

# =========================
# 4. ASSETS & DEPENDENCIES
# =========================
section "4. ASSETS & DEPENDENCIES"

sub "4.1 Broken references"
BROKEN_REFS=$(
  grep -rohE 'src="[^"]*"|href="[^"]*"' "${HTML_ROOT}/" --include="*.html" 2>/dev/null \
  | sed -E 's/.*"(.*)".*/\1/' | grep -Ev '^(http|#|javascript:|mailto:)' | while read -r f; do
      [[ -f "${HTML_ROOT}${f}" || -f "${HTML_ROOT}/${f}" ]] || echo "MISSING: ${f}"
    done
)
[[ -n "${BROKEN_REFS}" ]] && echo "${BROKEN_REFS}" | tee -a "${TXT}" || kv "Broken refs" "None"

sub "4.2 Potentially unused files"
for f in ${HTML_ROOT}/js/*.js ${HTML_ROOT}/css/*.css 2>/dev/null; do
  base="$(basename "$f")"
  HITS=$(grep -R --include="*.html" -n "${base}" "${HTML_ROOT}/" 2>/dev/null | wc -l | tr -d ' ')
  [[ "${HITS}" -eq 0 ]] && echo "UNUSED: $f" | tee -a "${TXT}"
done

sub "4.3 Duplicate HTML"
find "${HTML_ROOT}" -name "*.html" -exec md5sum {} \; 2>/dev/null | sort | uniq -d -w 32 | tee -a "${TXT}" || true

# =========================
# 5. CONFIG & DEPLOYMENT
# =========================
section "5. CONFIG & DEPLOYMENT"

sub "5.1 Env files"
[[ -f ".env" ]] && echo "WARNING: .env present in repo" | tee -a "${TXT}" || kv ".env" "not present"
[[ -f ".env.example" ]] || echo "MISSING: .env.example" | tee -a "${TXT}"
s "process\.env\.[A-Z0-9_]+" "${API_ROOT}/" | sed -E 's/.*process\.env\.([A-Z0-9_]+).*/\1/' | sort -u | tee -a "${TXT}" || true

sub "5.2 vercel.json validity & headers"
if [[ -f "vercel.json" ]]; then
  node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))" && kv "vercel.json" "valid JSON" || echo "ERROR: invalid vercel.json" | tee -a "${TXT}"
  s "(?i)content-security-policy|x-frame-options|strict-transport-security|x-content-type-options" vercel.json | tee -a "${TXT}" || true
else
  echo "WARNING: missing vercel.json" | tee -a "${TXT}"
fi

sub "5.3 Dependencies"
if [[ -f package.json ]]; then
  echo "lockfile present: $( [[ -f package-lock.json ]] && echo yes || echo no )" | tee -a "${TXT}"
  npm ls --depth=0 >/dev/null 2>&1 || echo "WARNING: npm ls errors" | tee -a "${TXT}"
  npm audit --audit-level=high --json >/tmp/audit.json 2>/dev/null || true
  HIGH=$(jq '.metadata.vulnerabilities.high + .metadata.vulnerabilities.critical' /tmp/audit.json 2>/dev/null || echo 0)
  kv "High/Critical vulns" "${HIGH:-0}"
  npx --yes depcheck --json > "${OUT_DIR}/depcheck.json" 2>/dev/null || true
else
  echo "No package.json" | tee -a "${TXT}"
fi

# =========================
# 6. UX / DX
# =========================
section "6. USER EXPERIENCE"

sub "6.1 Console statements count"
kv "HTML console refs" "$(s "console\.(log|warn|error)" "${HTML_ROOT}/" --include "*.html" | wc -l | tr -d ' ')"
kv "API console refs"  "$(s "console\.(log|warn|error)" "${API_ROOT}/" | wc -l | tr -d ' ')"

sub "6.2 Missing loading states"
for f in $(find "${HTML_ROOT}/_"* -name "index.html" 2>/dev/null); do
  grep -qiE "loading|spinner|skeleton" "$f" || echo "NO LOADING STATE: $f" | tee -a "${TXT}"
done

# =========================
# 7. PERFORMANCE
# =========================
section "7. PERFORMANCE"
sub "7.1 >500KB assets"
find "${HTML_ROOT}" -type f -size +500k -exec ls -lh {} \; 2>/dev/null | tee -a "${TXT}" || true
sub "7.2 Images >1MB"
find "${HTML_ROOT}" -iregex ".*\.(png|jpe?g|webp)" -exec ls -lh {} \; 2>/dev/null | awk '$5 ~ /M/' | tee -a "${TXT}" || true
sub "7.3 Inline code stats"
kv "Inline styles"  "$(s 'style=' "${HTML_ROOT}/" --include "*.html" | wc -l | tr -d ' ')"
kv "Inline <script>" "$(s '<script>.*</script>' "${HTML_ROOT}/" --include "*.html" | wc -l | tr -d ' ')"

# =========================
# 8. CODE QUALITY
# =========================
section "8. CODE QUALITY"
sub "8.1 Tech debt markers"
kv "TODO/FIXME/HACK" "$(s '(?i)TODO|FIXME|HACK|XXX|REFACTOR|DEPRECATED' . --include '*.js' --include '*.html' | wc -l | tr -d ' ')"

sub "8.2 Overlong files (>500 LOC)"
while IFS= read -r f; do
  lines=$(wc -l < "$f")
  [[ "${lines}" -gt 500 ]] && echo "COMPLEX: ${f} (${lines} lines)" | tee -a "${TXT}"
done < <(find "${API_ROOT}" "${HTML_ROOT}" -name "*.js" 2>/dev/null | filter_ignores)

sub "8.3 Tests present"
ls -la test/ tests/ spec/ __tests__/ 2>/dev/null | tee -a "${TXT}" || echo "NO TEST DIRECTORY FOUND" | tee -a "${TXT}"
kv "Test files" "$(find . -name "*.test.js" -o -name "*.spec.js" 2>/dev/null | wc -l | tr -d ' ')"

# =========================
# 9. BUSINESS LOGIC
# =========================
section "9. BUSINESS LOGIC"
sub "9.1 Stripe"
kv "Stripe refs" "$(s '(?i)stripe|payment|subscription' "${API_ROOT}/" --include '*.js' | wc -l | tr -d ' ')"
s "STRIPE_SECRET_KEY|STRIPE.*(SECRET|KEY)" "${API_ROOT}/" | tee -a "${TXT}" || echo "No STRIPE_* key refs in API" | tee -a "${TXT}"

sub "9.2 Commissions"
s "(?i)commission.*calculate|calculate.*commission" "${API_ROOT}/" | tee -a "${TXT}" || echo "No commission calc found" | tee -a "${TXT}"

sub "9.3 RBAC checks"
s "(?i)\brole\b.*(check|authorize)|authorize.*\brole\b|forbid|deny" "${API_ROOT}/" | tee -a "${TXT}" || echo "RBAC references not found" | tee -a "${TXT}"

# =========================
# 10. SUMMARY
# =========================
section "10. SUMMARY"
TOTAL_FILES=$(find . -type f -not -path "*/.git/*" -not -path "*/node_modules/*" | wc -l | tr -d ' ')
kv "Total files" "${TOTAL_FILES}"
kv "HTML pages" "$(find . -name '*.html' | wc -l | tr -d ' ')"
kv "JS files"   "$(find . -name '*.js' -not -path '*/node_modules/*' | wc -l | tr -d ' ')"
kv "CSS files"  "$(find . -name '*.css' | wc -l | tr -d ' ')"
kv "API endpoints" "$(find "${API_ROOT}" -name '*.js' 2>/dev/null | wc -l | tr -d ' ')"
kv "Portal pages" "$(find "${HTML_ROOT}/_"* -name '*.html' 2>/dev/null | wc -l | tr -d ' ')"

# Create a crude priority list
echo "
Recommendation Priority:
1) Rotate any exposed secrets and move all runtime config to env + edge headers
2) Add error handling to any API flagged above; return consistent JSON { ok, error }
3) Tighten CORS to exact origins; add HSTS, XFO, XCTO, CSP in vercel.json
4) Purge console.* from production; use structured logger with levels
5) Add loading states to portals missing them; avoid blocking UI work
6) Optimize heavyweight assets; prefer AVIF/WebP, lazy load
7) Add tests for auth, RBAC, and money paths (Stripe, commissions)
8) Document API routes with method + path; add smoke tests in CI
" | tee -a "${TXT}"

# Exit with non-zero if we found high-risk items
CRIT=0
[[ -n "${SECRETS}" ]] && CRIT=1
[[ -n "${INJ}" ]] && CRIT=1
[[ -n "${CORS_WIDE}" ]] && CRIT=1
exit "${CRIT}"