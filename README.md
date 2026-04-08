# Roblox Moderation Discord Bot

If you like this project please consider giving it a ⭐

If you need help, have questions, or want a custom Discord bot made, contact me on Discord: **wmnds**

---

# Overview

Roblox Moderation Discord Bot is a moderation tool that allows you to **ban, temporarily ban, unban, and check ban status of players in your Roblox experience directly from Discord**.

The bot uses the official **Roblox Open Cloud User Restrictions API** to safely manage player restrictions.

---

# Features

* Temporary player bans
* Permanent player bans
* Unban system
* Ban status checking
* Optional role-based permissions
* Slash command support
* Simple configuration

---

# Requirements

* Node.js 18+
* Discord Bot Token
* Roblox Open Cloud API Key
* Roblox Universe ID

---

# Setup Guide

## 1. Create a Roblox API Key

Go to:

https://create.roblox.com/dashboard/credentials

Steps:

1. Click **Create API Key**
2. Enter any name
3. Under **Access Permissions** select:

   * **User Restrictions**
4. Under **Select Operations to Add**:

   * Enable **Read**
   * Enable **Write**
5. Click **Save & Generate Key**
6. Copy your generated API key

Add it to your `.env` file:

```
robloxKey=API_KEY_GIVEN
```

---

## 2. Get your Universe ID

Go to:

https://create.roblox.com/dashboard/creations

Steps:

1. Select the game you want the moderation system to work in
2. Click the **three dots** next to the game name
3. Click **Copy Universe ID**
4. Open your `.env` file
5. Paste:

```
universeId=UNIVERSE_ID
```

---

## 3. Discord Configuration

Add your Discord bot token:

```
token=BOT TOKEN HERE
```

(Optional) Add a role restriction:

```
roleId=ROLE ID FOR ACCESS
```

---

# Configuration Example

Example `.env` file:

```
token=YOUR_DISCORD_BOT_TOKEN
robloxKey=YOUR_ROBLOX_API_KEY
universeId=YOUR_UNIVERSE_ID
roleId=ROLE_ID_OPTIONAL
```

---

# Permissions

The bot supports optional role restriction:

* If `roleId` is configured → only users with that role can use commands
* If `roleId` is empty → anyone can use commands

---

# Installation

Open a terminal inside the project folder and run:

```
npm i
```

This installs all required dependencies.

---

# Running the Bot

After installing packages and configuring `.env`:

```
node .
```

---

# Commands

## Temporary Ban

Temporarily ban a player.

```
/tempban user:<username or userid> duration:<time> reason:<reason>
```

Example:

```
/tempban user:Roblox duration:7d reason:Exploiting
```

---

## Permanent Ban

Permanently ban a player.

```
/permban user:<username or userid> reason:<reason>
```

Example:

```
/permban user:Roblox reason:Flying
```

---

## Unban

Remove a ban from a player.

```
/unban user:<username or userid>
```

Example:

```
/unban user:Roblox
```

---

## Check Ban Status

Check if a player is banned.

```
/check user:<username or userid>
```

Example:

```
/check user:Roblox
```

---

# Duration Format

Supported formats:

```
30m = 30 minutes
2h = 2 hours
7d = 7 days
```

---

# Security Notice

Never share:

* Roblox API Key
* Discord Bot Token
* Environment file

---

# Troubleshooting

If the bot does not start:

Check:

* `.env` is configured correctly
* Dependencies installed (`npm i`)
* Bot token is valid
* Bot invited to your server
* Bot has application command permissions

---

# License

MIT License

---

# Disclaimer

This project is not affiliated with Roblox Corporation.

Use responsibly.
