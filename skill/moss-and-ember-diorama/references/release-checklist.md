# Release checklist

## Repository completeness

- [ ] README with hero, screenshots, quick start, controls, catalog, architecture, credits, license.
- [ ] AGENTS.md + docs/AGENT_GUIDE.md.
- [ ] docs/ARCHITECTURE.md, docs/ART_PIPELINE.md, docs/DESIGN.md, docs/QA.md, docs/REPRODUCTION.md, docs/RELEASE_CHECKLIST.md.
- [ ] CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, CHANGELOG.md, LICENSE.
- [ ] .github/workflows/ci.yml, issue templates, PR template, Dependabot.
- [ ] public/models/README.md and 13 GLBs.
- [ ] STATE.md.

## Quality gates

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npm run preview -- --port 4183
```

- [ ] 14 store tests pass.
- [ ] Headless QA passes with zero console/page errors.
- [ ] All 13 GLBs load, no fallback labels.
- [ ] Task, purchase, placement, storage, reload verified.
- [ ] Day/night screenshots at 1440×900.
- [ ] No floating props, ghost lag, z-fighting, or bloom blowout.
- [ ] No secrets, dist/, node_modules/, or Blend backups.
- [ ] Single clean commit with no old project name in history.

## Session state

```bash
grep 'session.id=ses_' ~/.local/share/opencode/log/opencode.log | tail -1
sqlite3 -readonly ~/.local/share/opencode/opencode.db "
SELECT id, title, model, cost,
       tokens_input, tokens_output, tokens_reasoning,
       tokens_cache_read, tokens_cache_write,
       datetime(time_created/1000,'unixepoch'),
       datetime(time_updated/1000,'unixepoch')
FROM session WHERE id='ses_REPLACE_ME';"
```

Include session id/title, start/end UTC + local, wall-clock duration, all five token counts, raw total, cost, agent/model, exact SQL, and the caveat that the snapshot excludes the final assistant reply. Credit OpenCode and the model.

## GitHub

```bash
export GH_TOKEN="$(gh auth token)"   # one read
gh repo create USER/REPO --public --description "..."
git init -b main
git add -A
git commit -m "Initial commit: Moss & Ember"
git remote add origin "https://github.com/USER/REPO.git"
export GIT_ASKPASS="$(mktemp -t askpass)"
cat > "$GIT_ASKPASS" <<'SH'
#!/bin/sh
case "$1" in
  Username*) printf 'x-access-token\n' ;;
  Password*) printf '%s\n' "$GH_TOKEN" ;;
esac
SH
chmod 700 "$GIT_ASKPASS"
GIT_TERMINAL_PROMPT=0 git -c credential.helper= push -u origin main
```

- [ ] Default branch main.
- [ ] CI green.
- [ ] Description/topics set.
- [ ] No token in remote URL or history.
- [ ] No force-push of shared repos.

## Skill

- [ ] SKILL.md with precise trigger description.
- [ ] References: design contract, GLB pipeline, release checklist.
- [ ] Install copy in `~/.claude/skills/` and `~/.config/opencode/skills/`.
- [ ] Publish as its own public repo; link back to the app.

## Final handoff

- [ ] STATE.md committed last.
- [ ] README links resolve.
- [ ] Skill backup URL recorded.
- [ ] No Keychain prompt loop during pushes.
