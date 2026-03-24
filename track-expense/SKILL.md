---
name: track-expense
description: Track expenses to Notion database with receipt uploads. Use vision capability to extract transaction details directly from receipt images. Do not ask for details visible in the image.
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

Log expenses directly to the Notion expenses database using curl. Do NOT ask for confirmation. Read the context, extract the details, and run the curl command immediately.

## Behavior
Receipt image sent → use image analysis to extract amount, merchant, date, description directly → log immediately, no confirmation
After logging, show extracted details and ask: 'Does this look right? Reply to correct any details.'
If image is not a receipt, respond briefly with what you can see and ask if they want to log manually.

## Database ID
`31e78b9e-154e-803b-b738-c21b57163bf5`

## Step 1 — Create the expense entry
```bash
NOTION_KEY=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('~/.openclaw/openclaw.json')))['skills']['entries']['notion']['apiKey'])")

curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": { "database_id": "31e78b9e-154e-803b-b738-c21b57163bf5" },
    "properties": {
      "Description": { "title": [{ "text": { "content": "<description>" } }] },
      "Amount": { "number": <amount> },
      "Date": { "date": { "start": "<YYYY-MM-DD>" } },
      "Category": { "select": { "name": "<category>" } },
      "Merchant": { "rich_text": [{ "text": { "content": "<merchant>" } }] }
    }
  }'
```

## Step 2 — Attach receipt image (if provided)
```bash
# Upload file to Notion
UPLOAD=$(curl -s -X POST "https://api.notion.com/v1/file_uploads" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json")

UPLOAD_URL=$(echo $UPLOAD | python3 -c "import sys,json; print(json.load(sys.stdin)['upload_url'])")
UPLOAD_ID=$(echo $UPLOAD | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# Send the file
curl -s -X POST "$UPLOAD_URL" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -F "file=@<local_file_path>"

# Attach to the page
curl -s -X PATCH "https://api.notion.com/v1/pages/<page_id>" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d "{\"properties\": {\"file\": {\"files\": [{\"type\": \"file_upload\", \"file_upload\": {\"id\": \"$UPLOAD_ID\"}}]}}}"
```

## Categories
`food`, `other`, `health and wellness`, `utilities`, `shopping`, `transport`

## Rules
- Run curl immediately, no confirmation
- Read receipt image to extract amount, merchant, category
- If splitting, calculate share first
- Multiple expenses = run curl multiple times
- File path for inbound images: `/root/.openclaw/media/inbound/`

## Error handling & verification

Wrap the curl workflow so failures are obvious and we always confirm the page exists:

```bash
set -euo pipefail
NOTION_KEY=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser('~/.openclaw/openclaw.json')))['skills']['entries']['notion']['apiKey'])")

payload='{
  "parent": {"database_id": "31e78b9e-154e-803b-b738-c21b57163bf5"},
  "properties": { ... }
}'

create_resp=$(curl -sfS -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d "$payload")

page_id=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"$create_resp")
[ -n "$page_id" ] || { echo "Failed to create expense" >&2; exit 1; }

# optional: confirm it landed
curl -sfS -X POST "https://api.notion.com/v1/databases/31e78b9e-154e-803b-b738-c21b57163bf5/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"filter":{"property":"id","equals":"'$page_id'"}}' > /dev/null
```

Tips:
- Use `-sfS` on curl so non-200 responses stop the script.
- Capture stdout/stderr to a log (`tee logs/track-expense-$(date +%s).json`) when you need an audit trail.
- If any file upload step fails, exit immediately so we don’t claim the receipt was logged when it wasn’t.
```
