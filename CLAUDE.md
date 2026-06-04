# Claude Handoff

This project is a static terminal-themed portfolio for Eric Ji. It is intentionally zero-build: plain HTML, CSS, and vanilla JavaScript that can be served directly by GitHub Pages.

## User Direction

- The site should feel like a real terminal, not a normal portfolio with terminal styling.
- Keep the visual direction minimal and command-line first.
- Prompt should remain `guest@eji`.
- CLI brand/executable is `eji-cli`; commands can also be run as `eji <command>`.
- Do not add clickable command transcript behavior. The user explicitly does not want clickable commands.
- The user likes macOS-style window controls in the terminal chrome.
- The user prefers realistic shell behavior:
  - `clear` clears the full visible transcript, including initial boot/help content.
  - Unknown commands should look like zsh errors, for example `zsh: command not found: adw`.
  - File errors should look like real terminal errors, for example `cat: hello: No such file or directory`.
  - `Ctrl+C`, `Ctrl+L`, command history, and tab completion should behave terminal-like.
- The user asked not to be asked for local `127.0.0.1` verification checks. Static checks are fine.

## Current Structure

```text
eric-portfolio/
  index.html
  css/style.css
  js/profile.js     all user-editable content (name, work, etc.)
  js/terminal.js    behavior only
  pages/projects.html
  pages/lab.html
  pages/resume.html
  README.md
  .nojekyll
```

There is no `package.json`, framework, bundler, or dependency install. The site can be opened directly from `index.html` or served with:

```bash
python3 -m http.server 8000
```

## Main Files

- `index.html`
  - Contains the terminal shell markup.
  - Loads `css/style.css?v=24`, then `js/profile.js?v=7` (must come first), then `js/terminal.js?v=37`.
  - The initial `eji --help` transcript is wrapped in `[data-intro-transcript]`. It is a no-JS/SEO fallback; `renderIntro()` regenerates it from `profile.js` on load, and JS hides it during boot and removes it after `clear`.
  - Boot output writes to `[data-boot-output]`; user command output writes to `[data-terminal-output]` below the intro transcript.

- `js/profile.js`
  - The single user-editable content file: defines a global `EJI_PROFILE` with name, email, role, tagline, about, neofetch, experience, stack, projects, resume, and banner art.
  - Heavily commented for fill-in-the-blank editing. Loaded before `terminal.js`; consumed via `var PROFILE = EJI_PROFILE` with safe fallbacks.

- `css/style.css`
  - Defines the terminal visual system, themes, prompt chip, completion menu, block cursor, and Vim pane styles.
  - Output classes include `.line-directory`, `.line-executable`, and `.line-error`.

- `js/terminal.js`
  - Owns all terminal behavior; builds its content from `EJI_PROFILE` via `build*` helpers + `mdTable` (no portfolio content is hardcoded here anymore).
  - Implements command history, tab completion, boot loading, clear screen, Ctrl+C/L/U/R/A/E/W, themes, copy email, download resume, pipes/redirection, and a Vim-like editor.
  - Implements an in-memory filesystem with writable home at `/home/eric/portfolio`.

## In-Memory Filesystem

The fake filesystem is initialized in `initFilesystem()` inside `js/terminal.js`.

Current root:

```text
/home/eric/portfolio/
  eji-cli        executable by default
  about.md
  contact.sh    not executable by default
  experience.md
  stack.md
  work/
    review-console/
      README.md
      impact.diff
      stack.md
    ops-ledger/
      README.md
      impact.diff
      stack.md
    portfolio-shell/
      README.md
      impact.diff
      stack.md
```

Supported filesystem commands:

```text
pwd
cd [path]
ls [-la] [path]
tree [path]
find [path] -name <glob>
mkdir <path>
touch <path>
cat <path>
head [-n N] <file>...
tail [-n N] <file>...
grep [-in] <term> <file>...
wc [-lwc] <file>...
chmod +x|-x|755|644 <path>
vi <path>
vim <path>
```

