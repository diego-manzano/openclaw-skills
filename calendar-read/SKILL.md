---
name: calendar-read
description: Read the user's Google Calendar via the secret iCal URL. Use for "what is on my schedule today/this week", "next meeting", searching upcoming events by keyword. Read-only, no OAuth.
homepage: https://github.com/waldbaer/icalendar-events-cli
metadata:
  {
    "openclaw": {
      "emoji": "📅",
      "requires": { "bins": ["icalendar-events-cli"], "env": ["GCAL_PERSONAL_ICAL"] },
      "primaryEnv": "GCAL_PERSONAL_ICAL"
    }
  }
---

# calendar-read

Read-only calendar access via Google Calendar secret iCal URL stored in `$GCAL_PERSONAL_ICAL`.

## Behavior rules

- Run the CLI, parse the JSON, summarize events in plain language. Do NOT dump raw JSON to the user.
- Order events by start time.
- Display times in **Asia/Manila (PHT)** — that's the user's timezone. If the JSON already has `+08:00` offsets, just reformat to a human-readable clock.
- For vague queries ("what's my day", "am I busy"), default to today 00:00 → 23:59 local.
- For multi-day queries, group output by date.
- If the CLI returns no events for the range, reply clearly: "Nothing on your calendar [date/range]."

## Common queries

### Today
```bash
TODAY=$(date -u +%Y-%m-%d)
icalendar-events-cli --calendar.url "$GCAL_PERSONAL_ICAL" \
  -s "$TODAY" -e "$TODAY" --output.format json
```

### Next N days (week ahead)
```bash
START=$(date -u +%Y-%m-%d)
END=$(date -u -d "+7 days" +%Y-%m-%d)
icalendar-events-cli --calendar.url "$GCAL_PERSONAL_ICAL" \
  -s "$START" -e "$END" --output.format json
```

### Specific date
```bash
icalendar-events-cli --calendar.url "$GCAL_PERSONAL_ICAL" \
  -s "2026-04-25" -e "2026-04-25" --output.format json
```

### Search upcoming events by keyword (summary)
```bash
icalendar-events-cli --calendar.url "$GCAL_PERSONAL_ICAL" \
  -s "$(date -u +%Y-%m-%d)" -e "$(date -u -d "+30 days" +%Y-%m-%d)" \
  -f "keyword" --output.format json
```

## JSON output shape

```json
{
  "filter": { "start-date": "...", "end-date": "..." },
  "events": [
    {
      "start-date": "2026-04-24T14:00:00+08:00",
      "end-date":   "2026-04-24T23:00:00+08:00",
      "summary":    "Event title",
      "location":   "(optional)",
      "description": "(optional)"
    }
  ]
}
```

Fields are **hyphenated** (`start-date`, `end-date`, `summary`) — note this when parsing with `jq`.

## Date arithmetic

- `date -u +%Y-%m-%d` — today (UTC)
- `date -u -d "+N days" +%Y-%m-%d` — offset
- `date -u -d "next monday" +%Y-%m-%d` — weekday alias
- `TZ=Asia/Manila date` — format in local time when displaying to the user

## Constraints

- **Read-only.** Cannot create, edit, or delete events. If asked to modify, say so and suggest Google Calendar directly.
- **Freshness**: Google refreshes the iCal feed approximately every few hours. Very recent changes (within ~1 hr) may not appear.
- **One calendar only**: personal. Work calendar is not wired (user does not need it at this time).
