---
name: herdr-md
description: Show a Markdown file to the user in Herdr's rendered viewer pane, highlight and annotate parts of it, and read back what the user pinned in it. Use when the session runs inside Herdr (`HC_TERMINAL_ID` is set) and you walk the user through a .md file (plan, spec, README, design doc, Mermaid diagram), answer "where does it say X", or the user says "this" or "what I selected" about a document. Not for code files.
---

# Herdr Markdown viewer

The Herdr mod `herdr-md` renders Markdown, Mermaid diagrams and math in a pane beside the terminals. You drive it with the `mdh` command. `mdh --help` prints every command and option.

## Walk the user through a document

1. Open the file if the user does not already see it: `mdh open FILE` (to the right of the focused pane, or `--down` for below). Give FILE as an absolute path. The viewer and `mdh` key highlights by that path.
2. Point at each part you talk about: `mdh hl FILE --lines 40-52 --note "one or two sentences"`. Use `--text "an exact phrase"` in place of `--lines` when the file may change while you talk, because a phrase still matches after lines move.
3. For several points, run the first `hl` without `--add` and the rest with `--add`. They are numbered 1, 2, 3, and the user steps through them with `n` and `N`. `mdh focus FILE N` scrolls to point N.
4. Run `mdh clear FILE` when the walk-through is over.

The step is done when each point you discuss has a highlight the user can see, and your reply names each one by its number.

## Read what the user pinned

The user selects blocks in the viewer with `V`, then pins them with `p`. When the user says "this", "what I selected" or "the part I marked" about a document, run `mdh sel` before you answer. It prints the file, the lines and the text of the last pin.

## Details

- A highlight snaps to whole blocks: a paragraph, heading, list item, table row or code block.
- Notes are Markdown. Colors: yellow (default), green, red, blue, purple, cyan. Use one color per meaning, for example red for a problem and green for a fix.
- A viewer that already shows the file updates live when you highlight or when the file changes.
- To show a system diagram, write it as a fenced `mermaid` block in a `.md` file and open the file. The first diagram after an install can take a few seconds while the renderer starts Chrome.
- The viewer reads files on this computer only. Its state lives in `~/.cache/herdr-md/`.

<!--
Adapted from https://github.com/ryanthedev/herdr-md (MIT), skills/md-viewer/SKILL.md, 2026-11-16.
Changes: renamed to herdr-md for the herdr-suite group, steps with a completion criterion, pointer to `mdh --help` instead of a copy of the command list, Mermaid note.
-->
