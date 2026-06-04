# Terminal Portfolio

A terminal-themed personal portfolio that behaves like a real shell. Zero build:
plain HTML, CSS, and vanilla JavaScript, served directly by GitHub Pages.

## Preview locally

Open `index.html` directly in a browser, or run a static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Make it yours

**Edit one file: [`js/profile.js`](js/profile.js).** It holds every personal
detail — name, email, about, experience, stack, projects, resume, and the ASCII
banner — with comments explaining each field. Fill it in, save, refresh. The
terminal (`about`, `work`, `experience`, `eji --help`, etc.) updates from it
automatically.

Also update, in `index.html`, the `<title>` and `<meta name="description">`
(marked with an `EDIT:` comment) so your name shows in the browser tab and search
results.

That's the whole customization surface. Everything else is behavior.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo.
2. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`.
3. The site publishes at `https://<user>.github.io/<repo>/`.

`.nojekyll` is included so GitHub serves the files as-is (no Jekyll processing).
There is no build step — what you commit is what ships.

## Project layout

```text
index.html        terminal markup + first-paint intro (no-JS fallback)
css/style.css     terminal visual system, themes, cursor
js/profile.js     YOUR CONTENT — edit this
js/terminal.js    terminal behavior (shell, filesystem, commands, vim)
```

## What the terminal can do

Type `eji --help` for portfolio commands, `help shell` for shell features, or
`man <command>` for any command. Highlights: an in-memory filesystem (`cd`, `ls`,
`tree`, `cat`, `grep`, `find`, `head`/`tail`, `wc`), pipes and redirection
(`cat stack.md | grep frontend`, `ls > files.txt`), a simulated `vim`, command
history with `Ctrl+R` search, tab completion, and themes (`theme green`).
