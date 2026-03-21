---
name: track-expense
description: Track expenses to Notion database with receipt uploads
homepage: https://github.com/openclaw/openclaw
metadata:
  {
    "openclaw": {
      "emoji": "💰",
      "requires": { "env": ["NOTION_API_KEY"] },
      "primaryEnv": "NOTION_API_KEY"
    }
  }
---

# track-expense

Track expenses to your Notion expenses database.

## Setup

1. Set `NOTION_API_KEY` environment variable
2. Use `/track-expense` command

## Usage

```
/track-expense [amount] [description] [category] [merchant]
```

**Categories:** food, other, health and wellness, utilities, shopping, transport

**Description:** Can be provided in text or via image caption

**Examples:**
```
/track-expense 775.57 Shawarma with mom food GCash
/track-expense 289.00 Angkas ride transport
/track-expense 150.00 ZYN NC COOLB6MG shopping
```

## Features

- ✅ Automatic date (today)
- ✅ File upload support for receipts
- ✅ Description from text or image caption
- ✅ All 6 categories supported
- ✅ Notion database integration
