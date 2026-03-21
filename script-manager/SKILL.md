# Script Manager Skill

## Purpose
Create, edit, and manage Python scripts in the OpenClaw workspace at `/root/.openclaw/workspace/`. Use this skill when the user asks to create, fix, update, or run scripts.

## Environment

Scripts run as the `root` user on a headless Ubuntu 24.04 LXC container (Proxmox). The following env vars are available at runtime via systemd and OpenClaw skill config:

- `NOTION_API_KEY` — Notion integration token
- `GOG_ACCOUNT` — Google account email (16manzanodiego@gmail.com)
- `GOG_KEYRING_PASSWORD` — gogcli keyring password for Google auth
- `TODOIST_API_TOKEN` — Todoist API token
- `TELEGRAM_BOT_TOKEN` — Telegram bot token (fallback, usually hardcoded)

## Available Tools

- `python3` — Python 3.12
- `gog` — gogcli for Google Calendar, Gmail, Drive (`gog calendar events`, `gog gmail search`, etc.)
- `todoist` — Todoist CLI (`todoist tasks`)
- `curl` — for Notion API calls
- `requests` — Python library, installed

## Telegram Delivery

All scripts that send output to the user MUST send via Telegram Bot API directly. Never use a webhook server or intermediate delivery mechanism.

```python
import requests

def send_to_telegram(message):
    bot_token = "8651816494:AAF94nqRpcE_4m_uPxjmYn8BJM-CbeCuctc"
    chat_id = "859154003"
    try:
        requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": message}
        )
    except Exception as e:
        import sys
        print(f"Error sending to Telegram: {e}", file=sys.stderr)
```

## Critical Rules

### Never put sys.exit() before the Telegram send
This is a common mistake. Always send to Telegram BEFORE exiting.

BAD:
```python
print(message)
sys.exit(0)
# Telegram send never reached
requests.post(...)
```

GOOD:
```python
print(message)
send_to_telegram(message)
sys.exit(0)
```

### Always read env vars from os.environ
Never hardcode empty strings for env vars. Always use `os.environ.get()` with a fallback.

BAD:
```python
env['GOG_KEYRING_PASSWORD'] = ''
```

GOOD:
```python
env['GOG_KEYRING_PASSWORD'] = os.environ.get('GOG_KEYRING_PASSWORD', '')
```

### Always use .get() for dict access on habit/task objects
Notion API responses can have varying structures. Always use `.get()` to avoid KeyError.

BAD:
```python
props = habit['properties']
```

GOOD:
```python
props = habit.get('properties', {})
```

### gog calendar command format
```bash
gog calendar events primary --from 2026-03-22T00:00:00 --to 2026-03-22T23:59:59
```

Output format: `ID START END SUMMARY` — skip the first header line when parsing.

### Notion API calls
Use curl via subprocess. Always include these headers:
```
Authorization: Bearer {NOTION_API_KEY}
Content-Type: application/json
Notion-Version: 2022-06-28
```

Habits DB ID: `30a78b9e154e80dc9eb8db0379360547`
Expenses DB ID: `31e78b9e-154e-8049-892f-d1e49afbc961`

Filter by a date property, NOT by `Created at` — that only returns habits created today not habits for today.

### Todoist CLI output
The `todoist tasks` command output format may vary. Always test with:
```bash
todoist tasks
```
And parse accordingly. Do not assume a fixed column format.

## Cron Schedule Format

When setting up cron jobs for these scripts, use explicit cron expressions with Manila timezone — never use `--every 1d` which fires at a random time.

```bash
openclaw cron add \
  --name "Morning Digest" \
  --cron "30 9 * * *" \
  --tz "Asia/Manila" \
  --session main \
  --system-event "python3 /root/.openclaw/workspace/morning-digest.py"
```

## Script Locations

- Morning digest: `/root/.openclaw/workspace/morning-digest.py`
- AI news fetcher: `/root/.openclaw/workspace/ai-news-fetcher.py`
- Any new scripts: `/root/.openclaw/workspace/`

## Testing Scripts

Always test by running directly with env vars set:
```bash
export NOTION_API_KEY="..."
export GOG_KEYRING_PASSWORD="..."
export GOG_ACCOUNT="16manzanodiego@gmail.com"
python3 /root/.openclaw/workspace/script-name.py
```

A successful test means: script runs without errors AND a Telegram message is received.
