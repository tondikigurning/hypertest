# Inspecting Element Attributes

In Q-Rex, use a current snapshot and `generate-locator <ref>` through the managed browser tool. DOM `eval` and arbitrary JavaScript are unavailable. If the specific attribute cannot be verified, use another verified locator or record the gap; do not guess it. See [host capabilities](../../write-e2e-scenarios/references/playwright-cli-exploration.md).

In a terminal host with the command supported, `eval` may inspect a known element's attributes. Use the task's named session (`-s=qa-task`) consistently; inspect only the needed attributes and avoid exposing tokens or personal data.

## Examples

```bash
playwright-cli snapshot
# snapshot shows a button as e7 but doesn't reveal its id or data attributes

# get the element's id
playwright-cli eval "el => el.id" e7

# get all CSS classes
playwright-cli eval "el => el.className" e7

# get a specific attribute
playwright-cli eval "el => el.getAttribute('data-testid')" e7
playwright-cli eval "el => el.getAttribute('aria-label')" e7

# get a computed style property
playwright-cli eval "el => getComputedStyle(el).display" e7
```
