# 💎 DjonStNix Discord Bot & Queue System

A super-simple, automated Discord Bot that handles your entire FiveM Server Queue and Whitelist checking.
Now featuring **Dual-Framework Auto-Detection (ESX Legacy & QBCore)** and a Premium Adaptive Queue UI!

---

## 🛡️ The 3-Step Security Firewall

When a player clicks "Connect" on your FiveM server, the system immediately audits them:

1. **The Desktop Check:** Are their FiveM and Discord apps properly linked? _(If not, instant kick)._
2. **The Guild Check:** Are they physically inside your Discord server? _(If not, they are dropped and given your invite link)._
3. **The Role Check:** Do they have the actual `Whitelisted` role? _(If not, they are blocked and told to verify)._

If they pass the firewall, they enter the ultra-fast Node.js Priority Queue!

---

## 🛠️ How to Set it Up (Step-by-Step)

### Step 1: The Core Secrets (Discord Bot)

Open the **`.env`** file. You literally only need three lines to connect the bot to your server:

```env
DISCORD_TOKEN=YOUR_BOT_SECRET_TOKEN
CLIENT_ID=YOUR_BOT_CLIENT_ID
GUILD_ID=YOUR_SERVER_ID_HERE
```

_(Leave the `ADMIN_ROLES` filled out so your staff can use the Discord slash commands 24/7)._

### Step 2: Configure the Game (config.lua)

All the actual game settings, priorities, and visuals are stored cleanly in your **`config.lua`**!
If you want to edit your server name, queue colors, Discord invite link, or update what priority points different VIPs get, do it directly inside `config.lua`. It natively hot-syncs with the bot.

### Step 3: Turn on the Brain

Double-click the **`run.bat`** file.
_Note: If you don't have Node.js installed on your server, `run.bat` will automatically download the official installer for you!_
A black window will pop up saying the bot is online.
⚠️ **IMPORTANT:** Leave this black window open! If you close it, the bot falls asleep and the queue stops working.

### Step 4: Start the Server (Plug and Play)

Start your FiveM server like normal in `server.cfg` (`ensure DjonStNix-DiscordBot`).
The internal bridge will automatically detect if you are running **ESX** or **QBCore** and adapt its SQL logic immediately to prevent data corruption.

---

## 🎨 Professional Queue UI

If you need to instantly preview the massive UI overhaul we built for your queue (the digital Monospace numbers and transparent dashboard styling), you don't even need to open FiveM!
Simply double-click the **`preview.html`** file in the bot folder to open a native preview directly in your web browser.

---

## 🎮 Discord Slash Commands

### 🧍 For Players

- `/verify` — Gives the player the "Verified" role so the bouncer will let them into the city.
- `/link` — Gives the player a code. They type `/linkdiscord [code]` inside FiveM to connect their bank accounts to Discord!
- `/balance` — Check their in-game cash securely from Discord.
- `/suggest` — Post a server suggestion for people to vote on.

### 👮 For Staff

- `/whitelist @user` — Manually forces the Verified role onto someone.
- `/promote @user` — Promotes a user's job tier in the game server via Discord.
- `/kick` or `/ban` — Kicks/Bans players out of the FiveM server natively via Discord bot without needing to log in.
- `/queueskip @user` — Instantly bypasses the queue and forces the target to Position #1 in line.

---

## 🚨 Frequently Asked Questions

**Q: I restarted my FiveM Server. Do I need to restart the Bot?**
**A:** No! The bot is completely separate. Even if your FiveM server crashes, the bot remembers exactly who was waiting in the queue! Just let them smoothly reconnect.

**Q: A player's game crashed! Do they have to wait in the long line again?**
**A:** No! The Brain remembers them. If they reconnect within 2 minutes of crashing, they skip the entire line and get right back in.

**Q: Someone bought a Premium tier on Tebex, do I have to manually edit the Queue?**
**A:** No! It is 100% automatic. The moment Discord automatically issues them the Premium Role, the Bot natively sees it and mathematically boosts their priority spot in line.
