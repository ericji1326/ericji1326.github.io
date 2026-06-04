# Agent Instructions

This directory is a static terminal-themed portfolio for Eric Ji.

Read `CLAUDE.md` first. It contains the current handoff, user preferences, implemented terminal behavior, known gaps, and suggested next verification steps.

## Project Shape

- No framework.
- No build step.
- No package manager dependency install.
- Main files:
  - `index.html`
  - `css/style.css`
  - `js/terminal.js`
  - `CLAUDE.md`

## Working Rules

- Keep the site terminal-first. It should feel like a real shell, not a normal portfolio with terminal decoration.
- Do not add clickable command transcript behavior.
- Keep prompt text as `guest@eji`.
- Keep CLI brand/executable as `eji-cli`; `eji <command>` is the friendly command wrapper.
- Prefer realistic shell messages for missing commands, missing files, permissions, and directory errors.
- The fake filesystem is in memory inside `js/terminal.js`.
- Preserve the zero-build GitHub Pages setup.
- Do not introduce dependencies unless the user explicitly asks.
- The user asked not to be asked for localhost `127.0.0.1` verification checks.

## Useful Manual Checks

In a browser, test:

```text
clear
ls -la
chmod -x eji-cli
./eji-cli
chmod +x eji-cli
cd work
ls
cd review-console
cat README.md
vi README.md
adw
cat hello
```

Expected examples:

```text
zsh: command not found: adw
cat: hello: No such file or directory
zsh: permission denied: ./eji-cli
```
