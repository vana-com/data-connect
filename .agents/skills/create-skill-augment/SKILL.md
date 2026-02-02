---
name: create-skill-augment
description: Ensure skills are created in `.agents/skills` and `.cursor/skills` is a symlink to that directory. Use when the user asks to create/update a skill, mentions skills location, or asks about the `.agents`/`.cursor/skills` symlink.
---

# Create Skill Augmentation (Agents + Symlink)

## Required reference

- Read `~/.cursor/skills-cursor/create-skill/SKILL.md` and follow its structure.

## Storage rule

- Always create new skills under `.agents/skills/<skill-name>/SKILL.md`.
- Do not create skills in `.cursor/skills` directly.

## Symlink rule

- Ensure `.cursor/skills` is a symlink to `.agents/skills`.
- If `.cursor/skills` exists and is not a symlink, move it aside before linking.
- If `.cursor/skills` is a symlink to the wrong location, replace it.

Use:

```
if [ -e ".cursor/skills" ] && [ ! -L ".cursor/skills" ]; then
  mv ".cursor/skills" ".cursor/skills.bak"
fi
if [ -L ".cursor/skills" ] && [ "$(readlink ".cursor/skills")" != "../.agents/skills" ]; then
  rm ".cursor/skills"
fi
if [ ! -L ".cursor/skills" ]; then
  ln -s "../.agents/skills" ".cursor/skills"
fi
```

## Output

- Report the created skill path and confirm the symlink status.
