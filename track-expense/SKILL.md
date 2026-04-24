---
name: track-expense
description: Log a single expense to the Notion expenses database via curl. Use when user shares a receipt image or types an expense. Extract amount, merchant, date, category, description directly. RUN THE CURL IMMEDIATELY. Do not ask for confirmation. Do not write a script file — call the curl inline via the exec tool.
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

Log one expense to Notion. One curl call. That is the entire skill.

## Hard rules

- **Call `exec` with actual bash text**, not JSON structures, not a Python dict.
- **Run the curl inline.** Do NOT write to a `.sh` file then execute it.
- **One curl per expense.** No retries, no verification call, no second write.
- **Do not confirm** before running. Extract from image/text, then fire.

## Step 1 — log the expense

Run this bash literally (substitute the five `<...>` fields from the receipt):

```bash
NOTION_KEY=$(python3 -c "import json,os; print(json.load(open(os.path.expanduser(\"~/.openclaw/openclaw.json\")))[\"skills\"][\"entries\"][\"notion\"][\"apiKey\"])")

curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": { "database_id": "31e78b9e-154e-803b-b738-c21b57163bf5" },
    "properties": {
      "Description": { "title": [{ "text": { "content": "<description>" } }] },
      "Amount": { "number": <amount_number> },
      "Date": { "date": { "start": "<YYYY-MM-DD>" } },
      "Category": { "select": { "name": "<category>" } },
      "Merchant": { "rich_text": [{ "text": { "content": "<merchant>" } }] }
    }
  }'
```

Valid `<category>` values: `food`, `other`, `health and wellness`, `utilities`, `shopping`, `transport`.

## Step 2 — attach receipt image (only if image was sent)

Inbound images land at `/root/.openclaw/media/inbound/`. If the user sent an image, after Step 1 succeeds and you have the returned `page_id`:

```bash
# 2a. create an upload slot
UPLOAD=$(curl -s -X POST "https://api.notion.com/v1/file_uploads" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json")
UPLOAD_URL=$(echo "$UPLOAD" | python3 -c "import json,sys;print(json.load(sys.stdin)[\"upload_url\"])")
UPLOAD_ID=$(echo "$UPLOAD" | python3 -c "import json,sys;print(json.load(sys.stdin)[\"id\"])")

# 2b. send the file (use -F multipart, NOT --data-binary; include Notion-Version)
curl -s -X POST "$UPLOAD_URL" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -F "file=@<local_file_path>;type=image/jpeg"

# 2c. attach to the page
curl -s -X PATCH "https://api.notion.com/v1/pages/<page_id>" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d "{\"properties\": {\"File\": {\"files\": [{\"type\": \"file_upload\", \"name\": \"receipt.jpg\", \"file_upload\": {\"id\": \"$UPLOAD_ID\"}}]}}}"
```

## Step 3 — reply to user

After the curl returns 200, reply briefly with extracted details:
`Logged ₱<amount> at <merchant> (<category>). Does that look right?`

Nothing more. No confirmation loop.
