# Flowglad PR Updates Bot

This is a small Discord bot I built for Flowglad that listens for GitHub `pull_request` webhooks and posts a message into a Discord channel whenever a PR is merged.

It’s simple on purpose:

- 🧩 You can run it yourself if you want the same behavior.
- 🚀 I keep my own instance running for my servers and repos.
- 🐙 Currently wired to work great with: https://github.com/flowglad/flowglad

---

## What the bot does

- 📡 Exposes an HTTP endpoint: `POST /github-webhook`
- 📬 Listens for GitHub events with header: `x-github-event: pull_request`
- 🎯 Filters for:
  - `action === "closed"`
  - `pull_request.merged === true`
- 🔔 When a PR is merged, it sends a Discord embed to a configured channel with:
  - 📦 Repo name (`owner/repo`)
  - 📝 PR title and number
  - 👤 Opened by (GitHub username)
  - ✅ Merged by (GitHub username / actor)
  - 🌿 Target branch (e.g. `main`)
  - 🔗 Link to the PR

If it’s not a merged PR, the event is ignored.
