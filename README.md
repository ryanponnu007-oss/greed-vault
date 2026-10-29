# 🚨 GREED VAULT

> **A fast-paced, real-time multiplayer party heist game with synchronized screens and zero-login room codes.**

Built for the **Handshake AI Multiplayer Game Challenge**.

---

## 🎮 Game Concept & Rules
- **The Core Loop:** 2 to 12 players infiltrate a high-security vault. Rare artifacts (Diamond Crown, Alien Core, Golden Skull) are up for grabs.
- **The Greed Ticker:** The player holding the loot sees its black-market value surging exponentially ($100 → $500 → $2,000 → $10,000+).
- **The Secret Fuse:** At any split-second, vault security initiates a **LOCKDOWN**. If you get caught holding the loot, you are **BUSTED** and walk away with **$0**!
- **One-Tap Decisions:**
  - 💰 **CASH OUT**: Bank your loot safely!
  - 💣 **PASS LOOT**: Fling the hot bag to another player's phone screen with a +$150 hand-off bonus!
  - 🚨 **SABOTAGE (Spectators)**: If you're not holding the bag, tap rapidly to trip the vault alarm and bust the greedy player!
  - 🧲 **SNATCH**: 40% chance to swipe the loot right before they cash out!
- **Zero Friction:** Anyone can join instantly from any iPhone, Android phone, or laptop by visiting the link and entering a 4-letter room code (e.g. `GOLD`). No account, install, or login needed.

---

## 🚀 Running Locally
```bash
# 1. Install dependencies
npm install

# 2. Start game server
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser. Open multiple browser tabs (or on your local Wi-Fi) to test multiplayer!

---

## 🌐 1-Click Free Public Deployment
To get a public link to submit to Handshake AI:
1. Push this folder to a GitHub repository.
2. Go to [Render.com](https://render.com) (free) -> **New Web Service**.
3. Select your GitHub repository.
4. Set:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Click **Create Web Service**. Your game will be live at `https://greed-vault.onrender.com`!
