# Profanity Settings exploration

## 2026-11-24 — Word/Phrase sort

- Environment: `stt1` (`https://converge.stt1.hyperscal.com/`), authenticated account from the configured E2E session.
- Opened **System Settings → Profanity Settings → Manage** and observed 61 rows.
- Selecting **Word/Phrase** sent `POST /api/v1.0/organization/tenant/profanity-words/filter` with `sort: [{ name: "word", dir: "ASC" }]`; the response was HTTP 200 and its first page contained 50 rows in raw, case-sensitive character order. The returned values included uppercase entries before lowercase entries, confirming that lowercasing and removing spaces before comparison does not match the API ordering.
- Toggling the applied sort to descending sent the same endpoint with the descending direction; the response was HTTP 200 and the 50 returned rows were in reverse raw character order.
- The previous E2E assertion lowercased words and removed whitespace, which rejected valid API ordering. The scenario's intent is unchanged; its assertion now compares the returned words as-is.
- Evidence: `playwright-cli` request/response listing for the asc and desc filter calls and the rendered table. No screenshot, trace, or full response artifact was retained.
