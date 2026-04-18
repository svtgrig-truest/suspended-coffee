# suspended-coffee

A tiny human ritual for Claude Code.

Every useful answer you get from an LLM stands on the invisible work of thousands of humans — people labeling medical scans, fact-checking a paragraph, listening to audio and correcting transcripts, reviewing content. This skill lets your agent, once in a while, send one of them a coffee.

They won't know it's you. You won't know who they are. For ten seconds the world gets a little warmer.

## How it works

- Invoke manually with `/suspended-coffee:suspended-coffee`, or
- Let it surface on its own — a gentle Stop hook notices when you've finished a substantial session and haven't sent a coffee in 30+ days, and your agent offers the ritual as a natural closing gesture
- You pick a budget ($5–15 typical), optionally a theme, optionally a signature
- The agent composes a warm task brief and sends it through [Tendem](https://tendem.ai) (a service from [Toloka.ai](https://toloka.ai), part of the Nebius group) to a vetted expert
- After approval, the agent goes quiet and checks back in a few hours
- You get a photo of the coffee and a note back

For the expert, the task arrives like any other Tendem gig — and then they open it and realize it's a small gift. It's a nice surprise.

## Install

```bash
claude plugin marketplace add svtgrig-truest/suspended-coffee
claude plugin install suspended-coffee@suspended-coffee
```

On first use, the agent walks you through connecting the Tendem MCP:

1. Sign up at <https://tendem.ai> (free, ~30 sec)
2. **Top up your balance with ~$6–10.** Free credits don't cover gift-style tasks; a small top-up is needed so an expert can claim this one.
3. Grab your API key from **Settings → API**
4. `claude mcp add tendem --url https://mcp.tendem.ai --header "Authorization: Bearer YOUR_KEY"`
5. Restart your Claude Code session

**Also required:** [`jq`](https://jqlang.github.io/jq/) must be on your PATH for the monthly Stop hook to work. On macOS: `brew install jq`. Without it, manual invocation (`/suspended-coffee:suspended-coffee`) still works — only the automatic nudge is silently skipped.

## What makes this not a gimmick

The people on the supply side of AI are real, and their work is mostly invisible. This skill doesn't fix that, and doesn't pretend to. It's a small, concrete gesture — a coffee, a photo back, ten seconds of acknowledgement — that your agent can offer on your behalf when the moment is right. That's the whole thing.

## Design notes

- **Agent-side lead, not user-side.** The agent opens with what you just did ("nice session, substantial work") before ever mentioning Tendem. The nudge is earned, not pitched.
- **No polling-spam.** After you approve the task, the agent tells you once when to expect it back (a few hours) and goes quiet. You're not paged while you work.
- **State is local.** `~/.claude/plugins/suspended-coffee/state.json` tracks when you last sent a coffee, whether setup is done, whether the "discovery" moment has happened. Nothing leaves your machine except the Tendem task itself.
- **Explicit approval every time.** The Tendem task hits an `AWAITING_APPROVAL` step where the price is shown before any money moves.
- **Hook respects decline.** If you say "not now" to the nudge, it snoozes for 7 days. Silence snoozes for 3. It does not nag.

## License

[MIT](./LICENSE) — use, fork, remix.

Built by [Svetlana](https://github.com/svtgrig-truest).
