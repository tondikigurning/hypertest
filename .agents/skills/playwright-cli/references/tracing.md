# Tracing

Tracing captures browser activity and may contain sensitive DOM, screenshots, network traffic and credentials. Use an owned browser session, keep evidence in an appropriate location and avoid exposing its contents.

```bash
playwright-cli -s=qa-task open <url>
playwright-cli -s=qa-task tracing-start
# Reproduce the relevant interaction.
playwright-cli -s=qa-task tracing-stop
playwright-cli -s=qa-task close
```

Read the output path returned by the installed CLI and use the matching local trace viewer if needed; do not assume a file layout or format. Start tracing before the relevant action. Preserve requested evidence and remove only artifacts created by this task when cleanup is appropriate. Do not recursively delete shared trace directories.