`tree` prints a recursive directory map from the given path (or the current directory) and ends with a `N directories, M files` summary. `find` walks a tree and prints matching paths; `-name` takes a glob (`*`/`?`, quote it). `head`/`tail` print the first/last N lines (default 10; `-n N` or `-N`). `grep` does a substring search and supports `-i` (ignore case) and `-n` (line numbers); with multiple files it prefixes matches with the filename. `wc` counts lines/words/bytes (`-l`/`-w`/`-c`).

`chmod`, `mkdir`, `touch`, and writable Vim saves change only the browser-memory filesystem. Refreshing the page resets the filesystem.
The fake tree includes `/`, `/home`, `/home/eric`, and `/home/eric/portfolio`. Parent directories above `/home/eric/portfolio` are readable but not writable.
`contact.sh` is intentionally a shell script; run `chmod +x contact.sh` before `./contact.sh`.
Files created with `touch` are user-writable in Vim. Built-in portfolio files are protected and still deny `:w` / `:wq`.

## Implemented Shell Commands

Portfolio/content commands (the content verbs must be run behind `eji` / `eji-cli`):

```text
eji
eji --help
eji about
eji work
eji experience
eji contact
eji banner
eji neofetch
theme green|amber|blue|mono|light
copy email
download resume
history
man eji|shell|vim
clear
```

The portfolio content verbs (`about`, `work`, `experience`, `contact`, `banner`, `neofetch`) are eji subcommands: they only run as `eji <verb>` / `eji-cli <verb>` / `./eji-cli <verb>`. Run bare (e.g. just `about`), they return `zsh: command not found: about`, matching how a real `git`-style CLI requires its prefix. Real shell/coreutils commands (`ls`, `cd`, `cat`, `grep`, `tree`, `chmod`, `vim`, `theme`, `clear`, etc.) still work on their own. Tab-completion reflects this: the content verbs only complete after `eji `.

There is no `open` command. Visitors explore project briefs with the real tools instead — `ls work/<project>/`, `cat work/<project>/README.md`, and `vim work/<project>/README.md`.

`history` prints previously entered commands with line numbers. `man <command>` renders a manual page for any command — `man eji`, `man shell`, and `man vim` are richer hand-written pages; everything else is generated from the `manEntries` table via `renderMan`. Unknown commands also print a `did you mean <command>?` suggestion when a close match exists (Levenshtein distance); the suggestion pool is context-aware (shell commands when bare, plus eji subcommands behind `eji`).

Session/shell extras:

- `whoami` → `guest`, `who` → login line, `id` → `uid=1000(guest)...`, `hostname` → `eji` (authentic unix identity for the `guest@eji` prompt).
- Exit codes: each command sets `lastExitCode` (0 success, 1 tool error, 126 permission denied, 127 command not found), inferred by `exitCodeFor`. `echo $?` prints it; `echo` also expands `$USER`, `$HOME`, `$PWD`, `$HOSTNAME`, `$SHELL`.
- `alias` lists aliases; `alias ll='ls -la'` defines one. Aliases are session-only (reset on refresh) and expand as the first word of a command via `expandAlias`.

Pipes and redirection (`runLine` orchestrates these; `submitCommand` calls `runLine` instead of `runCommand` directly):

- `cmd | cmd | ...` pipes stdout into the next stage. `cat`, `grep`, `wc`, `head`, and `tail` read stdin when given no file operands (each takes an optional `stdin` argument threaded through `runCommand(rawCommand, stdin)`).
- `cmd > file` (overwrite) and `cmd >> file` (append) write the final stage's output into the in-memory FS via `writeRedirect`. Writes obey the same rules as `touch`: only inside the writable home tree, and built-in (non-`userWritable`) files are protected. Redirected files are session-only.
- Detection is whitespace-aware: `echo a > b` redirects, `echo a>b` is literal. `|`/`>` inside quotes are not specially handled (parsing is whitespace-based).

Input/editing keys (in `js/terminal.js` keydown handler):

