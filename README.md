# Triple Triad

Faithful fan clone of the Triple Triad minigame from *Final Fantasy VIII*, built with **Electron**, **TypeScript**, **Vite**, and **electron-vite**. Rendering uses **Canvas 2D**.

## Current build (v0.1)

- Local **2-player** or **vs CPU** (Easy / Normal / Hard AI)
- **Open** (default), **Same**, **Plus**, **Combo**, **Random**, **Elemental**, **Same Wall**, **Sudden Death**
- Setup screen with **rule toggles** and **region presets** (Balamb, Galbadia, Dollet, …)
- Full **110-card** stat database; **collection** screen to build a **5-card deck** from owned cards
- **Earn cards** after beating the CPU (random card from the CPU’s played hand you don’t own)
- Place + flip **animations**; optional **SFX** (download with `npm run assets:sounds`)
- Screens: main menu → collection / setup → play → result
- **Mouse** input; profile in `localStorage` (owned cards, deck, wins/losses, SFX toggle)

## Requirements

- Node.js **20.19+** or **22.12+**

## Development

```bash
npm install
npm run assets          # download all 110 cards + board (see Assets below)
npm run assets:sounds   # optional SFX (Web Audio fallback if missing)
npm run dev
```

## Assets (ripped FF8 art)

Card faces and board art are **not** committed (Square Enix copyright). For local play:

```bash
npm run assets
```

That pulls all **110** card faces plus board/frames from the [triple-triad-html5](https://github.com/itdelatrisu/triple-triad-html5) reference project (mod-pack art). For a quick test with only 5 cards: `npm run assets:sample`.

Alternative rips: [Spriters Resource — Triple Triad Cards](https://www.spriters-resource.com/playstation/finalfantasy8/asset/35819/) → place as `src/renderer/assets/cards/001.png` … `110.png`

Optional: `board.png`, `frame-blue.png`, `frame-red.png` in `src/renderer/assets/`.

The game draws **placeholder** frames and labels when images are missing.

## Gameplay

1. **Collection / Deck** — toggle cards into your 5-card deck (required unless **Random** is on)
2. **Play** → setup: choose **2 Players** or **vs CPU**, rules, and first player
3. Active player clicks a card in their hand (right = blue P1, left = red P2)
4. Click an empty board cell to place (click again on the same cell if already selected)
5. Higher adjacent rank captures the opponent’s card
6. **Same** — two or more adjacent sides match ranks → those cards flip (if at least one is the opponent’s)
7. **Plus** — two or more adjacent side sums match → those cards flip (Same takes priority if both apply)
8. **Combo** — after Same/Plus, chain flips along weaker adjacent sides
9. Most cards on the board when all **9** cells are full wins; beat the **CPU** to earn a new card

## Roadmap

| Phase | Feature |
|-------|---------|
| ✅ 0–1 | Electron shell, Open rules, 2P, screens |
| ✅ 2 | Same, Plus, Combo |
| ✅ 3 | Random, Elemental, Same Wall, Sudden Death, rules setup UI |
| ✅ 4 | CPU opponent |
| ✅ 5 | Deck building, earning cards, animations, SFX |

## Card data credit

Card stats derived from [itdelatrisu/triple-triad-html5](https://github.com/itdelatrisu/triple-triad-html5) (GPL-3.0). Game logic rewritten in TypeScript.

## License

Code: MIT (or your choice). FFVIII assets and trademarks belong to Square Enix.
