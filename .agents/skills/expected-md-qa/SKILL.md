---
name: expected-md-qa
description: Generate a short expected.md listing what to test in a frontend UI. Use when the user asks for expected.md, QA checklist, or frontend testing instructions.
---

# expected.md QA generator

## Quick use

Produce a short `expected.md` with the minimum set of things to test. Keep it tight and practical.

## Output rules

- Use the template below verbatim.
- Keep it under ~20 bullets unless the user asks for more.
- Focus on observable UI behavior.
- If details are missing, make a reasonable assumption and flag it in Notes.

## Template

```markdown
# expected.md

## What to test

- <Test item 1> — Expect: <observable result>
- <Test item 2> — Expect: <observable result>
- <Test item 3> — Expect: <observable result>

## Hand-off steps (copy/paste to QA agent)

2. Copy this expected.md into your clipboard.
3. Open the browser and load localhost with your selected app.
4. Use Claude Chrome Extension or Parchi.
5. Send the expected.md prompt to the QA agent.
6. Review the model’s results and pass flagged issues back to your coding agent.

## Notes

- <Assumptions or setup details>
```

## Example triggers

- "Create expected.md for this UI"
- "Write QA checklist for frontend"
- "Use Claude Chrome Extension/Parchi to test this"

## Reference

- https://x.com/0xsero/status/2018101731591176325?s=12