- `Ctrl+R` reverse history search (`(reverse-i-search)` prompt; type to refine, `Ctrl+R` for older matches, `Enter` accepts, `Esc`/`Ctrl+C` cancels).
- `Ctrl+A`/`Ctrl+E` move the cursor to start/end; `Ctrl+W` deletes the word before the cursor.
- A fake block cursor (`.terminal-cursor`, blinking, measured via a hidden `.cursor-mirror`) replaces the native caret. The native caret is only hidden once JS adds `has-fake-cursor` to the form, so it degrades gracefully. Honors `prefers-reduced-motion` (no blink).

Executable behavior:

```text
./eji-cli
./eji-cli about
chmod -x eji-cli
./eji-cli
chmod +x eji-cli
./eji-cli
```

Expected behavior after `chmod -x eji-cli`: `./eji-cli` should print `zsh: permission denied: ./eji-cli`.

## Vim Behavior

`vi`/`vim` opens a simulated Vim pane. It supports a practical subset:

```text
h j k l / arrow movement
i a A I o O insert modes
Esc normal mode
x delete char
dd delete line
yy yank line
p paste line
u undo
/ search
n / N next and previous search match
:q quit
:q! discard
:w, :wq, :x denied
```

Writes are intentionally denied with:

```text
E212: Can't open file for writing: not allowed to modify
```

The user wants visitors to be able to experiment without mutating portfolio content.

## Recent Work

Recent changes added:

- Boot sequence at top with terminal-style ASCII progress bar.
- Boot progress uses a global 0-100 bar rendered with `requestAnimationFrame`; completed stages remain visible as `[ok]` lines.
- Boot sequence ends with a small hint pointing at exploration: `hint: interactive shell. explore with 'ls', open files with 'cat' or 'vim', press Tab to complete.`
- Boot timing is randomized per load: a global speed factor plus jittered per-step durations, pauses, and checkpoints, so each refresh differs (reduced-motion uses a shorter version, not an instant skip). The interactive prompt stays hidden until boot reaches `ready`.
- Initial intro/help transcript hidden during boot and revealed after boot.
- Main `eji --help` is portfolio-focused; shell mechanics live under `help shell`.
- `clear` and `Ctrl+L` clear boot, help, and command history, leaving only the prompt.
- Prompt updates when `cd` changes directories.
- More realistic shell-style error messages.
- In-memory filesystem with `cd`, `pwd`, `ls`, `mkdir`, `touch`, `cat`, `chmod`, `vi`, and `vim`.
- Colored directory/executable/error output.
- `eji-cli` as the local executable file.
- Context-aware autocomplete: command names complete at the first token, and arguments complete paths/options/projects instead of matching whole canned commands.

## Known Gaps / Good Next Steps

1. Manually test in browser.
   - Node and JS runtimes were not available in the current environment, so `terminal.js` has not been parsed by a JS runtime after the last edits.
   - Use the browser console as the source of truth for runtime syntax errors.

2. Test core shell flows:
   - `clear`
   - `ls -la`
   - `chmod -x eji-cli`
   - `./eji-cli`
   - `chmod +x eji-cli`
   - `cd work`
   - `ls`
   - `cd review-console`
   - `cat README.md`
   - `vi README.md`
   - unknown commands like `adw`
   - missing files like `cat hello`

3. Consider refining autocomplete further.
   - Current completion is now context-aware and path-aware.
   - A stronger next step would be common-prefix insertion before menu selection, closer to zsh.

4. Consider command parsing.
   - Current parsing is whitespace based and does not support quoted filenames.
   - That is acceptable for the current fake filesystem, but can be improved if adding filenames with spaces.

5. Consider whether new Vim buffers should appear in `ls`.
   - Current `vi newfile.md` opens a new unsaved buffer but denied writes mean it does not create a file.
   - `touch newfile.md` is the intended way to create a visible file.

## Verification Notes

Commands already run:

```bash
grep -RIn "read-only portfolio shell\|clear terminal output\|eric-portfolio" index.html css js README.md pages
grep -RInP '[^\x00-\x7F]' index.html css js README.md pages
find . -maxdepth 2 -type f | sort
```

The stale-text and non-ASCII checks returned no matches.

No localhost `curl` checks were run because the user asked not to be asked for those local verification checks.
