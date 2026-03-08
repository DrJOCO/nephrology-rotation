# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Local Agent Loop

This repo includes a small desktop orchestrator for a bounded Claude/Codex exchange without wiring API keys into your own app.

The script now lives at:

`/Users/joncheng/Documents/Premier Nephrology/Codex_Claude_Testing/agent-loop.mjs`

Its default workspace is:

`/Users/joncheng/Documents/Premier Nephrology/Codex_Claude_Testing`

Run it with:

```bash
npm run agent:loop -- --prompt "Review the current repo structure"
```

Useful flags:

```bash
npm run agent:loop -- --prompt "Audit src/App.jsx" --rounds 2
npm run agent:loop -- --prompt "Review the admin workflow" --project "Premier Nephrology Admin"
npm run agent:loop -- --prompt "Suggest a safer auth architecture" --claude-cmd "/opt/homebrew/bin/claude -p"
```

What it does:

- Runs Claude as the builder
- Runs Codex as the reviewer
- Repeats for up to 3 rounds
- Runs Claude once more to synthesize the final answer
- Includes the project name in every round so both agents stay anchored to the same target
- Saves transcripts under `.agent-loop/transcripts/<timestamp>/`

Notes:

- The default Codex command is `codex exec --skip-git-repo-check --full-auto -C "<workspace>"`
- The default Claude command is `claude -p`
- The default workspace is `/Users/joncheng/Documents/Premier Nephrology/Codex_Claude_Testing`
- The project defaults to the current workspace folder name, or you can override it with `--project`
- In this workspace, `codex` is installed but `claude` was not on `PATH` when this was added, so you may need to pass `--claude-cmd` with the full binary path
