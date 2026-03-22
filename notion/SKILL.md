---
name: notion
description: Notion API for creating and managing pages, databases, blocks, and file uploads (receipts, images).
homepage: https://developers.notion.com
metadata:
  {
    "openclaw":
      { "emoji": "📝", "requires": { "config": ["skills.entries.notion.apiKey"] }, "primaryEnv": "NOTION_API_KEY" },
  }
---

# notion

Use the Notion API to create/read/update pages, data sources (databases), blocks, and upload files.

## Setup

1. Create an integration at https://notion.so/my-integrations
2. Copy the API key (starts with `ntn_`)
3. Store it in OpenClaw config (single source of truth):
```bash
openclaw config set skills.entries.notion.apiKey "ntn_your_key_here"
```

4. Share target pages/databases with your integration (click "..." → "Connections" → your integration name)

> **NEVER** store the key in flat files like `~/.config/notion/api_key`.
> **NEVER** hardcode the key in scripts.
> Always read from openclaw.json via: `json.load(open("~/.openclaw/openclaw.json"))["skills"]["entries"]["notion"]["apiKey"]`

## Reading the Key in Scripts
```python
import json, os

def get_notion_key():
    try:
        with open(os.path.expanduser("~/.openclaw/openclaw.json")) as f:
            return json.load(f)["skills"]["entries"]["notion"]["apiKey"]
    except:
        return os.environ.get("NOTION_API_KEY", "")

NOTION_KEY = get_notion_key()
```

## API Basics

All requests need:
```bash
NOTION_KEY=$(python3 -c "import json; print(json.load(open('$HOME/.openclaw/openclaw.json'))['skills']['entries']['notion']['apiKey'])")
curl -X GET "https://api.notion.com/v1/..." \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json"
```

> **Note:** The `Notion-Version` header is required. This skill uses `2025-09-03`. In this version, databases are called "data sources" in the API.

## Common Operations

**Search for pages and data sources:**
```bash
curl -X POST "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"query": "page title"}'
```

**Get page:**
```bash
curl "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03"
```

**Get page content (blocks):**
```bash
curl "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03"
```

**Create page in a data source:**
```bash
curl -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "parent": {"database_id": "xxx"},
    "properties": {
      "Name": {"title": [{"text": {"content": "New Item"}}]},
      "Status": {"select": {"name": "Todo"}}
    }
  }'
```

**Query a data source (database):**
```bash
curl -X POST "https://api.notion.com/v1/data_sources/{data_source_id}/query" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {"property": "Status", "select": {"equals": "Active"}},
    "sorts": [{"property": "Date", "direction": "descending"}]
  }'
```

**Update page properties:**
```bash
curl -X PATCH "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{"properties": {"Status": {"select": {"name": "Done"}}}}'
```

**Add blocks to page:**
```bash
curl -X PATCH "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [
      {"object": "block", "type": "paragraph", "paragraph": {"rich_text": [{"text": {"content": "Hello"}}]}}
    ]
  }'
```

## File Uploads (Receipts, Images)

### Upload a local file (up to 20MB)

**Step 1 — Create upload slot:**
```bash
curl -X POST "https://api.notion.com/v1/file_uploads" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json"
```

Returns `upload_url` and `id`.

**Step 2 — Send the file:**
```bash
curl -X POST "{upload_url}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -F "file=@/path/to/receipt.jpg"
```

**Step 3 — Attach to a page property or block (must be within 1 hour):**
```bash
# As a Files & media property on a page:
curl -X PATCH "https://api.notion.com/v1/pages/{page_id}" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "properties": {
      "Receipt": {
        "files": [{"type": "file_upload", "file_upload": {"id": "FILE_UPLOAD_ID"}}]
      }
    }
  }'

# Or as an image block in page content:
curl -X PATCH "https://api.notion.com/v1/blocks/{page_id}/children" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "children": [{
      "type": "image",
      "image": {"type": "file_upload", "file_upload": {"id": "FILE_UPLOAD_ID"}}
    }]
  }'
```

### Import from external URL
```bash
curl -X POST "https://api.notion.com/v1/file_uploads" \
  -H "Authorization: Bearer $NOTION_KEY" \
  -H "Notion-Version: 2025-09-03" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "external_url",
    "external_url": "https://example.com/receipt.jpg",
    "filename": "receipt.jpg"
  }'
```

URL must be HTTPS, publicly accessible, and expose Content-Type header. Poll the file upload status until `"status": "uploaded"`, then attach using Step 3 above.

### External file reference (no upload, link only)
```bash
"Receipt": {
  "files": [{"type": "external", "name": "receipt.jpg", "external": {"url": "https://example.com/receipt.jpg"}}]
}
```

## Property Types

Common property formats for database items:

- **Title:** `{"title": [{"text": {"content": "..."}}]}`
- **Rich text:** `{"rich_text": [{"text": {"content": "..."}}]}`
- **Select:** `{"select": {"name": "Option"}}`
- **Multi-select:** `{"multi_select": [{"name": "A"}, {"name": "B"}]}`
- **Date:** `{"date": {"start": "2024-01-15", "end": "2024-01-16"}}`
- **Checkbox:** `{"checkbox": true}`
- **Number:** `{"number": 42}`
- **URL:** `{"url": "https://..."}`
- **Email:** `{"email": "a@b.com"}`
- **Files & media:** `{"files": [{"type": "file_upload", "file_upload": {"id": "..."}}]}`
- **Relation:** `{"relation": [{"id": "page_id"}]}`

## Key Differences in 2025-09-03

- **Databases → Data Sources:** Use `/data_sources/` endpoints for queries and retrieval
- **Two IDs:** Each database now has both a `database_id` and a `data_source_id`
  - Use `database_id` when creating pages (`parent: {"database_id": "..."}`)
  - Use `data_source_id` when querying (`POST /v1/data_sources/{id}/query`)
- **Search results:** Databases return as `"object": "data_source"` with their `data_source_id`

## Notes

- Page/database IDs are UUIDs (with or without dashes)
- Rate limit: ~3 requests/second average, with `429 rate_limited` and `Retry-After` header
- Append block children: up to 100 children per request, two levels of nesting
- Payload size limits: up to 1000 block elements and 500KB overall
- File uploads expire in 1 hour if not attached
- Supported file types: images (JPG, PNG, GIF), documents (PDF, DOCX), audio, video
- Free plan: 5MB per file limit. Paid plans: higher caps
