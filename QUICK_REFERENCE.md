# Quick Reference — Apps Script Functions

## Functions to run (in order)

| Function | When to run | What it does |
|---|---|---|
| `testWithSampleContent()` | First time only | Verifies Groq API key works |
| `generateDrafts()` | After filling Sheet | Generates problems + solution guides |
| `postApproved()` | After your review | Posts approved rows to Classroom |
| `evaluateStudentAnswer()` | After student submits | Scores method + answer, gives feedback |
| `setupTrigger()` | Once, when ready | Automates generateDrafts() every Monday |
| `removeTrigger()` | If you want to stop | Removes the weekly automation |

---

## Sheet Column Reference

| Column | Name | Who fills it |
|---|---|---|
| A | Topic | You |
| B | Problem Type | You — `numerical` / `diagram` / `conceptual` / `mixed` |
| C | Difficulty | You — `Easy` / `Medium` / `Hard` |
| D | Chapter Content | You — paste NotebookLM summary (min 50 words) |
| E | Status | Script — `Draft` → you change to `Approved` → script sets `Posted` |
| F | Generated Problem | Script (Groq) — what students see |
| G | Solution Guide | Script (Groq) — teacher only, NEVER posted |
| H | Teacher Notes | You — edit problem here if needed before posting |
| I | Assignment Link | Script — auto-filled after posting |
| J | Date Posted | Script — auto-filled after posting |

---

## Script Properties Required

| Property | Value | Where to get it |
|---|---|---|
| `GROQ_API_KEY` | `gsk_xxxxxxxxxxxx` | console.groq.com → API Keys |
| `COURSE_ID` | `123456789` | Classroom URL: `.../c/XXXXXXX` |

Set these in: **Project Settings (gear icon) → Script Properties**

---

## Status Flow

```
[blank] → generateDrafts() → Draft → you review → Approved → postApproved() → Posted
```

---

## NotebookLM Prompts to Use

Copy these into NotebookLM for each chapter:

1. *"Summarise this chapter in 400 words covering all key concepts, formulas, and definitions"*
2. *"What misconceptions do students commonly have about this topic?"*

Paste output 1 into Column D. Use output 2 as additional context if needed.
