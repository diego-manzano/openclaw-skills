---
name: calendar-read
description: Query Google Calendar (or any iCalendar feed) read-only via a secret iCal URL. Use for "what is on my schedule today/this week", "next meeting", search upcoming events by keyword. No OAuth — uses Google Calendar secret iCal URL stored in env.
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

Read-only access to the user's Google calendar(s) via secret iCal URLs. No OAuth, no write.

## Calendars available

The user has two calendars, each with its own secret iCal URL stored in env vars:

- `$GCAL_PERSONAL_ICAL` — personal calendar
- `$GCAL_WORK_ICAL` — work calendar

**Default behavior**: query BOTH unless the user specifies one. For "meetings", "what do I have", etc., run the CLI twice (once per URL) and merge results before replying.

## Behavior

- Run the CLI, parse JSON, summarize events in plain language. Do not dump raw JSON to the user.
- Return events ordered by start time.
- Show: summary, start time (in PHT/Asia/Manila by default), duration, location (if any).
- If the user asks something vague ("what's my day look like"), default to today 00:00 → 23:59 local time.
- For week/multi-day queries, group by date.

## Common queries

### Today's events
```bash
TODAY=$(date -u +%Y-%m-%d)
icalendar-events-cli --calendar.url "$GCAL_PERSONAL_ICAL" \
  -s "$TODAY" -e "$TODAY" --output.format json
```

### Next 7 days
```bash
START=$(date -u +%Y-%m-%d)
END=$(date -u -d "+7 days" +%Y-%m-%d)
icalendar-events-cli --calendar.url "$GCAL_PERSONAL_ICAL" \
  -s "$START" -e "$END" --output.format json
```

### Specific date (single day)
```bash
icalendar-events-cli --calendar.url "$GCAL_WORK_ICAL" \
  -s "2026-04-25" -e "2026-04-25" --output.format json
```

### Search by summary (keyword in title)
```bash
icalendar-events-cli --calendar.url "$GCAL_PERSONAL_ICAL" \
  -s "$(date -u +%Y-%m-%d)" -e "$(date -u -d "+30 days" +%Y-%m-%d)" \
  -f "standup" --output.format json
```

### Merge both calendars (work + personal)
```bash
(icalendar-events-cli --calendar.url "$GCAL_PERSONAL_ICAL" -s "$START" -e "$END" --output.format json
 icalendar-events-cli --calendar.url "$GCAL_WORK_ICAL"     -s "$START" -e "$END" --output.format json) \
| jq -s 'add | sort_by(.start)'
```

## Date arithmetic tips

Use GNU `date` for offsets: `date -u -d "+1 day" +%Y-%m-%d`, `date -u -d "next monday" +%Y-%m-%d`.
For timezone-aware formatting: `TZ=Asia/Manila date`.

## JSON output shape

Each event:
```json
{
  "summary": "Meeting title",
  "start": "2026-04-25T09:00:00+08:00",
  "end":   "2026-04-25T10:00:00+08:00",
  "location": "Conference room / Zoom link / ...",
  "description": "..."
}
```

## Constraints

- **Read-only.** Cannot create, edit, or delete events via this skill. If asked to modify, tell the user it's outside scope.
- **iCal feed refresh**: Google refreshes the public iCal feed approximately every few hours. Very recent event changes may not appear immediately.
- **Reset URL on leak**: the URL is essentially a password. If ever leaked, the user can regenerate in Google Calendar settings.
