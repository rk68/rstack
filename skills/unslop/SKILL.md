---
name: unslop
description: Edit existing prose to strip AI tells. Use when text reads as AI-generated, or the user says "unslop", "de-slop", "remove the AI voice", "make this sound human", or asks you to clean up a draft, README, PR body or release note. An editing pass over text that already exists.
---

# Unslop

Edit text to remove AI patterns. Preserve meaning. Match the intended tone.

## Process

1. Scan for the patterns below.
2. Rewrite.
3. Self-audit: ask "what makes this obviously AI generated?" Fix what is left.

## Relationship to the always-on rules

A compact version of this checklist lives in this suite's `GLOBAL.md`, under "Writing
rules" (the "No AI tells" list). If you installed those rules with `install.mjs --rules`,
that copy runs on every response without loading anything. It is the fast lexical pass:
blocklists and formatting.

This file is the deep pass. Load it when you edit a document rather than a reply, and you
want the reasoning and the examples behind each rule, not only the word list.

The `GLOBAL.md` writing rules also cover active voice, one idea per sentence, short
sentences, no nominalization, no hype adjectives and no persona. Those are not repeated here.

## Vocabulary

1. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner,
   interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract),
   testament, underscore, vibrant. Replace with plain words.
2. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Say "is" or "has".
3. **Prefer the plain word.** "utilize" becomes "use". "leverage" becomes "use".
   "facilitate" becomes "help". "numerous" becomes "many". "in the event that" becomes "if".
4. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, vantage, nexus,
   primitive (as a noun), harness (as a metaphor), surface (as in "API surface"), bedrock,
   scaffolding (as a metaphor), modality, paradigm, gold-plating, ratchet, evacuate (for
   moving code), endgame, north star, flywheel. Pick the concrete word. "Substrate" becomes
   "base". "Vector" becomes "way". "Gold-plating" becomes "more than the job needs".

## Sentence shape

5. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...",
   "showcasing...", "fostering...". Delete, or expand with a real source.
6. **"Not just X, but Y."** State the point directly.
7. **Rule of three.** Do not force ideas into groups of three. Use the natural number.
8. **Synonym cycling.** Do not rotate through synonyms for the same thing. Pick one word, repeat it.
9. **False ranges.** "from X to Y" where X and Y are not on a real scale. List the items.
10. **Mannered prose.** No aphorisms, rhetorical fragments, personified code, or figurative
    verbs ("rides along", "stands on"). Say what you mean.
11. **Over-compression.** Restore dropped articles and verbs. Spell out arrows and
    abbreviations. "Parser rejects bad date -> exit 2, no write" becomes "The parser rejects
    a bad date, exits with code 2, and writes nothing."

## Claims

12. **Vague attributions.** "Experts believe", "Industry reports suggest", "Some critics
    argue". Name the source or delete the sentence.
13. **Say what it does, not how it feels.** "the database stays close at hand", "SQL you can
    read" name a feeling. Name the mechanism or the number instead: "`.toSQL()` returns the
    exact string sent to the database", "a column rename fails the build". If a sentence
    could appear unchanged in another project's docs, it says nothing about this one. Cut it.
14. **Generic conclusions.** "The future looks bright." State a specific plan or fact.

## Formatting

15. **Colon overuse.** Colons are fine before a list or example. Not as mid-sentence connectors.
16. **Boldface overuse.** Do not bold every proper noun or acronym.
17. **Inline-header lists.** The tell is a bold label and colon that restates the line:
    "**Performance:** Performance improved...". Convert those to prose. A bold lead-in that
    ends in a period, names the item, and is followed by new detail is fine.
18. **Title case headings.** Use sentence case.
19. **Decorative emojis.** Remove from headings and bullets.
20. **Curly quotes.** Replace with straight quotes.
21. **Em dashes.** Replace each em dash with a period, a comma or parentheses.

<!--
Vendored from https://github.com/cursor/plugins/tree/main/pstack/skills/unslop (MIT License,
Copyright (c) 2026 Lauren Tan). Deduplicated against the GLOBAL.md writing rules.
Rules covered by those are dropped, so the numbering does not match upstream.
The upstream `disable-model-invocation: true` is removed: it depends on a pstack always-on
loader that is not installed here, and would stop this skill firing at all.
-->
