/*
 * profile.js — YOUR DETAILS LIVE HERE.
 * ------------------------------------------------------------------
 * This is the only file you need to edit to make the portfolio yours.
 * It holds the content; js/terminal.js holds the behavior. Fill in the
 * fields below, save, and refresh the page. No build step.
 *
 * Tips:
 *  - Anything in [ ... ] is a list; each "line" is one entry in quotes.
 *  - Keep the quotes and commas. Lines that wrap on screen are fine.
 *  - To add/remove a project or job, copy or delete a { ... } block.
 *  - Don't rename the keys (name, email, projects, ...) — terminal.js
 *    reads them by name.
 */
var EJI_PROFILE = {
  /* ---- Identity ------------------------------------------------- */
  name: "Eric Ji",
  role: "Software Engineer",
  email: "ericji1326@gmail.com",
  // One-line tagline shown under the ASCII banner.
  tagline: "software engineer / distributed systems / platform services / infrastructure",

  /* ---- about ---------------------------------------------------- */
  // Shown by `eji about`. The three values fill a small table; `bio`
  // is the paragraph underneath (one array entry per line).
  about: {
    focus: "backend systems, AI workflow tools, CI/CD",
    style: "pragmatic, explicit, low-maintenance",
    bias: "boring foundations, thoughtful edges",
    bio: [
      "I like software that explains itself: narrow interfaces, predictable",
      "behavior, observable workflows, and code that makes the next change cheaper."
    ]
  },

  /* ---- neofetch card -------------------------------------------- */
  // Shown by `eji neofetch` (the little ASCII profile card).
  neofetch: {
    focus: "backend systems, automation, AI tools",
    style: "explicit tradeoffs, calm interfaces"
  },

  /* ---- contact -------------------------------------------------- */
  // Shown by `eji contact` / `./contact.sh`. Your email is reused here.
  contactStatus: "open to useful conversations",

  /* ---- experience ----------------------------------------------- */
  // Shown by `eji experience`. One block per role, newest first.
  // Fields: period, role, company, location, team, skills, and an
  // optional detail (array of extra lines).
  experience: [
    {
      period: "May 2025 - Present",
      role: "Associate Software Engineer",
      company: "Riot Games",
      location: "Los Angeles, California",
      team: "VALORANT Core Services",
      skills: "Go, Kubernetes, CI/CD, Microservices, Loadtesting"
    },
    {
      period: "Sep 2024 - Dec 2024",
      role: "Software Engineer Intern",
      company: "Autodesk",
      location: "Toronto, Ontario, Canada",
      team: "Autodesk Platform Services",
      skills: "Java, Spring Framework, Splunk, OpenTelemetry, Microservices"
    },
    {
      period: "May 2024 - Aug 2024",
      role: "Software Engineer Intern",
      company: "Riot Games",
      location: "Los Angeles, California",
      team: "VALORANT Core Services",
      skills: "Go, Microservices, Infrastructure, Kubernetes, Integration Testing, CI/CD"
    },
    {
      period: "May 2023 - Aug 2023",
      role: "Software Engineer Intern",
      company: "RBC",
      location: "Toronto, Ontario, Canada",
      team: "Open Banking APIs",
      skills: "Java, Spring Framework, Openshift, Kafka"
    },
    {
      period: "Jan 2023 - Apr 2023",
      role: "Software Engineer Intern",
      company: "Spare",
      location: "Vancouver, British Columbia, Canada",
      team: "Platform Infrastructure",
      skills: "TypeScript, Jest, Argo, Docker, Google Cloud Platform"
    },
    {
      period: "May 2022 - Dec 2022",
      role: "Software Engineer Intern",
      company: "Activision",
      location: "Vancouver, British Columbia, Canada",
      team: "Call of Duty Data Pipelines",
      skills: "Google Cloud Platform, Apache Kafka, Java, Kotlin, Prometheus, Grafana, Kubernetes, Jenkins",
      detail: [
        "Credited in Call of Duty: Modern Warfare II (2022)."
      ]
    },
    {
      period: "May 2021 - Apr 2022",
      role: "Software Engineer Intern",
      company: "Huawei",
      location: "Toronto, Ontario, Canada",
      team: "EDA Toolchains (Routing Algorithms)",
      skills: "C++, Python, Bash, Operating Systems, Algorithms"
    }
  ],

  /* ---- stack ---------------------------------------------------- */
  // Shown by `cat stack.md`. Each row is [ area, tools/habits ].
  stack: [
    ["languages", "Go, Java, Python, Kotlin, C++, TypeScript, SQL, Bash"],
    ["backend & data", "Kafka, Spring Boot, Node.js, gRPC, PostgreSQL, Redis, Microservices"],
    ["cloud & infra", "Docker, Kubernetes, Terraform, Helm, Argo CD, Jenkins, AWS, GCP, Linux"],
    ["observability", "OpenTelemetry, Prometheus, Grafana, Datadog, Splunk"]
  ],

  /* ---- projects ------------------------------------------------- */
  // Shown by `eji work` and explorable as files under work/<slug>/.
  //  slug:         folder name (lowercase, no spaces)
  //  name:         display name in the work table
  //  problem:      one-line problem statement
  //  contribution: what you did (work-table column)
  //  status:       e.g. shipped | current | prototype
  //  readme/diff/stack: the contents of README.md, impact.diff, stack.md
  projects: [
    {
      slug: "portfolio-shell",
      name: "Portfolio Shell",
      problem: "terminal-style portfolio",
      contribution: "static HTML/CSS/JS terminal",
      status: "current",
      readme: [
        "Problem: present work as an interactive terminal, not a generic site.",
        "Role:    design and implementation.",
        "Stack:   vanilla HTML, CSS, JavaScript - zero build step.",
        "",
        "Interface",
        "- in-memory shell: cd, ls, cat, grep, find, pipes, vim",
        "- command history, Ctrl+R search, tab completion, themes",
        "- all content driven by a single profile.js file"
      ],
      diff: [
        "+ in-memory filesystem and shell commands",
        "+ pipes, redirection, and a simulated vim",
        "+ history search, tab completion, themes",
        "+ profile-driven content (one editable file)"
      ],
      stack: [
        "frontend:      HTML, CSS, vanilla JavaScript",
        "hosting:       GitHub Pages, static, no build step",
        "interaction:   shell, history, autocomplete, themes",
        "constraints:   low maintenance, fast, portable"
      ]
    }
  ],

  /* ---- resume --------------------------------------------------- */
  // Shown by `download resume` / `resume` (downloads a Markdown file).
  resume: {
    focus: [
      "backend & distributed systems",
      "platform services & infrastructure",
      "data pipelines & streaming",
      "CI/CD & observability"
    ],
    selectedWork: [
      "Portfolio Shell: static terminal-themed portfolio"
    ]
  },

  /* ---- banner art (optional) ------------------------------------ */
  // ASCII shown by `eji banner` and on the intro screen. If you change
  // your name, regenerate this (e.g. patorjk.com/software/taag, font
  // "Slant") and paste the lines here. Backslashes must be doubled.
  bannerArt: [
    "█████ █████ █████       █████ █     █████",
    "█        █    █         █     █       █",
    "████     █    █    ███  █     █       █",
    "█     █  █    █         █     █       █",
    "█████  ███  █████       █████ █████ █████"
  ]
};
