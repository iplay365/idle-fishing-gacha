# Idle Fishing Gacha 🎣

A cute, mobile-first idle fishing game. You cast by hand, collect fish, sell them to NPC buyers, pull rods and crew from gacha capsules, and let your crew fish while you're away.

Built with React + TypeScript + Vite as an installable PWA. It runs in the browser only, with no backend, accounts or paid services. Progress is saved in `localStorage`.

## How to play

| Tab | What you do |
| --- | --- |
| 🎣 **Fish** | Tap **Cast**, wait, and tap **REEL!** as soon as the `!` appears. Most casts come back empty. Rarer fish give you less time to react, and reeling too early spooks the fish. |
| 🎒 **Bag** | Holds up to 40 fish. Tap a fish to list it on the market or quick-sell it right away for 40% of its value. |
| 🏪 **Market** | Up to 6 listings at once. NPC buyers pay when the timer runs out, minus an 8% fee. Pricing: **Bargain** sells fast at a lower price, **Fair** is normal, **Premium** pays more but waits longer. |
| 🎁 **Gacha** | **Tackle Capsule** (800 🪙) gives rods with rolled *bite*, *luck* and *size* stats. **Crew Capsule** (2,000 🪙) gives Common through Mythic workers. You can scrap or release duplicates for coins. |
| 🐾 **Crew** | Workers fish automatically: 5–18 catches/hr, mostly commons. You start with 1 free slot. Slots 2–5 cost 8k / 40k / 160k / 600k coins. |

**Offline progress:** when you come back, crew fishing and market sales are simulated for up to **4 hours**. Time away beyond the cap counts as paused, so unfinished market timers are pushed back by the extra time. If the bag fills up, extra crew catches are sold automatically at the quick-sell rate.

**Save:** the game autosaves every 10 seconds and when the tab is hidden or closed. Under ⚙️ Settings you can save manually, export or import a save code (backup or move to another device), or reset.

## Balance

Every probability, timer, price and upgrade cost is in **`src/game/config.ts`**. Some rough numbers:

- Manual bite chance is 25% (up to 50% with the best rods). A bite is 70% Common and 0.05% Mythic before rod luck.
- Active fishing earns roughly 1–3k coins/hr early on. A Common worker earns about 50 coins/hr, and five Mythic workers together still earn less than active play.
- Gacha Mythic rate is 0.1%. Slot 5 alone costs 600k, so a full crew of good workers takes many sessions to build.

## Development

Requires Node 18+ (CI uses Node 20).

```bash
npm install
npm run dev        # dev server at http://localhost:5173 (use --host to test on a phone on your LAN)
npm test           # Vitest unit tests (economy, inventory, offline progression, save/load)
npm run build      # typecheck + production build to dist/
npm run preview    # serve the production build at http://localhost:4173
```

The service worker is only registered in production builds (`npm run build && npm run preview`).

### Project layout

```
src/game/      pure, framework-free game logic (all randomness injected as an Rng)
  config.ts    ← balance sheet
  fishing.ts   cast resolution, fish rolls
  inventory.ts bag, quick-sell, overflow
  market.ts    listings and NPC sales
  gacha.ts     rod/worker pulls, slots
  progress.ts  shared live-tick + capped offline simulation
  save.ts      localStorage + export codes
src/ui/        React components and the useGame hook
public/        PWA manifest, service worker, icons
tests/         Vitest suites
```

To regenerate the PNG icons from `public/icon.svg`, run `node scripts/make-icons.mjs` (needs Playwright).

## Deploying

`npm run build` produces a fully static `dist/` folder. Asset paths are relative (`base: './'`), so you can host it at a domain root or under a sub-path.

- **Netlify / Vercel / Cloudflare Pages:** build command `npm run build`, output directory `dist`.
- **GitHub Pages:** push the contents of `dist/` to a `gh-pages` branch (for example `npx gh-pages -d dist`), or use the official *Deploy static content to Pages* Action with `path: dist`.
- **Any static server:** copy `dist/` over.

PWA install needs **HTTPS** (or localhost):
- **Android Chrome:** menu → *Install app* / *Add to Home screen*.
- **iOS Safari:** Share → *Add to Home Screen*. Saves are kept per origin. iOS may clear storage for sites that go unused for a long time, so use *Export code* as a backup.

After changing cached files, bump `VERSION` in `public/sw.js` so returning players get the new build right away.
