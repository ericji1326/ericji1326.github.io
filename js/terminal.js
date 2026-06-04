"use strict";

(function () {
  var commandHistory = [];
  var historyIndex = 0;
  var historyDraft = "";
  var completionState = null;
  var vimState = null;
  var introDismissed = false;
  var lastExitCode = 0;
  var aliases = {};
  var sessionLogin = "2026-06-02 09:00";
  var reverseSearch = null;
  var cursorEl = null;
  var cursorMirror = null;
  var terminal = document.querySelector(".terminal");
  var terminalTitle = document.querySelector(".terminal-bar p");
  var bootOutput = document.querySelector("[data-boot-output]");
  var output = document.querySelector("[data-terminal-output]");
  var introTranscript = document.querySelector("[data-intro-transcript]");
  var form = document.querySelector("[data-terminal-form]");
  var input = form ? form.querySelector("input") : null;
  var formLabel = form ? form.querySelector("label") : null;
  var completionMenu = document.querySelector("[data-completion-menu]");
  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var bootTiming = prefersReducedMotion
    ? { startDelay: 100, perPercent: 10, minDuration: 170, pause: 70, slowPause: 90, readyPause: 320, jitter: 0.2 }
    : { startDelay: 320, perPercent: 58, minDuration: 850, pause: 320, slowPause: 460, readyPause: 1100, jitter: 0.38 };
  var homePath = "/home/eric/portfolio";
  var cwd = homePath;
  var fs = {};
  if (terminal) terminal.tabIndex = -1;
  var bootSteps = [
    { label: "loading profile", percent: 18 },
    { label: "mounting work/", percent: 46 },
    { label: "reading experience.md", percent: 72 },
    { label: "hydrating shell commands", percent: 90 },
    { label: "ready", percent: 100 }
  ];

  var activeBootSteps = bootSteps;
  var bootRunFactor = 1;

  // ------------------------------------------------------------------
  // Portfolio content. To change any of this, edit js/profile.js — the
  // builders below just format your details into terminal output.
  // ------------------------------------------------------------------
  var PROFILE = (typeof EJI_PROFILE !== "undefined" && EJI_PROFILE) ? EJI_PROFILE : {};
  var email = PROFILE.email || "you@example.com";
  var role = PROFILE.role || "Software Engineer";
  var ownerName = PROFILE.name || "Your Name";

  function mdTable(headers, rows) {
    var widths = headers.map(function (header, col) {
      return rows.reduce(function (max, row) {
        return Math.max(max, String(row[col]).length);
      }, header.length);
    });
    function formatRow(cells) {
      return "| " + cells.map(function (cell, col) {
        return padRight(String(cell), widths[col]);
      }).join(" | ") + " |";
    }
    var separator = "|" + widths.map(function (width) {
      return "-".repeat(width + 2);
    }).join("|") + "|";
    return [formatRow(headers), separator].concat(rows.map(formatRow)).join("\n");
  }

  function buildBanner() {
    return (PROFILE.bannerArt || []).concat(["", PROFILE.tagline || ""]).join("\n");
  }

  function buildNeofetch() {
    var card = PROFILE.neofetch || {};
    return [
      "      /\\        guest@eji",
      "     /  \\       --------------",
      "    / /\\ \\      role:     " + role,
      "   / ____ \\     focus:    " + (card.focus || ""),
      "  /_/    \\_\\    style:    " + (card.style || ""),
      "                shell:    eji-cli",
      "                prompt:   zsh-inspired",
      "                contact:  " + email
    ].join("\n");
  }

  function buildAbout() {
    var info = PROFILE.about || {};
    var table = mdTable(["field", "value"], [
      ["name", ownerName],
      ["role", role],
      ["focus", info.focus || ""],
      ["style", info.style || ""],
      ["bias", info.bias || ""]
    ]);
    return table + "\n\n" + (info.bio || []).join("\n");
  }

  function buildExperience() {
    var jobs = PROFILE.experience || [];
    var width = 58;
    var lines = [];
    jobs.forEach(function (job, index) {
      var head = job.period || "";
      var dashes = width - head.length - 1;
      if (index) lines.push("");
      lines.push(head + (dashes > 0 ? " " + "─".repeat(dashes) : ""));
      lines.push((job.role || "") + (job.company ? "  ·  " + job.company : ""));
      if (job.location) lines.push(job.location);
      if (job.team) lines.push("    team:   " + job.team);
      if (job.skills) lines.push("    skills: " + job.skills);
      (job.detail || []).forEach(function (line) {
        lines.push("    " + line);
      });
    });
    return lines.join("\n");
  }

  function buildStack() {
    return mdTable(["area", "tools / habits"], PROFILE.stack || []);
  }

  function buildContact() {
    return [
      "#!/usr/bin/env bash",
      "",
      "echo \"email:  " + email + "\"",
      "echo \"status: " + (PROFILE.contactStatus || "") + "\""
    ].join("\n");
  }

  function buildProjectFiles() {
    var out = {};
    (PROFILE.projects || []).forEach(function (project) {
      out[project.slug] = {
        "README.md": (project.readme || []).join("\n"),
        "impact.diff": (project.diff || []).join("\n"),
        "stack.md": (project.stack || []).join("\n")
      };
    });
    return out;
  }

  function buildWork() {
    var projects = PROFILE.projects || [];
    var lines = ["work/", ""];
    var slug;
    projects.forEach(function (project) {
      lines.push(project.slug + "/");
      lines.push("  README.md");
      lines.push("  impact.diff");
      lines.push("  stack.md");
    });
    lines.push("");
    lines.push(mdTable(["project", "problem", "contribution", "status"], projects.map(function (project) {
      return [project.name, project.problem, project.contribution, project.status];
    })));
    lines.push("");
    lines.push("Try:");
    slug = projects.length ? projects[0].slug : "work";
    lines.push("  ls work/" + slug + "/");
    lines.push("  cat work/" + slug + "/README.md");
    lines.push("  vim work/" + slug + "/README.md");
    return lines.join("\n");
  }

  function buildResume() {
    var resume = PROFILE.resume || {};
    var lines = [ownerName, role, "", "Focus"];
    (resume.focus || []).forEach(function (item) {
      lines.push("- " + item);
    });
    lines.push("");
    lines.push("Selected Work");
    (resume.selectedWork || []).forEach(function (item) {
      lines.push("- " + item);
    });
    lines.push("");
    lines.push("Contact");
    lines.push(email);
    return lines.join("\n");
  }

  function buildFilesMap() {
    var map = {};
    Object.keys(projectFiles).forEach(function (slug) {
      var base = "work/" + slug;
      map[base] = projectFiles[slug]["README.md"];
      map[base + "/README.md"] = projectFiles[slug]["README.md"];
      map[base + "/impact.diff"] = projectFiles[slug]["impact.diff"];
      map[base + "/stack.md"] = projectFiles[slug]["stack.md"];
    });
    return map;
  }

  var bannerText = buildBanner();
  var neofetchText = buildNeofetch();
  var aboutText = buildAbout();
  var workText = buildWork();
  var experienceText = buildExperience();
  var stackText = buildStack();
  var contactText = buildContact();

  var projectFiles = buildProjectFiles();

  var files = buildFilesMap();

  var vimFiles = Object.assign({
    "about.md": aboutText,
    "contact.sh": contactText,
    "experience.md": experienceText,
    "stack.md": stackText
  }, files);

  var resumeText = buildResume();

  var ejiCliText = [
    "#!/usr/bin/env node",
    "",
    "// Browser-backed portfolio shell.",
    "// Run `eji --help` for commands, or inspect the files in this directory.",
    "",
    "module.exports = \"" + ownerName + " portfolio CLI\";"
  ].join("\n");

  function makeEntry(type, mode, content, options) {
    var metadata = options || {};
    return {
      type: type,
      mode: mode,
      content: content || "",
      children: type === "dir" ? [] : null,
      userWritable: Boolean(metadata.userWritable)
    };
  }

  function pathBase(path) {
    return path.split("/").filter(Boolean).pop() || "";
  }

  function pathDir(path) {
    var clean = path.replace(/\/+$/, "") || "/";
    var index = clean.lastIndexOf("/");
    if (clean === "/") return "/";
    if (index <= 0) return "/";
    return clean.slice(0, index);
  }

  function joinFsPath(parent, child) {
    if (parent === "/") return "/" + child;
    return parent + "/" + child;
  }

  function fsParentPath(path) {
    if (path === "/") return "/";
    return pathDir(path);
  }

  function addChild(parentPath, name) {
    var parent = fs[parentPath];
    if (!parent || parent.type !== "dir") return;
    if (parent.children.indexOf(name) === -1) parent.children.push(name);
  }

  function addDir(path, mode) {
    var parent;
    fs[path] = makeEntry("dir", mode || "drwxr-xr-x");
    if (path !== "/") {
      parent = pathDir(path);
      addChild(parent, pathBase(path));
    }
  }

  function addFile(path, content, mode, options) {
    fs[path] = makeEntry("file", mode || "-rw-r--r--", content, options);
    addChild(pathDir(path), pathBase(path));
  }

  function initFilesystem() {
    var projects = Object.keys(projectFiles);
    addDir("/", "dr-xr-xr-x");
    addDir("/home", "dr-xr-xr-x");
    addDir("/home/eric", "dr-xr-xr-x");
    addDir(homePath);
    addFile(homePath + "/eji-cli", ejiCliText, "-rwxr-xr-x");
    addFile(homePath + "/about.md", aboutText);
    addFile(homePath + "/contact.sh", contactText);
    addFile(homePath + "/experience.md", experienceText);
    addFile(homePath + "/stack.md", stackText);
    addDir(homePath + "/work");
    projects.forEach(function (project) {
      addDir(homePath + "/work/" + project);
      addFile(homePath + "/work/" + project + "/README.md", projectFiles[project]["README.md"]);
      addFile(homePath + "/work/" + project + "/impact.diff", projectFiles[project]["impact.diff"]);
      addFile(homePath + "/work/" + project + "/stack.md", projectFiles[project]["stack.md"]);
    });
  }

  function normalizeAbsolute(path) {
    var stack = [];
    String(path || "/").split("/").forEach(function (part) {
      if (!part || part === ".") return;
      if (part === "..") {
        if (stack.length) stack.pop();
        return;
      }
      stack.push(part);
    });
    return "/" + stack.join("/");
  }

  function resolvePath(path) {
    var value = String(path || "").trim();
    if (!value || value === "~") return homePath;
    if (value.indexOf("~/") === 0) return normalizeAbsolute(homePath + "/" + value.slice(2));
    if (value.charAt(0) === "/") return normalizeAbsolute(value);
    return normalizeAbsolute(cwd + "/" + value);
  }

  function resolveExistingPath(path) {
    var resolved = resolvePath(path);
    var parent;
    var wanted;
    var match;
    if (fs[resolved]) return resolved;
    parent = fs[pathDir(resolved)];
    wanted = pathBase(resolved).toLowerCase();
    if (parent && parent.type === "dir") {
      match = parent.children.find(function (child) {
        return child.toLowerCase() === wanted;
      });
      if (match) return pathDir(resolved) + "/" + match;
    }
    return resolved;
  }

  function displayPath(path) {
    if (path === homePath) return "~";
    if (path.indexOf(homePath + "/") === 0) return "~/" + path.slice(homePath.length + 1);
    return path;
  }

  function relativeDisplayPath(path) {
    if (path.indexOf(homePath + "/") === 0) return path.slice(homePath.length + 1);
    if (path === homePath) return ".";
    return path;
  }

  function isWritablePath(path) {
    return path === homePath || path.indexOf(homePath + "/") === 0;
  }

  function promptText() {
    return "guest@eji:" + displayPath(cwd) + "$";
  }

  function updatePrompt() {
    var location = displayPath(cwd);
    var user;
    var dir;
    if (terminalTitle) terminalTitle.textContent = "guest@eji:" + location;
    if (!formLabel) return;
    formLabel.innerHTML = "";
    user = document.createElement("span");
    dir = document.createElement("b");
    user.textContent = "guest@eji";
    dir.textContent = location;
    formLabel.appendChild(user);
    formLabel.appendChild(document.createTextNode(":"));
    formLabel.appendChild(dir);
    formLabel.appendChild(document.createTextNode("$"));
  }

  function isExecutable(entry) {
    return entry && entry.type === "file" && entry.mode.indexOf("x") !== -1;
  }

  function displayName(path, entry) {
    var name = pathBase(path);
    if (entry.type === "dir") return name + "/";
    if (isExecutable(entry)) return name + "*";
    return name;
  }

  function entrySize(entry) {
    if (entry.type === "dir") return entry.children.length * 64;
    return entry.content.length;
  }

  function formatLongEntry(path, nameOverride) {
    var entry = fs[path];
    var name = nameOverride || displayName(path, entry);
    return [
      entry.mode,
      "1",
      "eric",
      "portfolio",
      String(entrySize(entry)).padStart(5, " "),
      "Jun",
      "01",
      "09:00",
      name
    ].join(" ");
  }

  function listFs(path, options) {
    var resolved = resolveExistingPath(path || ".");
    var entry = fs[resolved];
    var children;
    if (!entry) return "ls: cannot access '" + (path || ".") + "': No such file or directory";
    if (entry.type === "file") {
      return options.long ? formatLongEntry(resolved) : displayName(resolved, entry);
    }
    children = entry.children.slice().sort();
    if (options.all) children = [".", ".."].concat(children);
    if (!options.long) {
      return children.map(function (name) {
        var childPath = name === "." ? resolved : name === ".." ? fsParentPath(resolved) : joinFsPath(resolved, name);
        if (name === "." || name === "..") return name;
        return displayName(childPath, fs[childPath]);
      }).join("\n");
    }
    return ["total " + children.length].concat(children.map(function (name) {
      var childPath = name === "." ? resolved : name === ".." ? fsParentPath(resolved) : joinFsPath(resolved, name);
      return formatLongEntry(childPath, name === "." || name === ".." ? name : null);
    })).join("\n");
  }

  function parseLs(command) {
    var parts = command.split(/\s+/).slice(1);
    var options = { all: false, long: false, invalid: "" };
    var targets = [];
    parts.forEach(function (part) {
      if (part.indexOf("-") === 0 && part.length > 1) {
        if (/^-([al]+)$/.test(part)) {
          options.all = options.all || part.indexOf("a") !== -1;
          options.long = options.long || part.indexOf("l") !== -1;
        } else {
          options.invalid = part.replace(/^-+/, "").charAt(0);
        }
      } else if (part) {
        targets.push(part);
      }
    });
    if (!targets.length) targets.push(".");
    return {
      options: options,
      targets: targets
    };
  }

  function setExecutableBit(mode, enabled) {
    var chars = mode.split("");
    [3, 6, 9].forEach(function (index) {
      chars[index] = enabled ? "x" : "-";
    });
    return chars.join("");
  }

  function modeFromOctal(type, value) {
    var digits = value.slice(-3).split("");
    var result = type === "dir" ? "d" : "-";
    digits.forEach(function (digit) {
      var numeric = Number(digit);
      result += numeric & 4 ? "r" : "-";
      result += numeric & 2 ? "w" : "-";
      result += numeric & 1 ? "x" : "-";
    });
    return result;
  }

  function chmodFs(mode, paths) {
    var errors = [];
    if (!mode) return "chmod: missing operand";
    if (!paths.length) return "chmod: missing operand after '" + mode + "'";
    paths.forEach(function (path) {
      var resolved = resolveExistingPath(path);
      var entry = fs[resolved];
      if (!entry) {
        errors.push("chmod: cannot access '" + path + "': No such file or directory");
        return;
      }
      if (!isWritablePath(resolved)) {
        errors.push("chmod: changing permissions of '" + path + "': Operation not permitted");
        return;
      }
      if (mode === "+x") entry.mode = setExecutableBit(entry.mode, true);
      else if (mode === "-x") entry.mode = setExecutableBit(entry.mode, false);
      else if (/^[0-7]{3,4}$/.test(mode)) entry.mode = modeFromOctal(entry.type, mode);
      else errors.push("chmod: invalid mode: '" + mode + "'");
    });
    return errors.join("\n");
  }

  function mkdirFs(paths) {
    var errors = [];
    if (!paths.length) return "mkdir: missing operand";
    paths.forEach(function (path) {
      var resolved = resolvePath(path);
      var parentPath = pathDir(resolved);
      var parent = fs[parentPath];
      if (fs[resolved]) {
        errors.push("mkdir: cannot create directory '" + path + "': File exists");
        return;
      }
      if (!parent || parent.type !== "dir") {
        errors.push("mkdir: cannot create directory '" + path + "': No such file or directory");
        return;
      }
      if (!isWritablePath(parentPath)) {
        errors.push("mkdir: cannot create directory '" + path + "': Permission denied");
        return;
      }
      addDir(resolved);
    });
    return errors.join("\n");
  }

  function touchFs(paths) {
    var errors = [];
    if (!paths.length) return "touch: missing file operand";
    paths.forEach(function (path) {
      var resolved = resolveExistingPath(path);
      var parentPath;
      var parent;
      if (fs[resolved]) {
        if (!isWritablePath(resolved)) {
          errors.push("touch: cannot touch '" + path + "': Permission denied");
        } else if (fs[resolved].type === "file" && !fs[resolved].userWritable) {
          errors.push("touch: cannot touch '" + path + "': Permission denied");
        }
        return;
      }
      resolved = resolvePath(path);
      parentPath = pathDir(resolved);
      parent = fs[parentPath];
      if (!parent || parent.type !== "dir") {
        errors.push("touch: cannot touch '" + path + "': No such file or directory");
        return;
      }
      if (!isWritablePath(parentPath)) {
        errors.push("touch: cannot touch '" + path + "': Permission denied");
        return;
      }
      addFile(resolved, "", "-rw-r--r--", { userWritable: true });
    });
    return errors.join("\n");
  }

  function catFs(paths, stdin) {
    var chunks = [];
    if (!paths.length) return stdin != null ? stdin : "cat: missing file operand";
    paths.forEach(function (path) {
      var resolved = resolveExistingPath(path);
      var entry = fs[resolved];
      if (!entry) {
        chunks.push("cat: " + path + ": No such file or directory");
      } else if (entry.type === "dir") {
        chunks.push("cat: " + path + ": Is a directory");
      } else {
        chunks.push(entry.content);
      }
    });
    return chunks.join("\n");
  }

  function readFsFile(path) {
    var resolved = resolveExistingPath(path);
    var entry = fs[resolved];
    if (entry && entry.type === "file") {
      return {
        path: relativeDisplayPath(resolved),
        fsPath: resolved,
        text: entry.content,
        userWritable: entry.userWritable
      };
    }
    return null;
  }

  function clearTerminal() {
    introDismissed = true;
    if (bootOutput) bootOutput.innerHTML = "";
    if (output) output.innerHTML = "";
    if (introTranscript) introTranscript.hidden = true;
    hideCompletionMenu();
  }

  function revealIntro() {
    if (form) form.classList.remove("is-hidden");
    if (introTranscript && !introDismissed) introTranscript.hidden = false;
    if (form) {
      form.scrollIntoView({ block: "nearest" });
      focusInput();
    }
  }

  // Rebuild the intro screen from profile.js so it always matches the live
  // `eji --help`. The static markup in index.html stays as a no-JS fallback.
  function renderIntro() {
    if (!introTranscript) return;
    var prompt = document.createElement("p");
    var user = document.createElement("span");
    var dir = document.createElement("b");
    var art = document.createElement("pre");
    var help = document.createElement("pre");
    user.textContent = "guest@eji";
    dir.textContent = "~";
    prompt.className = "prompt";
    prompt.appendChild(user);
    prompt.appendChild(document.createTextNode(":"));
    prompt.appendChild(dir);
    prompt.appendChild(document.createTextNode("$ eji --help"));
    art.className = "terminal-art";
    art.textContent = (PROFILE.bannerArt || []).join("\n");
    help.className = "help-block";
    help.textContent = commandHelp();
    introTranscript.textContent = "";
    introTranscript.appendChild(prompt);
    introTranscript.appendChild(art);
    introTranscript.appendChild(help);
  }

  initFilesystem();

  var baseCommands = [
    "about",
    "./contact.sh",
    "./eji-cli",
    "./eji-cli about",
    "banner",
    "cat about.md",
    "cat contact.sh",
    "cat eji-cli",
    "cat experience.md",
    "cat stack.md",
    "cat work/*/README.md",
    "clear",
    "cd",
    "cd /",
    "cd /home/eric",
    "cd ..",
    "cd work",
    "chmod +x eji-cli",
    "chmod +x contact.sh",
    "chmod -x eji-cli",
    "chmod -x contact.sh",
    "chmod 755 eji-cli",
    "contact",
    "copy email",
    "download resume",
    "experience",
    "grep frontend stack.md",
    "grep Role experience.md",
    "help",
    "help shell",
    "history",
    "man eji",
    "man shell",
    "man vim",
    "ls",
    "ls -la",
    "ls /",
    "ls /home/eric",
    "ls work",
    "ls -la work",
    "ls work/",
    "neofetch",
    "mkdir notes",
    "pwd",
    "resume",
    "touch notes.md",
    "tree",
    "tree work",
    "theme amber",
    "theme blue",
    "theme green",
    "theme light",
    "theme mono",
    "vi about.md",
    "vim about.md",
    "work",
    "whoami",
    "-h",
    "--help"
  ].concat(projectSlugs().reduce(function (acc, slug) {
    return acc.concat([
      "ls work/" + slug + "/",
      "cat work/" + slug + "/README.md",
      "cat work/" + slug + "/impact.diff",
      "cat work/" + slug + "/stack.md",
      "vim work/" + slug + "/README.md"
    ]);
  }, []));

  var completionCommands = baseCommands.concat([
    "eji",
    "eji-cli",
    "eji-cli -h",
    "eji-cli --help",
    "eji -h",
    "eji --help"
  ]).concat(baseCommands.map(function (command) {
    return "eji " + command;
  }));

  var commandNames = [
    "./contact.sh",
    "./eji-cli",
    "alias",
    "cat",
    "cd",
    "chmod",
    "clear",
    "copy",
    "download",
    "echo",
    "eji",
    "eji-cli",
    "find",
    "grep",
    "head",
    "help",
    "history",
    "hostname",
    "id",
    "ls",
    "man",
    "mkdir",
    "print",
    "pwd",
    "resume",
    "tail",
    "theme",
    "touch",
    "tree",
    "vi",
    "vim",
    "wc",
    "who",
    "whoami"
  ];

  var commandsWithTrailingSpace = [
    "./eji-cli",
    "alias",
    "cat",
    "cd",
    "chmod",
    "copy",
    "download",
    "echo",
    "eji",
    "eji-cli",
    "find",
    "grep",
    "head",
    "ls",
    "man",
    "mkdir",
    "print",
    "tail",
    "theme",
    "touch",
    "tree",
    "vi",
    "vim",
    "wc"
  ];

  // Commands that work on their own (real shell builtins / coreutils / eji wrappers).
  var bareCommands = [
    "alias", "cat", "cd", "chmod", "clear", "copy", "download", "echo", "eji",
    "eji-cli", "find", "grep", "head", "help", "history", "hostname", "id", "ls",
    "man", "mkdir", "print", "pwd", "resume", "tail", "theme", "touch", "tree",
    "vi", "vim", "wc", "who", "whoami"
  ];
  // Portfolio subcommands that only run behind `eji` / `eji-cli`.
  var ejiSubcommands = [
    "about", "banner", "contact", "experience", "neofetch", "work"
  ];

  function appendOutput(command, text, promptOverride) {
    if (!output) return;
    var entry = document.createElement("div");
    var commandLine = document.createElement("p");
    var prompt = document.createElement("span");
    var commandText = document.createElement("span");
    var response = text ? createResponse(text) : null;

    entry.className = "terminal-entry";
    commandLine.className = "terminal-command";
    prompt.className = "terminal-command-prompt";
    commandText.className = "terminal-command-text";

    prompt.textContent = promptOverride || promptText();
    commandText.textContent = command;

    commandLine.appendChild(prompt);
    commandLine.appendChild(commandText);
    entry.appendChild(commandLine);
    if (response) entry.appendChild(response);
    output.appendChild(entry);
    if (form) {
      form.scrollIntoView({ block: "nearest" });
    } else {
      output.scrollIntoView({ block: "nearest" });
    }
  }

  function appendInterrupt(command) {
    if (!output) return;
    var entry = document.createElement("div");
    var commandLine = document.createElement("p");
    var prompt = document.createElement("span");
    var commandText = document.createElement("span");

    entry.className = "terminal-entry terminal-interrupt";
    commandLine.className = "terminal-command";
    prompt.className = "terminal-command-prompt";
    commandText.className = "terminal-command-text";

    prompt.textContent = promptText();
    commandText.textContent = (command ? command + " " : "") + "^C";

    commandLine.appendChild(prompt);
    commandLine.appendChild(commandText);
    entry.appendChild(commandLine);
    output.appendChild(entry);
    if (form) form.scrollIntoView({ block: "nearest" });
  }

  function classifyLine(line) {
    if (line.indexOf("+") === 0) return "line-add";
    if (line.indexOf("- removed") === 0 || line.indexOf("- deleted") === 0) return "line-remove";
    if (/─{4,}/.test(line)) return "line-heading";
    if (/^(zsh|cat|cd|ls|mkdir|touch|chmod|vim|vi|grep|tree|man|wc|head|tail|find|alias):/.test(line)) return "line-error";
    if (/^(NAME|DESCRIPTION|SYNOPSIS|USAGE|COMMANDS|OPTIONS|PROJECTS|EXAMPLES|SHELL|TRY|KEYS|FILES|DOCS|SESSION|PIPES|VIM|MODES|NAVIGATION|EDITING|SEE ALSO|AUTHOR|Problem|Role|Impact|Interface|Try):?/.test(line)) {
      return "line-heading";
    }
    if (line.indexOf("|") === 0) return "line-table";
    if (/^d[rwx-]{9}/.test(line) || /\/$/.test(line)) return "line-directory";
    if (/^-..x/.test(line) || /\*$/.test(line)) return "line-executable";
    if (line.indexOf("work/") !== -1 || /^  eji\b/.test(line) || line.indexOf("eji ") !== -1) return "line-path";
    return "";
  }

  function createResponse(text) {
    var response = document.createElement("pre");
    var lines = text.split("\n");
    response.className = "terminal-response";
    lines.forEach(function (line, index) {
      var span = document.createElement("span");
      var lineClass = classifyLine(line);
      span.className = "terminal-line" + (lineClass ? " " + lineClass : "");
      span.textContent = line;
      if (index) response.appendChild(document.createTextNode("\n"));
      response.appendChild(span);
    });
    return response;
  }

  function appendSystem(text) {
    if (!output) return;
    var entry = document.createElement("pre");
    entry.className = "terminal-system";
    entry.textContent = text;
    output.appendChild(entry);
    if (form) form.scrollIntoView({ block: "nearest" });
  }

  function padRight(value, width) {
    var text = String(value);
    while (text.length < width) text += " ";
    return text;
  }

  function normalizePath(path) {
    return path.replace(/^\.?\//, "").replace(/\/$/, "");
  }

  function boot() {
    var entry;
    if (!bootOutput) return;
    if (introTranscript) introTranscript.hidden = true;
    if (form) form.classList.add("is-hidden");
    activeBootSteps = makeRunSteps();
    bootRunFactor = 0.78 + Math.random() * 0.6;
    entry = document.createElement("pre");
    entry.className = "terminal-boot";
    bootOutput.appendChild(entry);
    entry.textContent = bootFrame(activeBootSteps[0], 0);
    window.setTimeout(function () {
      runBootStep(entry, 0);
    }, jitter(bootTiming.startDelay, bootTiming.jitter));
  }

  function makeRunSteps() {
    var out = [];
    var prev = 0;
    bootSteps.forEach(function (step, index) {
      var percent;
      if (index === bootSteps.length - 1) {
        percent = 100;
      } else {
        percent = Math.round(step.percent + (Math.random() * 2 - 1) * 9);
        if (percent < prev + 5) percent = prev + 5;
        if (percent > 95) percent = 95;
      }
      out.push({ label: step.label, percent: percent });
      prev = percent;
    });
    return out;
  }

  function jitter(value, spread) {
    return Math.max(1, Math.round(value * (1 + (Math.random() * 2 - 1) * spread)));
  }

  function bootPause(step) {
    if (step.label === "ready") return jitter(bootTiming.readyPause * bootRunFactor, bootTiming.jitter);
    if (step.percent >= 72) return jitter(bootTiming.slowPause * bootRunFactor, bootTiming.jitter);
    return jitter(bootTiming.pause * bootRunFactor, bootTiming.jitter);
  }

  function bootDuration(startPercent, endPercent) {
    var base = Math.max(bootTiming.minDuration, (endPercent - startPercent) * bootTiming.perPercent);
    return jitter(base * bootRunFactor, bootTiming.jitter);
  }

  function easeBootProgress(value) {
    return value < 0.5
      ? 2 * value * value
      : 1 - Math.pow(-2 * value + 2, 2) / 2;
  }

  function bootFrame(step, percent) {
    var width = 24;
    var filled = Math.round((percent / 100) * width);
    var bar = "#".repeat(filled) + "-".repeat(width - filled);
    var lines = [
      step.label === "ready" && percent === 100 ? "ready." : "[boot] " + step.label + "...",
      "[" + bar + "] " + String(percent).padStart(3, " ") + "%"
    ];
    if (step.label === "ready" && percent === 100) {
      lines.push("hint: interactive shell. explore with `ls`, open files with `cat` or `vim`, press Tab to complete.");
    }
    return lines.join("\n");
  }

  function bootTranscript(stepIndex, step, percent) {
    var lines = activeBootSteps.slice(0, stepIndex).map(function (doneStep) {
      return "[ok]   " + doneStep.label;
    });
    lines.push(bootFrame(step, percent));
    return lines.join("\n");
  }

  function runBootStep(entry, stepIndex) {
    var step;
    var startPercent = stepIndex > 0 ? activeBootSteps[stepIndex - 1].percent : 0;
    var targetPercent;
    var startedAt;
    var duration;
    var nextFrame = window.requestAnimationFrame || function (callback) {
      return window.setTimeout(function () {
        callback(Date.now());
      }, 16);
    };

    if (stepIndex >= activeBootSteps.length || !bootOutput) {
      revealIntro();
      return;
    }
    step = activeBootSteps[stepIndex];
    targetPercent = step.percent;
    duration = bootDuration(startPercent, targetPercent);
    startedAt = window.performance ? window.performance.now() : Date.now();

    function drawFrame(now) {
      var elapsed = now - startedAt;
      var progress = Math.min(1, elapsed / duration);
      var eased = easeBootProgress(progress);
      var percent = Math.round(startPercent + (targetPercent - startPercent) * eased);
      entry.textContent = bootTranscript(stepIndex, step, percent);
      if (progress < 1) {
        nextFrame(drawFrame);
        return;
      }
      entry.textContent = bootTranscript(stepIndex, step, targetPercent);
      window.setTimeout(function () {
        runBootStep(entry, stepIndex + 1);
      }, bootPause(step));
    }

    nextFrame(drawFrame);
  }

  function focusInput() {
    if (!input) return;
    try {
      input.focus({ preventScroll: true });
    } catch (error) {
      input.focus();
    }
  }

  function shouldIgnoreTerminalFocus(event) {
    if (!event.target.closest) return false;
    return Boolean(event.target.closest("input, textarea, select, button, a"));
  }

  function hideCompletionMenu() {
    completionState = null;
    if (!completionMenu) return;
    completionMenu.hidden = true;
    completionMenu.innerHTML = "";
  }

  function renderCompletionMenu() {
    if (!completionMenu || !completionState) return;
    completionMenu.innerHTML = "";
    completionState.items.forEach(function (match, index) {
      var item = document.createElement("span");
      item.className = "completion-item" + (index === completionState.index ? " is-active" : "");
      item.textContent = match.label;
      completionMenu.appendChild(item);
    });
    completionMenu.hidden = false;
  }

  function setCompletionValue(value) {
    input.value = value;
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function commandHasArgs(command) {
    return commandsWithTrailingSpace.indexOf(command) !== -1;
  }

  function makeCompletion(value, label) {
    return {
      value: value,
      label: label || value
    };
  }

  function splitCommandLine(value) {
    var match = value.match(/^(.*?)([^\s]*)$/);
    return {
      before: match ? match[1] : "",
      partial: match ? match[2] : value
    };
  }

  function completeCommandNames(query) {
    var lowerQuery = query.toLowerCase();
    return commandNames.filter(function (command) {
      return command.toLowerCase().indexOf(lowerQuery) === 0;
    }).map(function (command) {
      var value = command + (commandHasArgs(command) ? " " : "");
      return makeCompletion(value, command);
    });
  }

  function completeFixedValues(query, before, partial, values) {
    var lowerPartial = partial.toLowerCase();
    return values.filter(function (value) {
      return value.toLowerCase().indexOf(lowerPartial) === 0;
    }).map(function (value) {
      return makeCompletion(before + value, value);
    });
  }

  function pathCompletionLabel(name, entry) {
    if (name === "..") return "../";
    if (entry.type === "dir") return name + "/";
    return isExecutable(entry) ? name + "*" : name;
  }

  function completePath(query, before, partial, mode) {
    var slashIndex = partial.lastIndexOf("/");
    var dirPart = slashIndex === -1 ? "" : partial.slice(0, slashIndex + 1);
    var namePart = slashIndex === -1 ? partial : partial.slice(slashIndex + 1);
    var dirPath = resolveExistingPath(dirPart || ".");
    var dirEntry = fs[dirPath];
    var names;

    if (!dirEntry || dirEntry.type !== "dir") return [];

    names = dirEntry.children.slice().sort();
    if (namePart.charAt(0) === ".") names = [".."].concat(names);

    return names.reduce(function (items, name) {
      var childPath = name === ".." ? fsParentPath(dirPath) : joinFsPath(dirPath, name);
      var entry = fs[childPath];
      var lowerName = name.toLowerCase();
      var completedPath;
      var label;

      if (!entry || lowerName.indexOf(namePart.toLowerCase()) !== 0) return items;
      if (mode === "dir" && entry.type !== "dir") return items;

      completedPath = dirPart + name + (entry.type === "dir" ? "/" : "");
      label = pathCompletionLabel(name, entry);
      items.push(makeCompletion(before + completedPath, label));
      return items;
    }, []);
  }

  function completeWrappedCommand(query, wrapper) {
    var prefix = wrapper + " ";
    var inner = query.slice(prefix.length);
    var items = getCompletionItems(inner).map(function (item) {
      return makeCompletion(prefix + item.value, item.label);
    });
    // Portfolio subcommands are valid only behind eji/eji-cli, so offer them here.
    if (inner.search(/\s/) === -1) {
      ejiSubcommands.filter(function (name) {
        return name.indexOf(inner.toLowerCase()) === 0;
      }).forEach(function (name) {
        items.push(makeCompletion(prefix + name, name));
      });
    }
    return items;
  }

  function getCompletionItems(query) {
    var context;
    var tokens;
    var command;
    var firstSpace;
    var chmodMode;
    var lower;

    if (!query) return [];
    lower = query.toLowerCase();
    if (lower.indexOf("eji ") === 0) return completeWrappedCommand(query, "eji");
    if (lower.indexOf("eji-cli ") === 0) return completeWrappedCommand(query, "eji-cli");

    firstSpace = query.search(/\s/);
    if (firstSpace === -1) return completeCommandNames(query);

    context = splitCommandLine(query);
    tokens = query.trim().split(/\s+/);
    command = tokens[0];

    if (command === "cd" || command === "tree") return completePath(query, context.before, context.partial, command === "tree" ? "any" : "dir");
    if (command === "ls" || command === "cat" || command === "vi" || command === "vim" ||
        command === "wc" || command === "head" || command === "tail") {
      return completePath(query, context.before, context.partial, "any");
    }
    if (command === "touch" || command === "mkdir") {
      return completePath(query, context.before, context.partial, "any");
    }
    if (command === "find") {
      if (tokens[tokens.length - 1] === "-name" || tokens[tokens.length - 2] === "-name") return [];
      return completePath(query, context.before, context.partial, "any");
    }
    if (command === "grep") {
      if (tokens.length <= 2 && !/\s$/.test(query)) return [];
      return completePath(query, context.before, context.partial, "any");
    }
    if (command === "man") {
      return completeFixedValues(query, context.before, context.partial, manTopics());
    }
    if (command === "chmod") {
      if (tokens.length <= 2 && !/\s$/.test(query)) {
        return completeFixedValues(query, context.before, context.partial, ["+x", "-x", "755", "644"]);
      }
      chmodMode = tokens[1] || "";
      if (chmodMode) return completePath(query, context.before, context.partial, "any");
      return [];
    }
    if (command === "theme") {
      return completeFixedValues(query, context.before, context.partial, ["green", "amber", "blue", "mono", "light"]);
    }
    if (command === "copy") return completeFixedValues(query, context.before, context.partial, ["email"]);
    if (command === "download") return completeFixedValues(query, context.before, context.partial, ["resume"]);
    return completionCommands.filter(function (completion) {
      return completion.toLowerCase().indexOf(query.toLowerCase()) === 0;
    }).map(function (completion) {
      return makeCompletion(completion);
    });
  }

  function completeInput(direction) {
    if (!input) return;
    var raw = input.value;
    var query = raw.trimStart();
    var leadingSpace = raw.slice(0, raw.length - query.length);
    var items;
    var values;
    var index;

    if (!query) return;

    if (completionState && completionState.values.indexOf(query) !== -1) {
      index = completionState.index + direction;
      if (index < 0) index = completionState.items.length - 1;
      if (index >= completionState.items.length) index = 0;
      completionState.index = index;
      setCompletionValue(leadingSpace + completionState.items[index].value);
      renderCompletionMenu();
      return;
    }

    items = getCompletionItems(query);

    if (!items.length) {
      hideCompletionMenu();
      return;
    }

    values = items.map(function (item) {
      return item.value;
    });
    if (items.length === 1 && items[0].value === query) {
      hideCompletionMenu();
      return;
    }

    index = direction > 0 ? 0 : items.length - 1;
    completionState = {
      seed: query,
      items: items,
      values: values,
      index: index,
      current: items[index].value
    };
    setCompletionValue(leadingSpace + completionState.items[index].value);
    if (items.length > 1) renderCompletionMenu();
    else hideCompletionMenu();
  }

  function setTheme(name) {
    var allowed = ["green", "amber", "blue", "mono", "light"];
    if (allowed.indexOf(name) === -1) {
      return "theme not found. try: theme green, theme amber, theme blue, theme mono, theme light";
    }
    document.documentElement.dataset.theme = name;
    try {
      window.localStorage.setItem("portfolio-theme", name);
    } catch (error) {
      return "theme set to " + name + " for this session";
    }
    return "theme set to " + name;
  }

  function copyEmail() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        var copy = navigator.clipboard.writeText(email);
        if (copy && copy.catch) copy.catch(function () {});
        return "copied " + email + " to clipboard";
      } catch (error) {
        return "clipboard unavailable; email: " + email;
      }
    }
    return "clipboard unavailable; email: " + email;
  }

  function downloadResume() {
    var blob = new Blob([resumeText], { type: "text/plain" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "eric-ji-resume.md";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return "downloaded eric-ji-resume.md";
  }

  function getVimFile(path) {
    var normalized = normalizePath(path || "");
    var fsFile = readFsFile(path || "");
    var newPath;
    if (fsFile) return fsFile;
    newPath = resolvePath(path || "");
    if (path && fs[pathDir(newPath)] && fs[pathDir(newPath)].type === "dir") {
      return {
        path: relativeDisplayPath(newPath),
        fsPath: newPath,
        text: "",
        isNew: true,
        userWritable: isWritablePath(newPath)
      };
    }
    normalized = normalized.replace(/\/readme\.md$/, "/README.md");
    if (projectFiles[normalized.replace("work/", "")]) {
      normalized += "/README.md";
    }
    if (vimFiles[normalized]) {
      return {
        path: normalized,
        text: vimFiles[normalized],
        userWritable: false
      };
    }
    return null;
  }

  function appendVimEditor(command, file) {
    var entry = document.createElement("div");
    var commandLine = document.createElement("p");
    var prompt = document.createElement("span");
    var commandText = document.createElement("span");
    var editor = document.createElement("div");
    var buffer = document.createElement("div");
    var status = document.createElement("div");
    var commandBar = document.createElement("div");

    entry.className = "terminal-entry vim-entry";
    commandLine.className = "terminal-command";
    prompt.className = "terminal-command-prompt";
    commandText.className = "terminal-command-text";
    editor.className = "vim-editor";
    buffer.className = "vim-buffer";
    status.className = "vim-status";
    commandBar.className = "vim-command-line";

    prompt.textContent = promptText();
    commandText.textContent = command;
    commandLine.appendChild(prompt);
    commandLine.appendChild(commandText);
    editor.appendChild(buffer);
    editor.appendChild(status);
    editor.appendChild(commandBar);
    entry.appendChild(commandLine);
    entry.appendChild(editor);
    output.appendChild(entry);

    vimState = {
      file: file.path,
      fsPath: file.fsPath || resolvePath(file.path),
      userWritable: Boolean(file.userWritable),
      lines: file.text.split("\n"),
      row: 0,
      col: 0,
      mode: "normal",
      command: "",
      search: "",
      message: file.isNew ? "\"" + file.path + "\" [New File]" : "\""+ file.path + "\" " + file.text.split("\n").length + "L",
      modified: false,
      pending: "",
      yank: "",
      undo: [],
      entry: entry,
      buffer: buffer,
      status: status,
      commandBar: commandBar
    };

    form.classList.add("is-hidden");
    if (input) input.blur();
    renderVim();
    try {
      terminal.focus({ preventScroll: true });
    } catch (error) {
      terminal.focus();
    }
  }

  function openVimCommand(command) {
    var normalized = command.trim();
    var parts;
    var file;
    if (normalized.toLowerCase().indexOf("eji ") === 0) {
      normalized = normalized.slice("eji ".length).trim();
    } else if (normalized.toLowerCase().indexOf("eji-cli ") === 0) {
      normalized = normalized.slice("eji-cli ".length).trim();
    }
    parts = normalized.split(/\s+/);
    if (parts[0] !== "vim" && parts[0] !== "vi") return false;
    if (!parts[1]) {
      appendOutput(command, "vim: missing file operand");
      return true;
    }
    file = getVimFile(parts.slice(1).join(" "));
    if (!file) {
      appendOutput(command, parts[0] + ": " + parts[1] + ": No such file or directory");
      return true;
    }
    appendVimEditor(command, file);
    return true;
  }

  function saveUndo() {
    if (!vimState) return;
    vimState.undo.push({
      lines: vimState.lines.slice(),
      row: vimState.row,
      col: vimState.col
    });
    if (vimState.undo.length > 50) vimState.undo.shift();
  }

  function clampVimCursor() {
    var line;
    if (!vimState.lines.length) vimState.lines = [""];
    vimState.row = Math.max(0, Math.min(vimState.row, vimState.lines.length - 1));
    line = vimState.lines[vimState.row];
    vimState.col = Math.max(0, Math.min(vimState.col, Math.max(0, line.length - (vimState.mode === "insert" ? 0 : 1))));
  }

  function renderVim() {
    var start;
    var end;
    if (!vimState) return;
    clampVimCursor();
    vimState.buffer.innerHTML = "";
    start = Math.max(0, vimState.row - 8);
    end = Math.min(vimState.lines.length, start + 18);
    if (end - start < 18) start = Math.max(0, end - 18);
    vimState.lines.slice(start, end).forEach(function (line, offset) {
      var row = start + offset;
      var rowNode = document.createElement("div");
      var number = document.createElement("span");
      var content = document.createElement("span");
      rowNode.className = "vim-row" + (row === vimState.row ? " is-current" : "");
      number.className = "vim-number";
      content.className = "vim-line";
      number.textContent = String(row + 1).padStart(3, " ");
      renderVimLine(content, line, row === vimState.row);
      rowNode.appendChild(number);
      rowNode.appendChild(content);
      vimState.buffer.appendChild(rowNode);
    });
    vimState.status.textContent = "-- " + vimState.mode.toUpperCase() + " --  " + vimState.file + "  " +
      (vimState.modified ? "[modified]  " : "") + (vimState.row + 1) + "," + (vimState.col + 1);
    vimState.commandBar.textContent = vimState.mode === "command" ? ":" + vimState.command :
      vimState.mode === "search" ? "/" + vimState.command :
      vimState.message;
    if (vimState.entry) vimState.entry.scrollIntoView({ block: "nearest" });
  }

  function renderVimLine(node, line, isCursorLine) {
    var before;
    var cursor;
    var after;
    var charAtCursor;
    if (!isCursorLine) {
      node.textContent = line || " ";
      return;
    }
    before = document.createTextNode(line.slice(0, vimState.col));
    cursor = document.createElement("span");
    charAtCursor = line[vimState.col] || " ";
    cursor.className = "vim-cursor" + (vimState.mode === "insert" ? " is-insert" : "");
    cursor.textContent = charAtCursor;
    after = document.createTextNode(line.slice(vimState.col + (line[vimState.col] ? 1 : 0)));
    node.appendChild(before);
    node.appendChild(cursor);
    node.appendChild(after);
  }

  function closeVim(message) {
    var file = vimState ? vimState.file : "";
    if (vimState && vimState.entry) vimState.entry.remove();
    vimState = null;
    form.classList.remove("is-hidden");
    focusInput();
    appendSystem(message || "vim closed " + file);
  }

  function moveVim(rowDelta, colDelta) {
    vimState.row += rowDelta;
    vimState.col += colDelta;
    vimState.pending = "";
    vimState.message = "";
    renderVim();
  }

  function enterInsertMode(col) {
    vimState.mode = "insert";
    if (typeof col === "number") vimState.col = col;
    vimState.pending = "";
    vimState.message = "-- INSERT --";
    renderVim();
  }

  function firstNonSpace(line) {
    var match = line.match(/\S/);
    return match ? match.index : 0;
  }

  function deleteVimLine() {
    saveUndo();
    vimState.yank = vimState.lines[vimState.row];
    vimState.lines.splice(vimState.row, 1);
    if (!vimState.lines.length) vimState.lines = [""];
    vimState.modified = true;
    vimState.pending = "";
    vimState.message = "1 line deleted";
    renderVim();
  }

  function insertVimText(text) {
    var line = vimState.lines[vimState.row];
    saveUndo();
    vimState.lines[vimState.row] = line.slice(0, vimState.col) + text + line.slice(vimState.col);
    vimState.col += text.length;
    vimState.modified = true;
    renderVim();
  }

  function writeVimBuffer(quitAfterWrite) {
    var content;
    var parentPath;
    var parent;
    if (!vimState.userWritable || !isWritablePath(vimState.fsPath)) {
      vimState.mode = "normal";
      vimState.message = "E212: Can't open file for writing: not allowed to modify";
      renderVim();
      return;
    }
    parentPath = pathDir(vimState.fsPath);
    parent = fs[parentPath];
    if (!parent || parent.type !== "dir") {
      vimState.mode = "normal";
      vimState.message = "E212: Can't open file for writing: No such file or directory";
      renderVim();
      return;
    }
    content = vimState.lines.join("\n");
    if (fs[vimState.fsPath]) {
      fs[vimState.fsPath].content = content;
      fs[vimState.fsPath].userWritable = true;
    } else {
      addFile(vimState.fsPath, content, "-rw-r--r--", { userWritable: true });
    }
    vimState.modified = false;
    vimState.isNew = false;
    vimState.message = "\"" + vimState.file + "\" " + vimState.lines.length + "L written";
    if (quitAfterWrite) {
      closeVim("vim wrote " + vimState.file);
      return;
    }
    vimState.mode = "normal";
    renderVim();
  }

  function executeVimCommand(command) {
    var value = command.trim();
    if (value === "q") {
      if (vimState.modified) {
        vimState.mode = "normal";
        vimState.message = "E37: No write since last change (add ! to override)";
        renderVim();
        return;
      }
      closeVim("vim closed " + vimState.file);
      return;
    }
    if (value === "q!") {
      closeVim("vim closed " + vimState.file + " (changes discarded)");
      return;
    }
    if (value === "w" || value === "write") {
      writeVimBuffer(false);
      return;
    }
    if (value === "wq" || value === "x" || value === "wq!" || value === "x!") {
      writeVimBuffer(true);
      return;
    }
    if (value === "set nu" || value === "set number") {
      vimState.mode = "normal";
      vimState.message = "line numbers already on";
      renderVim();
      return;
    }
    if (value === "help") {
      vimState.mode = "normal";
      vimState.message = "keys: hjkl, i/a/o, x, dd, yy, p, u, /, n, :q, :q!, :wq";
      renderVim();
      return;
    }
    vimState.mode = "normal";
    vimState.message = "E492: Not an editor command: " + value;
    renderVim();
  }

  function searchVim(direction) {
    var query = vimState.search;
    var row;
    var i;
    if (!query) return;
    for (i = 1; i <= vimState.lines.length; i += 1) {
      row = (vimState.row + direction * i + vimState.lines.length) % vimState.lines.length;
      if (vimState.lines[row].toLowerCase().indexOf(query.toLowerCase()) !== -1) {
        vimState.row = row;
        vimState.col = Math.max(0, vimState.lines[row].toLowerCase().indexOf(query.toLowerCase()));
        vimState.message = "/" + query;
        renderVim();
        return;
      }
    }
    vimState.message = "Pattern not found: " + query;
    renderVim();
  }

  function handleVimKey(event) {
    var key = event.key;
    var line;
    if (!vimState) return false;
    event.preventDefault();
    if (event.ctrlKey && key.toLowerCase() === "c") {
      vimState.mode = "normal";
      vimState.command = "";
      vimState.message = "^C";
      renderVim();
      return true;
    }
    if (vimState.mode === "command" || vimState.mode === "search") {
      if (key === "Escape") {
        vimState.mode = "normal";
        vimState.command = "";
        vimState.message = "";
        renderVim();
        return true;
      }
      if (key === "Backspace") {
        vimState.command = vimState.command.slice(0, -1);
        renderVim();
        return true;
      }
      if (key === "Enter") {
        if (vimState.mode === "command") {
          executeVimCommand(vimState.command);
        } else {
          vimState.search = vimState.command;
          vimState.mode = "normal";
          searchVim(1);
        }
        vimState.command = "";
        return true;
      }
      if (key.length === 1 && !event.metaKey && !event.ctrlKey) {
        vimState.command += key;
        renderVim();
      }
      return true;
    }
    if (vimState.mode === "insert") {
      if (key === "Escape") {
        vimState.mode = "normal";
        vimState.col = Math.max(0, vimState.col - 1);
        vimState.message = "";
        renderVim();
        return true;
      }
      if (key === "Backspace") {
        saveUndo();
        line = vimState.lines[vimState.row];
        if (vimState.col > 0) {
          vimState.lines[vimState.row] = line.slice(0, vimState.col - 1) + line.slice(vimState.col);
          vimState.col -= 1;
        } else if (vimState.row > 0) {
          vimState.col = vimState.lines[vimState.row - 1].length;
          vimState.lines[vimState.row - 1] += line;
          vimState.lines.splice(vimState.row, 1);
          vimState.row -= 1;
        }
        vimState.modified = true;
        renderVim();
        return true;
      }
      if (key === "Enter") {
        saveUndo();
        line = vimState.lines[vimState.row];
        vimState.lines[vimState.row] = line.slice(0, vimState.col);
        vimState.lines.splice(vimState.row + 1, 0, line.slice(vimState.col));
        vimState.row += 1;
        vimState.col = 0;
        vimState.modified = true;
        renderVim();
        return true;
      }
      if (key === "ArrowLeft") moveVim(0, -1);
      else if (key === "ArrowRight") moveVim(0, 1);
      else if (key === "ArrowUp") moveVim(-1, 0);
      else if (key === "ArrowDown") moveVim(1, 0);
      else if (key.length === 1 && !event.metaKey && !event.ctrlKey) insertVimText(key);
      return true;
    }
    if (key === "Escape") {
      vimState.pending = "";
      vimState.message = "";
      renderVim();
    } else if (key === ":" ) {
      vimState.mode = "command";
      vimState.command = "";
      renderVim();
    } else if (key === "/") {
      vimState.mode = "search";
      vimState.command = "";
      renderVim();
    } else if (key === "n") {
      searchVim(1);
    } else if (key === "N") {
      searchVim(-1);
    } else if (key === "h" || key === "ArrowLeft") moveVim(0, -1);
    else if (key === "l" || key === "ArrowRight") moveVim(0, 1);
    else if (key === "j" || key === "ArrowDown") moveVim(1, 0);
    else if (key === "k" || key === "ArrowUp") moveVim(-1, 0);
    else if (key === "0") {
      vimState.col = 0;
      renderVim();
    } else if (key === "$") {
      vimState.col = Math.max(0, vimState.lines[vimState.row].length - 1);
      renderVim();
    } else if (key === "G") {
      vimState.row = vimState.lines.length - 1;
      renderVim();
    } else if (key === "g") {
      if (vimState.pending === "g") {
        vimState.row = 0;
        vimState.pending = "";
      } else {
        vimState.pending = "g";
      }
      renderVim();
    } else if (key === "i") enterInsertMode();
    else if (key === "a") enterInsertMode(vimState.col + 1);
    else if (key === "A") enterInsertMode(vimState.lines[vimState.row].length);
    else if (key === "I") enterInsertMode(firstNonSpace(vimState.lines[vimState.row]));
    else if (key === "o" || key === "O") {
      saveUndo();
      vimState.lines.splice(key === "o" ? vimState.row + 1 : vimState.row, 0, "");
      if (key === "o") vimState.row += 1;
      vimState.col = 0;
      vimState.modified = true;
      enterInsertMode(0);
    } else if (key === "x") {
      saveUndo();
      line = vimState.lines[vimState.row];
      vimState.lines[vimState.row] = line.slice(0, vimState.col) + line.slice(vimState.col + 1);
      vimState.modified = true;
      renderVim();
    } else if (key === "d") {
      if (vimState.pending === "d") deleteVimLine();
      else vimState.pending = "d";
    } else if (key === "y") {
      if (vimState.pending === "y") {
        vimState.yank = vimState.lines[vimState.row];
        vimState.pending = "";
        vimState.message = "1 line yanked";
      } else {
        vimState.pending = "y";
      }
      renderVim();
    } else if (key === "p") {
      if (vimState.yank !== "") {
        saveUndo();
        vimState.lines.splice(vimState.row + 1, 0, vimState.yank);
        vimState.row += 1;
        vimState.col = 0;
        vimState.modified = true;
      }
      renderVim();
    } else if (key === "u") {
      if (vimState.undo.length) {
        var previous = vimState.undo.pop();
        vimState.lines = previous.lines;
        vimState.row = previous.row;
        vimState.col = previous.col;
        vimState.modified = true;
        vimState.message = "undo";
      }
      renderVim();
    }
    return true;
  }

  function projectSlugs() {
    return (PROFILE.projects || []).map(function (project) {
      return project.slug;
    });
  }

  function commandHelp() {
    var slugs = projectSlugs();
    var sample = slugs.length ? slugs[0] : "review-console";
    return [
      "eji-cli 0.1.0",
      "",
      "NAME",
      "  " + ownerName + " - " + role.toLowerCase(),
      "",
      "DESCRIPTION",
      "  Builds reliable tools for messy workflows:",
      "  frontend systems, workflow automation, and AI-assisted product surfaces.",
      "",
      "USAGE",
      "  eji [command]",
      "",
      "COMMANDS",
      "  about                           profile and working style",
      "  work                            selected project index",
      "  experience                      role timeline",
      "  contact                         contact details",
      "  banner                          print terminal art",
      "  neofetch                        print profile card",
      "  theme green|amber|blue|mono|light",
      "  copy email                      copy email address",
      "  download resume                 download Markdown resume",
      "  help shell                      show terminal features",
      "  man <command>                   manual page for any command",
      "  help, -h, --help                show this help",
      "",
      "PROJECTS"
    ].concat(slugs.map(function (slug) {
      return "  " + slug;
    })).concat([
      "  explore files under work/<project>/ with ls, cat, and vim",
      "",
      "EXAMPLES",
      "  eji about",
      "  eji work",
      "  cat work/" + sample + "/README.md",
      "  vim work/" + sample + "/README.md",
      "  eji theme green"
    ]).join("\n");
  }

  function shellHelp() {
    var sample = projectSlugs()[0] || "work";
    return [
      "SHELL",
      "  This page implements a small in-memory terminal.",
      "  Portfolio files reset when the page refreshes.",
      "  Parent directories are readable but not writable.",
      "",
      "TRY",
      "  ls -la",
      "  tree",
      "  cd work",
      "  cat " + sample + "/README.md",
      "  grep frontend " + sample + "/stack.md",
      "  vi " + sample + "/README.md",
      "  cd ~",
      "  chmod +x contact.sh",
      "  ./contact.sh",
      "  chmod -x eji-cli",
      "  ./eji-cli",
      "  cat stack.md | grep frontend",
      "  ls > files.txt",
      "  history",
      "",
      "PIPES",
      "  cmd | cmd                       pipe output into the next command",
      "  cmd > file                      write output to a file (overwrite)",
      "  cmd >> file                     append output to a file",
      "  cmd && cmd                      run next only if the first succeeds",
      "  cmd || cmd  /  cmd ; cmd        run on failure  /  run unconditionally",
      "",
      "KEYS",
      "  Tab                             autocomplete",
      "  Shift+Tab                       previous completion",
      "  Up / Down                       command history",
      "  Ctrl+R                          reverse history search",
      "  Ctrl+A / Ctrl+E                 cursor to start / end",
      "  Ctrl+W                          delete the word before the cursor",
      "  Ctrl+C                          cancel input",
      "  Ctrl+L                          clear screen",
      "  Ctrl+U                          clear current input",
      "",
      "FILES",
      "  pwd                             print current directory",
      "  cd [path]                       change directory",
      "  ls [-la] [path]                 list files",
      "  tree [path]                     print a directory tree",
      "  find [path] -name <glob>        search for files",
      "  mkdir <path>                    create a directory in memory",
      "  touch <path>                    create an empty file in memory",
      "  cat <path>                      print a file",
      "  head|tail [-n N] <file>         print first/last lines",
      "  grep <term> <file>              search a file for a term",
      "  wc [-lwc] <file>                count lines, words, bytes",
      "  chmod +x|-x|755 <path>          change executable permissions",
      "  history                         list previous commands",
      "  alias ll='ls -la'               define a session alias",
      "",
      "SESSION",
      "  whoami / who / id / hostname     identity",
      "  echo $?                         exit status of last command",
      "",
      "DOCS",
      "  man <command>                   manual page for any command",
      "  man eji | man shell | man vim   richer reference pages",
      "",
      "VIM",
      "  vi about.md",
      "  vim work/review-console/README.md",
      "  i insert, Esc normal, :q quit, :q! discard, :wq denied"
    ].join("\n");
  }

  function manEji() {
    return [
      "EJI(1)                          eji-cli manual                          EJI(1)",
      "",
      "NAME",
      "       eji - " + ownerName + ", " + role.toLowerCase(),
      "",
      "SYNOPSIS",
      "       eji [command]",
      "       eji-cli [command]",
      "",
      "DESCRIPTION",
      "       eji is the portfolio shell for " + ownerName + ". It exposes",
      "       profile, project, and contact information as subcommands, which",
      "       must be run behind eji or eji-cli. Project files live under work/",
      "       and are explored with the usual shell tools (ls, cat, vim).",
      "",
      "COMMANDS",
      "       about             profile and working style",
      "       work              selected project index",
      "       experience        role timeline",
      "       contact           contact details",
      "       banner            print terminal art",
      "       neofetch          print profile card",
      "       theme <name>      green | amber | blue | mono | light",
      "       copy email        copy email to the clipboard",
      "       download resume   download the Markdown resume",
      "",
      "EXAMPLES",
      "       eji about",
      "       eji work",
      "       cat work/" + (projectSlugs()[0] || "work") + "/README.md",
      "       vim work/" + (projectSlugs()[0] || "work") + "/README.md",
      "",
      "SEE ALSO",
      "       man shell, man vim",
      "",
      "AUTHOR",
      "       " + ownerName + " <" + email + ">"
    ].join("\n");
  }

  function manShell() {
    return [
      "SHELL(7)                        eji-cli manual                        SHELL(7)",
      "",
      "NAME",
      "       shell - the in-memory terminal behind this portfolio",
      "",
      "DESCRIPTION",
      "       This page runs a small simulated shell with an in-memory",
      "       filesystem rooted at /home/eric/portfolio. Edits live only in",
      "       the current tab and reset on refresh. Directories above the",
      "       home directory are readable but not writable.",
      "",
      "COMMANDS",
      "       pwd               print the current directory",
      "       cd [path]         change directory",
      "       ls [-la] [path]   list files",
      "       tree [path]       print a directory tree",
      "       cat <file>        print a file",
      "       grep <term> <f>   search files for a term",
      "       mkdir <path>      create a directory in memory",
      "       touch <path>      create an empty file in memory",
      "       chmod <m> <f>     change executable permission",
      "       history           list previous commands",
      "       clear             clear the screen",
      "",
      "PIPES",
      "       cmd | cmd         pipe output into grep, wc, head, tail, cat",
      "       cmd > file        redirect output to a file (overwrite)",
      "       cmd >> file       redirect output to a file (append)",
      "       cmd && cmd        run next only if the previous succeeded",
      "       cmd || cmd        run next only if the previous failed",
      "       cmd ; cmd         run commands in sequence",
      "",
      "KEYS",
      "       Tab               autocomplete",
      "       Shift+Tab         previous completion",
      "       Up / Down         command history",
      "       Ctrl+R            reverse history search",
      "       Ctrl+A / Ctrl+E   cursor to start / end",
      "       Ctrl+W            delete word before cursor",
      "       Ctrl+C            cancel input",
      "       Ctrl+L            clear screen",
      "       Ctrl+U            clear current input",
      "",
      "SEE ALSO",
      "       man eji, man vim"
    ].join("\n");
  }

  function manVim() {
    return [
      "VIM(1)                          eji-cli manual                          VIM(1)",
      "",
      "NAME",
      "       vim - simulated modal editor for portfolio files",
      "",
      "SYNOPSIS",
      "       vi <file>",
      "       vim <file>",
      "",
      "DESCRIPTION",
      "       Opens a small modal editor. Built-in portfolio files are",
      "       read-only: writes are denied so visitors can experiment",
      "       without changing content. Files created with touch are",
      "       writable in memory until the page reloads.",
      "",
      "MODES",
      "       i a A I o O       enter insert mode",
      "       Esc               return to normal mode",
      "",
      "NAVIGATION",
      "       h j k l           move the cursor",
      "       arrows            move the cursor",
      "       / then term       search; n / N for next / previous",
      "",
      "EDITING",
      "       x                 delete character",
      "       dd                delete line",
      "       yy                yank line",
      "       p                 paste line",
      "       u                 undo",
      "       :q                quit",
      "       :q!               discard and quit",
      "       :w :wq :x         denied (read-only)",
      "",
      "SEE ALSO",
      "       man eji, man shell"
    ].join("\n");
  }

  function splitArgs(command) {
    return command.split(/\s+/).filter(Boolean);
  }

  function commandLooksLikePath(commandName) {
    return commandName.indexOf("/") !== -1 || commandName.indexOf("~") === 0;
  }

  function runExecutablePath(command) {
    var parts = splitArgs(command);
    var executable = parts[0];
    var args = parts.slice(1).join(" ");
    var resolved;
    var entry;
    var name;

    if (!executable || !commandLooksLikePath(executable)) return null;

    resolved = resolveExistingPath(executable);
    entry = fs[resolved];
    if (!entry) return "zsh: no such file or directory: " + executable;
    if (entry.type === "dir") return "zsh: permission denied: " + executable;
    if (!isExecutable(entry)) return "zsh: permission denied: " + executable;

    name = pathBase(resolved);
    if (name === "contact.sh") return entry.content;
    if (name === "eji-cli") return args ? runCommand("eji " + args) : commandHelp();
    return entry.content;
  }

  function walkTree(dirPath, prefix, lines, counts) {
    var children = fs[dirPath].children.slice().sort();
    children.forEach(function (name, index) {
      var childPath = joinFsPath(dirPath, name);
      var child = fs[childPath];
      var last = index === children.length - 1;
      var connector = last ? "└── " : "├── ";
      var suffix = child.type === "dir" ? "/" : isExecutable(child) ? "*" : "";
      lines.push(prefix + connector + name + suffix);
      if (child.type === "dir") {
        counts.dirs += 1;
        walkTree(childPath, prefix + (last ? "    " : "│   "), lines, counts);
      } else {
        counts.files += 1;
      }
    });
  }

  function treeFs(path) {
    var rootArg = path || ".";
    var resolved = resolveExistingPath(rootArg);
    var entry = fs[resolved];
    var counts = { dirs: 0, files: 0 };
    var lines;
    if (!entry) return "tree: " + rootArg + ": No such file or directory";
    if (entry.type === "file") return displayName(resolved, entry);
    lines = [rootArg.replace(/\/+$/, "") || rootArg];
    walkTree(resolved, "", lines, counts);
    lines.push("");
    lines.push(
      counts.dirs + (counts.dirs === 1 ? " directory, " : " directories, ") +
      counts.files + (counts.files === 1 ? " file" : " files")
    );
    return lines.join("\n");
  }

  function historyText() {
    if (!commandHistory.length) return "";
    return commandHistory.map(function (item, index) {
      return String(index + 1).padStart(4, " ") + "  " + item;
    }).join("\n");
  }

  function grepFs(args, stdin) {
    var options = { ignoreCase: false, number: false };
    var operands = [];
    var optionsDone = false;
    var pattern;
    var needle;
    var files;
    var multiple;
    var results = [];
    args.forEach(function (arg) {
      if (!optionsDone && /^-[in]+$/.test(arg)) {
        if (arg.indexOf("i") !== -1) options.ignoreCase = true;
        if (arg.indexOf("n") !== -1) options.number = true;
        return;
      }
      optionsDone = true;
      operands.push(arg);
    });
    if (!operands.length) return "usage: grep [-in] <term> <file>...";
    pattern = operands[0];
    files = operands.slice(1);
    if (!files.length && stdin == null) return "usage: grep [-in] <term> <file>...";
    needle = options.ignoreCase ? pattern.toLowerCase() : pattern;
    multiple = files.length > 1;
    function scan(content, file) {
      content.split("\n").forEach(function (line, index) {
        var haystack = options.ignoreCase ? line.toLowerCase() : line;
        var prefix = "";
        if (haystack.indexOf(needle) === -1) return;
        if (multiple && file) prefix += file + ":";
        if (options.number) prefix += (index + 1) + ":";
        results.push(prefix + line);
      });
    }
    if (!files.length) {
      scan(stdin, null);
      return results.join("\n");
    }
    files.forEach(function (file) {
      var resolved = resolveExistingPath(file);
      var entry = fs[resolved];
      if (!entry) {
        results.push("grep: " + file + ": No such file or directory");
        return;
      }
      if (entry.type === "dir") {
        results.push("grep: " + file + ": Is a directory");
        return;
      }
      scan(entry.content, file);
    });
    return results.join("\n");
  }

  var manEntries = {
    ls: { name: "ls - list directory contents", synopsis: "ls [-la] [path]",
      desc: ["List files and directories. With no path, lists the current directory.",
        "Directories are shown with a trailing /, executables with a trailing *."],
      options: [["-l", "long format with mode, owner, and size"], ["-a", "include entries starting with ."]],
      seealso: "tree, cat, find" },
    cd: { name: "cd - change the working directory", synopsis: "cd [path]",
      desc: ["Change the current directory. With no path, returns to the home directory.",
        "Accepts absolute paths, ~, .. and relative paths."], seealso: "pwd, ls" },
    pwd: { name: "pwd - print working directory", synopsis: "pwd",
      desc: ["Print the full path of the current working directory."], seealso: "cd, ls" },
    cat: { name: "cat - concatenate and print files", synopsis: "cat <file>...",
      desc: ["Print the contents of one or more files to the screen."], seealso: "head, tail, grep" },
    grep: { name: "grep - search files for a term", synopsis: "grep [-in] <term> <file>...",
      desc: ["Print lines of each file that contain the term (substring match).",
        "With multiple files, each match is prefixed with the filename."],
      options: [["-i", "ignore case"], ["-n", "prefix matches with line numbers"]],
      seealso: "find, cat, wc" },
    tree: { name: "tree - print a directory tree", synopsis: "tree [path]",
      desc: ["Print a recursive, indented map of a directory and a summary count."], seealso: "ls, find" },
    find: { name: "find - search for files", synopsis: "find [path] [-name <pattern>]",
      desc: ["Walk a directory tree and print matching paths.",
        "-name takes a glob pattern such as \"*.md\" (quote it to avoid surprises)."],
      options: [["-name", "match basenames against a glob (* and ?)"]], seealso: "tree, grep, ls" },
    head: { name: "head - print the first lines of a file", synopsis: "head [-n N] <file>...",
      desc: ["Print the first N lines of each file (default 10)."],
      options: [["-n N", "print the first N lines"], ["-N", "shorthand for -n N"]], seealso: "tail, cat, wc" },
    tail: { name: "tail - print the last lines of a file", synopsis: "tail [-n N] <file>...",
      desc: ["Print the last N lines of each file (default 10)."],
      options: [["-n N", "print the last N lines"], ["-N", "shorthand for -n N"]], seealso: "head, cat, wc" },
    wc: { name: "wc - count lines, words, and bytes", synopsis: "wc [-lwc] <file>...",
      desc: ["Count lines, words, and bytes in each file. With no flags, prints all three."],
      options: [["-l", "lines only"], ["-w", "words only"], ["-c", "bytes only"]], seealso: "cat, grep" },
    history: { name: "history - show previous commands", synopsis: "history",
      desc: ["Print the commands entered this session, numbered. Reset on refresh.",
        "Use Up / Down to recall entries."], seealso: "alias" },
    alias: { name: "alias - define or list command aliases", synopsis: "alias [name[='value']]",
      desc: ["With no argument, list defined aliases. With name='value', define an alias.",
        "Aliases are session-only and expand as the first word of a command.",
        "Example: alias ll='ls -la'"], seealso: "history" },
    mkdir: { name: "mkdir - make directories", synopsis: "mkdir <path>...",
      desc: ["Create directories in the in-memory filesystem under the home directory."], seealso: "touch, ls" },
    touch: { name: "touch - create empty files", synopsis: "touch <path>...",
      desc: ["Create empty, writable files in memory. Created files can be edited in vim."], seealso: "mkdir, vim" },
    chmod: { name: "chmod - change file mode", synopsis: "chmod +x|-x|755|644 <file>...",
      desc: ["Change the executable bit of in-memory files.",
        "Run chmod +x on a script before executing it with ./name."], seealso: "ls" },
    clear: { name: "clear - clear the terminal screen", synopsis: "clear",
      desc: ["Clear the visible transcript, including boot and help output. Same as Ctrl+L."], seealso: "history" },
    echo: { name: "echo - print a line of text", synopsis: "echo [text]",
      desc: ["Print text. Expands $?, $USER, $HOME, $PWD, $HOSTNAME, and $SHELL."], seealso: "whoami" },
    whoami: { name: "whoami - print the current user", synopsis: "whoami",
      desc: ["Print the effective login name for this session."], seealso: "who, id, hostname" },
    who: { name: "who - show who is logged in", synopsis: "who",
      desc: ["Print the logged-in user, terminal, and login time."], seealso: "whoami, id" },
    id: { name: "id - print user and group identity", synopsis: "id",
      desc: ["Print the user id, group id, and group memberships."], seealso: "whoami, who" },
    hostname: { name: "hostname - print the system name", synopsis: "hostname",
      desc: ["Print the name of the host this shell is running on."], seealso: "whoami, id" },
    theme: { name: "theme - switch the color theme", synopsis: "theme green|amber|blue|mono|light",
      desc: ["Switch the terminal color theme. The choice is saved for return visits."], seealso: "neofetch" },
    copy: { name: "copy - copy contact details", synopsis: "copy email",
      desc: ["Copy the email address to the clipboard."], seealso: "contact, download" },
    download: { name: "download - download the resume", synopsis: "download resume",
      desc: ["Download the Markdown resume file."], seealso: "resume, copy" },
    resume: { name: "resume - download the resume", synopsis: "resume",
      desc: ["Alias for download resume."], seealso: "download" },
    man: { name: "man - display a manual page", synopsis: "man <command>",
      desc: ["Display the manual page for a command. Try man ls, man grep, man eji."], seealso: "help" }
  };

  function manTopics() {
    return ["eji", "shell", "vim"].concat(Object.keys(manEntries)).sort();
  }

  function manPage(topic) {
    var key = String(topic || "").trim().toLowerCase();
    if (!key) return "What manual page do you want?";
    if (key === "eji" || key === "eji-cli") return manEji();
    if (key === "shell") return manShell();
    if (key === "vim" || key === "vi") return manVim();
    if (manEntries[key]) return renderMan(key, manEntries[key]);
    return "No manual entry for " + topic;
  }

  function levenshtein(a, b) {
    var matrix = [];
    var i;
    var j;
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    for (i = 0; i <= b.length; i += 1) matrix[i] = [i];
    for (j = 0; j <= a.length; j += 1) matrix[0][j] = j;
    for (i = 1; i <= b.length; i += 1) {
      for (j = 1; j <= a.length; j += 1) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  }

  function suggestCommand(name, pool) {
    var token = String(name || "").toLowerCase();
    var best = "";
    var bestDistance = Infinity;
    var candidates = pool || bareCommands;
    if (!token) return "";
    candidates.forEach(function (candidate) {
      var distance = levenshtein(token, candidate);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    });
    if (best && bestDistance > 0 && bestDistance <= Math.max(1, Math.floor(token.length / 2))) {
      return best;
    }
    return "";
  }

  function stripQuotes(value) {
    var v = String(value || "");
    if (v.length >= 2 && (v.charAt(0) === '"' || v.charAt(0) === "'") && v.charAt(v.length - 1) === v.charAt(0)) {
      return v.slice(1, -1);
    }
    return v;
  }

  function expandVars(text) {
    return String(text)
      .replace(/\$\?/g, String(lastExitCode))
      .replace(/\$HOME/g, homePath)
      .replace(/\$PWD/g, cwd)
      .replace(/\$USER/g, "guest")
      .replace(/\$HOSTNAME/g, "eji")
      .replace(/\$SHELL/g, "/bin/zsh");
  }

  function exitCodeFor(result) {
    var first;
    if (result == null) return lastExitCode;
    if (/^zsh: command not found:/.test(result)) return 127;
    first = String(result).split("\n")[0];
    if (/^zsh: permission denied:/.test(first)) return 126;
    if (/^[\w./-]+: .*(No such file|Is a directory|not a directory|missing|invalid|cannot|denied|not allowed|not found|for reading)/.test(first)) {
      return 1;
    }
    return 0;
  }

  function expandAlias(command) {
    var match = command.match(/^(\S+)([\s\S]*)$/);
    if (!match) return command;
    if (aliases.hasOwnProperty(match[1])) return aliases[match[1]] + match[2];
    return command;
  }

  function aliasCommand(rawArgs) {
    var body = String(rawArgs || "").trim();
    var keys;
    var eq;
    var key;
    var value;
    if (!body) {
      keys = Object.keys(aliases).sort();
      return keys.map(function (k) {
        return "alias " + k + "='" + aliases[k] + "'";
      }).join("\n");
    }
    eq = body.indexOf("=");
    if (eq === -1) {
      if (aliases.hasOwnProperty(body)) return "alias " + body + "='" + aliases[body] + "'";
      return "alias: " + body + ": not found";
    }
    key = body.slice(0, eq).trim();
    value = stripQuotes(body.slice(eq + 1).trim());
    if (!/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key)) return "alias: invalid alias name: " + key;
    aliases[key] = value;
    return "";
  }

  function countText(content) {
    return {
      lines: content === "" ? 0 : content.split("\n").length,
      words: content.split(/\s+/).filter(Boolean).length,
      bytes: content.length
    };
  }

  function formatWc(options, counts, label) {
    var parts = [];
    if (options.lines) parts.push(String(counts.lines).padStart(4, " "));
    if (options.words) parts.push(String(counts.words).padStart(4, " "));
    if (options.bytes) parts.push(String(counts.bytes).padStart(4, " "));
    return parts.join(" ") + (label ? " " + label : "");
  }

  function wcFs(args, stdin) {
    var options = { lines: false, words: false, bytes: false };
    var optionsDone = false;
    var any = false;
    var files = [];
    var results = [];
    var total = { lines: 0, words: 0, bytes: 0 };
    args.forEach(function (arg) {
      if (!optionsDone && /^-[lwc]+$/.test(arg)) {
        if (arg.indexOf("l") !== -1) options.lines = true;
        if (arg.indexOf("w") !== -1) options.words = true;
        if (arg.indexOf("c") !== -1) options.bytes = true;
        any = true;
        return;
      }
      optionsDone = true;
      files.push(arg);
    });
    if (!any) {
      options.lines = true;
      options.words = true;
      options.bytes = true;
    }
    if (!files.length && stdin != null) return formatWc(options, countText(stdin), "");
    if (!files.length) return "wc: missing file operand";
    files.forEach(function (file) {
      var resolved = resolveExistingPath(file);
      var entry = fs[resolved];
      var counts;
      if (!entry) {
        results.push("wc: " + file + ": No such file or directory");
        return;
      }
      if (entry.type === "dir") {
        results.push("wc: " + file + ": Is a directory");
        return;
      }
      counts = countText(entry.content);
      total.lines += counts.lines;
      total.words += counts.words;
      total.bytes += counts.bytes;
      results.push(formatWc(options, counts, file));
    });
    if (files.length > 1) results.push(formatWc(options, total, "total"));
    return results.join("\n");
  }

  function headTail(args, isHead, stdin) {
    var name = isHead ? "head" : "tail";
    var count = 10;
    var files = [];
    var i = 0;
    var results = [];
    var multiple;
    var stdinLines;
    while (i < args.length) {
      if (args[i] === "-n" && i + 1 < args.length) {
        count = parseInt(args[i + 1], 10);
        i += 2;
        continue;
      }
      if (/^-n\d+$/.test(args[i])) {
        count = parseInt(args[i].slice(2), 10);
        i += 1;
        continue;
      }
      if (/^-\d+$/.test(args[i])) {
        count = parseInt(args[i].slice(1), 10);
        i += 1;
        continue;
      }
      files.push(args[i]);
      i += 1;
    }
    if (isNaN(count) || count < 0) count = 10;
    if (!files.length && stdin != null) {
      stdinLines = stdin.split("\n");
      return (isHead ? stdinLines.slice(0, count) : stdinLines.slice(Math.max(0, stdinLines.length - count))).join("\n");
    }
    if (!files.length) return name + ": missing file operand";
    multiple = files.length > 1;
    files.forEach(function (file, idx) {
      var resolved = resolveExistingPath(file);
      var entry = fs[resolved];
      var lines;
      var selected;
      if (!entry) {
        results.push(name + ": cannot open '" + file + "' for reading: No such file or directory");
        return;
      }
      if (entry.type === "dir") {
        results.push(name + ": error reading '" + file + "': Is a directory");
        return;
      }
      lines = entry.content.split("\n");
      selected = isHead ? lines.slice(0, count) : lines.slice(Math.max(0, lines.length - count));
      if (multiple) {
        if (idx > 0) results.push("");
        results.push("==> " + file + " <==");
      }
      results.push(selected.join("\n"));
    });
    return results.join("\n");
  }

  function globToRegExp(glob) {
    var escaped = glob
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp("^" + escaped + "$");
  }

  function findFs(args) {
    var start = ".";
    var pattern = null;
    var i = 0;
    var resolved;
    var entry;
    var regex;
    var results = [];
    while (i < args.length) {
      if (args[i] === "-name" && i + 1 < args.length) {
        pattern = stripQuotes(args[i + 1]);
        i += 2;
        continue;
      }
      if (args[i].indexOf("-") === 0) {
        i += 1;
        continue;
      }
      start = args[i];
      i += 1;
    }
    resolved = resolveExistingPath(start);
    entry = fs[resolved];
    if (!entry) return "find: '" + start + "': No such file or directory";
    start = start.replace(/\/+$/, "") || start;
    regex = pattern ? globToRegExp(pattern) : null;
    (function walk(path, display) {
      var node = fs[path];
      if (!regex || regex.test(pathBase(path))) results.push(display);
      if (node && node.type === "dir") {
        node.children.slice().sort().forEach(function (childName) {
          walk(joinFsPath(path, childName), display + "/" + childName);
        });
      }
    })(resolved, start);
    return results.join("\n");
  }

  function manHeaderLine(title) {
    var width = 78;
    var mid = "eji-cli manual";
    var gap = Math.max(1, Math.floor((width - title.length * 2 - mid.length) / 2));
    var rightGap = Math.max(1, width - title.length * 2 - mid.length - gap);
    return title + " ".repeat(gap) + mid + " ".repeat(rightGap) + title;
  }

  function renderMan(key, entry) {
    var title = key.toUpperCase() + "(1)";
    var lines = [
      manHeaderLine(title),
      "",
      "NAME",
      "       " + entry.name,
      "",
      "SYNOPSIS",
      "       " + entry.synopsis,
      "",
      "DESCRIPTION"
    ];
    entry.desc.forEach(function (line) {
      lines.push("       " + line);
    });
    if (entry.options && entry.options.length) {
      lines.push("");
      lines.push("OPTIONS");
      entry.options.forEach(function (option) {
        lines.push("       " + padRight(option[0], 10) + option[1]);
      });
    }
    if (entry.seealso) {
      lines.push("");
      lines.push("SEE ALSO");
      lines.push("       " + entry.seealso);
    }
    return lines.join("\n");
  }

  function runCommand(rawCommand, stdin) {
    var command = rawCommand.trim();
    var lower = command.toLowerCase();
    var project;
    var parsed;
    var parts;
    var target;
    var resolved;
    var entry;
    var executableResult;
    var notFoundName;
    var suggestion;
    var viaEji = false;

    if (!command) return "";
    command = expandAlias(command);
    lower = command.toLowerCase();
    if (lower === "eji" || lower === "eji-cli") return commandHelp();
    executableResult = runExecutablePath(command);
    if (executableResult !== null) return executableResult;
    if (lower === "./eji-cli" || lower.indexOf("./eji-cli ") === 0) {
      resolved = resolveExistingPath("./eji-cli");
      entry = fs[resolved];
      if (!entry) return "zsh: no such file or directory: ./eji-cli";
      if (!isExecutable(entry)) return "zsh: permission denied: ./eji-cli";
      command = "eji " + command.slice("./eji-cli".length).trim();
      lower = command.trim().toLowerCase();
      if (lower === "eji") return commandHelp();
    }
    if (lower.indexOf("eji ") === 0) {
      command = command.slice("eji ".length).trim();
      lower = command.toLowerCase();
      viaEji = true;
    } else if (lower.indexOf("eji-cli ") === 0) {
      command = command.slice("eji-cli ".length).trim();
      lower = command.toLowerCase();
      viaEji = true;
    }
    parts = splitArgs(command);
    if (lower === "cd" || lower.indexOf("cd ") === 0) {
      target = parts[1] || "~";
      resolved = resolveExistingPath(target);
      entry = fs[resolved];
      if (!entry) return "cd: no such file or directory: " + target;
      if (entry.type !== "dir") return "cd: not a directory: " + target;
      cwd = resolved;
      updatePrompt();
      return "";
    }
    if (lower === "pwd") return cwd;
    if (lower === "ls" || lower.indexOf("ls ") === 0) {
      parsed = parseLs(command);
      if (parsed.options.invalid) return "ls: invalid option -- '" + parsed.options.invalid + "'";
      if (parsed.targets.length === 1) return listFs(parsed.targets[0], parsed.options);
      return parsed.targets.map(function (item) {
        return item + ":\n" + listFs(item, parsed.options);
      }).join("\n\n");
    }
    if (lower === "mkdir" || lower.indexOf("mkdir ") === 0) return mkdirFs(parts.slice(1));
    if (lower === "touch" || lower.indexOf("touch ") === 0) return touchFs(parts.slice(1));
    if (lower === "chmod" || lower.indexOf("chmod ") === 0) return chmodFs(parts[1], parts.slice(2));
    if (lower === "tree" || lower.indexOf("tree ") === 0) return treeFs(parts[1]);
    if (lower === "grep" || lower.indexOf("grep ") === 0) return grepFs(parts.slice(1), stdin);
    if (lower === "history") return historyText();
    if (lower === "man" || lower.indexOf("man ") === 0) return manPage(parts.slice(1).join(" "));
    if (lower === "wc" || lower.indexOf("wc ") === 0) return wcFs(parts.slice(1), stdin);
    if (lower === "head" || lower.indexOf("head ") === 0) return headTail(parts.slice(1), true, stdin);
    if (lower === "tail" || lower.indexOf("tail ") === 0) return headTail(parts.slice(1), false, stdin);
    if (lower === "find" || lower.indexOf("find ") === 0) return findFs(parts.slice(1));
    if (lower === "alias" || lower.indexOf("alias ") === 0) return aliasCommand(command.slice(5));
    if (lower.indexOf("print ") === 0) return command.slice(6);
    if (lower === "echo" || lower.indexOf("echo ") === 0) return expandVars(command.slice(4).replace(/^\s/, ""));
    if (lower === "clear") {
      clearTerminal();
      return null;
    }
    if (lower === "help shell") return shellHelp();
    if (lower === "help" || lower === "-h" || lower === "--help") return commandHelp();
    if (lower === "whoami") return "guest";
    if (lower === "who") return "guest    ttys000   " + sessionLogin;
    if (lower === "id") return "uid=1000(guest) gid=1000(guest) groups=1000(guest),27(sudo)";
    if (lower === "hostname") return "eji";
    if (viaEji && lower === "banner") return bannerText;
    if (viaEji && lower === "neofetch") return neofetchText;
    if (viaEji && lower === "about") {
      return aboutText;
    }
    if (viaEji && (lower === "work" || lower === "cat work/*/readme.md")) {
      return workText;
    }
    if (viaEji && lower === "experience") {
      return experienceText;
    }
    if (viaEji && lower === "contact") {
      return contactText;
    }
    if (lower === "./contact.sh") {
      resolved = resolveExistingPath("./contact.sh");
      entry = fs[resolved];
      if (!entry) return "zsh: no such file or directory: ./contact.sh";
      if (entry.type === "dir") return "zsh: permission denied: ./contact.sh";
      if (!isExecutable(entry)) {
        return "zsh: permission denied: ./contact.sh";
      }
      return entry.content;
    }
    if (lower.indexOf("theme ") === 0) {
      return setTheme(lower.replace("theme ", "").trim());
    }
    if (lower === "copy email") return copyEmail();
    if (lower === "download resume" || lower === "resume") return downloadResume();
    if (lower === "cat" || lower.indexOf("cat ") === 0) {
      return catFs(parts.slice(1), stdin);
    }
    notFoundName = command.split(/\s+/)[0];
    suggestion = suggestCommand(notFoundName, viaEji ? bareCommands.concat(ejiSubcommands) : bareCommands);
    if (suggestion) {
      return "zsh: command not found: " + notFoundName + "\ndid you mean " + suggestion + "?";
    }
    return "zsh: command not found: " + notFoundName;
  }

  function writeRedirect(redirect, content) {
    var resolved = resolveExistingPath(redirect.file);
    var existing = fs[resolved];
    var parentPath;
    var parent;
    var base;
    if (existing) {
      if (existing.type === "dir") return "zsh: " + redirect.file + ": is a directory";
      if (!existing.userWritable) return "zsh: " + redirect.file + ": permission denied";
      base = existing.content;
      if (redirect.append) {
        if (base && content) base += "\n";
        base += content;
      } else {
        base = content;
      }
      existing.content = base;
      return "";
    }
    resolved = resolvePath(redirect.file);
    parentPath = pathDir(resolved);
    parent = fs[parentPath];
    if (!parent || parent.type !== "dir") return "zsh: " + redirect.file + ": no such file or directory";
    if (!isWritablePath(parentPath)) return "zsh: " + redirect.file + ": permission denied";
    addFile(resolved, content, "-rw-r--r--", { userWritable: true });
    return "";
  }

  function runPipeline(rawCommand) {
    var line = rawCommand.trim();
    var stages;
    var redirect = null;
    var last;
    var match;
    var stdin = null;
    var output = "";
    var stage;
    var i;
    if (!line) return "";
    if (line.indexOf("|") === -1 && !/(?:^|\s)>>?\s*\S+\s*$/.test(line)) {
      return runCommand(line, null);
    }
    stages = line.split("|");
    last = stages[stages.length - 1];
    match = last.match(/(?:^|\s)(>>?)\s*(\S+)\s*$/);
    if (match) {
      redirect = { append: match[1] === ">>", file: match[2] };
      stages[stages.length - 1] = last.slice(0, match.index).trim();
    }
    for (i = 0; i < stages.length; i += 1) {
      stage = stages[i].trim();
      if (!stage) {
        if (stages.length === 1 && redirect) {
          output = "";
          break;
        }
        return "zsh: parse error near `|'";
      }
      output = runCommand(stage, stdin);
      if (output === null) output = "";
      stdin = output;
    }
    if (redirect) return writeRedirect(redirect, output);
    return output;
  }

  // Run a full command line, honoring && (run next on success), || (run next
  // on failure), and ; (always). Each segment is a pipeline + redirection.
  function runLine(rawCommand) {
    var line = rawCommand.trim();
    var parts;
    var op = "";
    var outputs = [];
    var ranNull = false;
    var i;
    var cmd;
    var run;
    var out;
    if (!line) return "";
    parts = line.split(/(\s*(?:&&|\|\||;)\s*)/);
    for (i = 0; i < parts.length; i += 1) {
      if (i % 2 === 1) {
        op = parts[i].trim();
        continue;
      }
      cmd = parts[i].trim();
      if (!cmd) continue;
      run = op === "&&" ? lastExitCode === 0 : op === "||" ? lastExitCode !== 0 : true;
      if (!run) continue;
      out = runPipeline(cmd);
      if (out === null) {
        ranNull = true;
        lastExitCode = 0;
        continue;
      }
      lastExitCode = exitCodeFor(out);
      if (out !== "") outputs.push(out);
    }
    if (!outputs.length && ranNull) return null;
    return outputs.join("\n");
  }

  function submitCommand(command) {
    var displayCommand = command.trim();
    var displayPrompt = promptText();
    var result;
    if (displayCommand && openVimCommand(displayCommand)) {
      lastExitCode = 0;
      commandHistory.push(displayCommand);
      historyIndex = commandHistory.length;
      historyDraft = "";
      hideCompletionMenu();
      return;
    }
    result = runLine(command);
    if (displayCommand && result !== null) appendOutput(displayCommand, result, displayPrompt);
    if (displayCommand) {
      commandHistory.push(displayCommand);
      historyIndex = commandHistory.length;
      historyDraft = "";
      hideCompletionMenu();
    }
  }

  function setInputValue(value) {
    input.value = value;
    input.setSelectionRange(input.value.length, input.value.length);
    hideCompletionMenu();
    updateCursor();
  }

  function recallHistory(direction) {
    if (!commandHistory.length) return;
    if (historyIndex === commandHistory.length) {
      historyDraft = input.value;
    }
    historyIndex = Math.max(0, Math.min(commandHistory.length, historyIndex + direction));
    setInputValue(historyIndex === commandHistory.length ? historyDraft : commandHistory[historyIndex]);
  }

  function hasSelectedText() {
    var selection = window.getSelection ? window.getSelection().toString() : "";
    return Boolean(selection || input.selectionStart !== input.selectionEnd);
  }

  function cancelInput() {
    appendInterrupt(input.value.trim());
    input.value = "";
    historyDraft = "";
    historyIndex = commandHistory.length;
    hideCompletionMenu();
    updateCursor();
  }

  function deleteWordBefore() {
    var pos = input.selectionStart;
    var before = input.value.slice(0, pos);
    var after = input.value.slice(pos);
    var trimmed = before.replace(/\s+$/, "");
    var wordStart = trimmed.search(/\S+$/);
    var newBefore = wordStart === -1 ? "" : trimmed.slice(0, wordStart);
    input.value = newBefore + after;
    input.setSelectionRange(newBefore.length, newBefore.length);
    historyIndex = commandHistory.length;
    hideCompletionMenu();
    updateCursor();
  }

  function searchBack(from, query) {
    var i;
    if (!query) return -1;
    for (i = Math.min(from, commandHistory.length - 1); i >= 0; i -= 1) {
      if (commandHistory[i].indexOf(query) !== -1) return i;
    }
    return -1;
  }

  function renderReverseSearch() {
    var match = searchBack(reverseSearch.from, reverseSearch.query);
    reverseSearch.match = match;
    if (formLabel) formLabel.textContent = "(reverse-i-search)`" + reverseSearch.query + "': ";
    input.value = match === -1 ? "" : commandHistory[match];
    input.setSelectionRange(input.value.length, input.value.length);
    updateCursor();
  }

  function startReverseSearch() {
    if (!commandHistory.length) return;
    reverseSearch = { query: "", from: commandHistory.length - 1, original: input.value, match: -1 };
    hideCompletionMenu();
    renderReverseSearch();
  }

  function endReverseSearch(accept) {
    if (!reverseSearch) return;
    if (!accept) {
      input.value = reverseSearch.original;
    } else if (reverseSearch.match >= 0) {
      input.value = commandHistory[reverseSearch.match];
    }
    reverseSearch = null;
    updatePrompt();
    input.setSelectionRange(input.value.length, input.value.length);
    updateCursor();
  }

  function handleReverseSearchKey(event) {
    var key = event.key;
    if (event.ctrlKey && key.toLowerCase() === "r") {
      event.preventDefault();
      reverseSearch.from = reverseSearch.match >= 0 ? reverseSearch.match - 1 : reverseSearch.from;
      renderReverseSearch();
      return;
    }
    if (key === "Escape" || (event.ctrlKey && (key.toLowerCase() === "c" || key.toLowerCase() === "g"))) {
      event.preventDefault();
      endReverseSearch(false);
      return;
    }
    if (key === "Enter") {
      endReverseSearch(true);
      return;
    }
    if (key === "Backspace") {
      event.preventDefault();
      reverseSearch.query = reverseSearch.query.slice(0, -1);
      reverseSearch.from = commandHistory.length - 1;
      renderReverseSearch();
      return;
    }
    if (key === "ArrowLeft" || key === "ArrowRight" || key === "Home" || key === "End" || key === "Tab") {
      endReverseSearch(true);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      reverseSearch.query += key;
      reverseSearch.from = commandHistory.length - 1;
      renderReverseSearch();
    }
  }

  function setupCursor() {
    if (!form || !input) return;
    cursorMirror = document.createElement("span");
    cursorMirror.className = "cursor-mirror";
    cursorMirror.setAttribute("aria-hidden", "true");
    cursorEl = document.createElement("span");
    cursorEl.className = "terminal-cursor";
    cursorEl.setAttribute("aria-hidden", "true");
    form.appendChild(cursorMirror);
    form.appendChild(cursorEl);
    form.classList.add("has-fake-cursor");
    ["input", "keyup", "click", "focus", "select"].forEach(function (eventName) {
      input.addEventListener(eventName, updateCursor);
    });
    input.addEventListener("blur", function () {
      if (cursorEl) cursorEl.style.display = "none";
    });
    if (window.addEventListener) window.addEventListener("resize", updateCursor);
  }

  function updateCursor() {
    var style;
    var caret;
    var marker;
    if (!cursorEl || !cursorMirror || !input) return;
    if (document.activeElement !== input) {
      cursorEl.style.display = "none";
      return;
    }
    try {
    style = window.getComputedStyle(input);
    cursorMirror.style.fontFamily = style.fontFamily;
    cursorMirror.style.fontSize = style.fontSize;
    cursorMirror.style.fontWeight = style.fontWeight;
    cursorMirror.style.fontStyle = style.fontStyle;
    cursorMirror.style.letterSpacing = style.letterSpacing;
    cursorMirror.style.paddingLeft = style.paddingLeft;
    cursorMirror.style.left = input.offsetLeft + "px";
    cursorMirror.style.top = input.offsetTop + "px";
    caret = input.selectionStart;
    cursorMirror.textContent = input.value.slice(0, caret);
    marker = document.createElement("span");
    marker.textContent = input.value.charAt(caret) || " ";
    cursorMirror.appendChild(marker);
    cursorEl.style.display = "block";
    cursorEl.style.left = (input.offsetLeft + marker.offsetLeft - input.scrollLeft) + "px";
    cursorEl.style.top = (input.offsetTop + (input.offsetHeight - (parseFloat(style.fontSize) * 1.2)) / 2) + "px";
    cursorEl.style.width = Math.max(7, marker.offsetWidth || 8) + "px";
    cursorEl.style.height = (parseFloat(style.fontSize) * 1.2) + "px";
    cursorEl.style.animation = "none";
    void cursorEl.offsetWidth;
    cursorEl.style.animation = "";
    } catch (error) {
      cursorEl.style.display = "none";
    }
  }

  if (form && input) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (reverseSearch) endReverseSearch(true);
      submitCommand(input.value);
      input.value = "";
      focusInput();
      updateCursor();
    });

    input.addEventListener("keydown", function (event) {
      if (reverseSearch) {
        handleReverseSearchKey(event);
        return;
      }
      if (event.ctrlKey && !event.altKey && !event.metaKey) {
        if (event.key.toLowerCase() === "c" && !hasSelectedText()) {
          event.preventDefault();
          cancelInput();
          return;
        }
        if (event.key.toLowerCase() === "l") {
          event.preventDefault();
          clearTerminal();
          return;
        }
        if (event.key.toLowerCase() === "u") {
          event.preventDefault();
          setInputValue("");
          historyDraft = "";
          hideCompletionMenu();
          return;
        }
        if (event.key.toLowerCase() === "r") {
          event.preventDefault();
          startReverseSearch();
          return;
        }
        if (event.key.toLowerCase() === "a") {
          event.preventDefault();
          input.setSelectionRange(0, 0);
          updateCursor();
          return;
        }
        if (event.key.toLowerCase() === "e") {
          event.preventDefault();
          input.setSelectionRange(input.value.length, input.value.length);
          updateCursor();
          return;
        }
        if (event.key.toLowerCase() === "w") {
          event.preventDefault();
          deleteWordBefore();
          return;
        }
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        recallHistory(-1);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        recallHistory(1);
      }
      if (event.key === "Tab") {
        event.preventDefault();
        completeInput(event.shiftKey ? -1 : 1);
      }
    });

    input.addEventListener("input", function () {
      hideCompletionMenu();
      updateCursor();
    });

    setupCursor();

    if (terminal) {
      terminal.addEventListener("click", function (event) {
        if (shouldIgnoreTerminalFocus(event)) return;
        if (vimState) {
          try {
            terminal.focus({ preventScroll: true });
          } catch (error) {
            terminal.focus();
          }
          return;
        }
        focusInput();
      });
    }
  }

  document.addEventListener("keydown", function (event) {
    if (vimState) handleVimKey(event);
  });

  try {
    var savedTheme = window.localStorage.getItem("portfolio-theme");
    if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  } catch (error) {
    // Ignore storage errors; themes still work for the current page.
  }

  updatePrompt();
  renderIntro();
  boot();
})();
