# AI Assignment Pipeline — Mechanics of Materials
### Powered by Groq (Free) + Google Apps Script + Google Classroom

> Automatically generate curriculum-aligned assignment problems, post them to Google Classroom, and evaluate student answers — all for free.

---

## What This Does

This pipeline uses AI to help engineering educators create and manage assignments for **Mechanics of Materials** (or any analytical engineering course with a custom curriculum).

| Feature | How |
|---|---|
| Generates numerical, diagram, and conceptual problems | Groq AI (Llama 3.3 70B) |
| Grounds questions in YOUR textbook | You paste NotebookLM summaries |
| Creates a teacher-only solution guide | Groq generates alongside each problem |
| Posts assignments to Google Classroom | Google Apps Script + Classroom API |
| Evaluates student answers (method + final answer) | Groq AI |
| Costs money | **Nothing — fully free** |

---

## The Full Stack (All Free)

```
Your Textbook PDF / YouTube Lectures
            ↓
      NotebookLM          ← reads your custom curriculum
            ↓
    (copy chapter summary)
            ↓
      Google Sheet         ← your control panel
            ↓
    Google Apps Script     ← automation glue
            ↓
       Groq API            ← AI question generator (free, no credit card)
            ↓
   Google Classroom        ← student delivery
            ↓
    Student submits
            ↓
       Groq API            ← evaluates method + answer
            ↓
       Feedback
```

---

## Prerequisites

Before you start, make sure you have:

- A **Google account** with Google Workspace for Education (for Classroom)
- A **Groq account** — sign up free at [console.groq.com](https://console.groq.com) (no credit card)
- A **Google Classroom** course already created
- Your **textbook PDFs or YouTube lecture links** ready to upload to NotebookLM

---

## Setup Guide

### Step 1 — Get Your Groq API Key (2 minutes)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with your Google account — no credit card needed
3. Click **API Keys** in the left sidebar
4. Click **Create API Key**
5. Copy the key — it starts with `gsk_...`
6. Save it somewhere safe (treat it like a password)

**Free tier gives you:** 1,000 requests/day on Llama 3.3 70B — more than enough for a classroom of 50 students.

---

### Step 2 — Set Up NotebookLM (once per chapter)

1. Go to [notebooklm.google.com](https://notebooklm.google.com)
2. Create a new notebook
3. Upload your textbook chapter PDF or paste a YouTube lecture link
4. Ask: *"Summarise this chapter in 400 words covering all key concepts, formulas, and definitions"*
5. Also ask: *"What misconceptions do students commonly have about this topic?"*
6. Copy both outputs — you will paste them into the Google Sheet in Step 5

> **Why NotebookLM?** Groq has never seen your custom curriculum. NotebookLM reads your textbook and produces a clean summary that Groq uses to generate curriculum-specific questions. Without this, Groq generates generic questions unrelated to your syllabus.

---

### Step 3 — Create the Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Delete the default empty function
4. Copy the entire contents of `src/Code.gs` from this repository
5. Paste it into the editor
6. Rename the project to something like `MOM Assignment Pipeline`

---

### Step 4 — Enable the Google Classroom API

1. In the Apps Script editor, click the **+** button next to **Services** (left panel)
2. Scroll to find **Google Classroom API**
3. Click it → Click **Add**

---

### Step 5 — Add Your Credentials (Script Properties)

Your API key and Course ID are stored securely in Script Properties — they are **never in the code** and never go to GitHub.

1. Click the **gear icon** (Project Settings) in the Apps Script editor
2. Scroll down to **Script Properties**
3. Click **Add script property** and add these two:

| Property Name | Value | Where to find it |
|---|---|---|
| `GROQ_API_KEY` | `gsk_xxxxxxxxxxxx` | From Step 1 |
| `COURSE_ID` | `123456789` | From your Classroom URL |

**Finding your COURSE_ID:**
- Open Google Classroom → your course
- Look at the URL: `classroom.google.com/c/XXXXXXXXX`
- The number after `/c/` is your Course ID

4. Click **Save script properties**

---

### Step 6 — Test the Connection

1. In the Apps Script editor, select `testWithSampleContent` from the function dropdown
2. Click **Run**
3. The first time, Google will ask for permissions — click **Review permissions → Allow**
4. Click **View → Logs**
5. You should see a generated problem and solution guide in the logs

If you see `✅ SUCCESS!` — everything is working. If you see an error, check your `GROQ_API_KEY` in Script Properties.

---

### Step 7 — Fill In Your Google Sheet

The script auto-creates a Google Sheet tab called **Problems** when you first run it. Fill it in like this:

| Column | What to put |
|---|---|
| A — Topic | e.g., `Shear Stress in Beams` |
| B — Problem Type | `numerical` / `diagram` / `conceptual` / `mixed` |
| C — Difficulty | `Easy` / `Medium` / `Hard` |
| D — Chapter Content | **Paste your NotebookLM summary here** (min 50 words) |
| E — Status | Leave **blank** (script fills this in) |
| F–J | Leave blank (script fills these in automatically) |

> ⚠️ **Column D is the most important column.** The script will skip any row where Column D is empty or has less than 50 characters. Always paste your NotebookLM summary here.

---

### Step 8 — Generate Drafts

1. Select `generateDrafts` from the function dropdown
2. Click **Run**
3. Open **View → Logs** to watch progress
4. When done, open your Google Sheet:
   - **Column F** = the problem students will see
   - **Column G** = solution guide (highlighted yellow — teacher only, never posted)

---

### Step 9 — Review and Approve

This is the most important step — especially for numerical problems.

1. **Read Column F** (the problem): Are the given values sensible? Units correct? Question clear?
2. **Read Column G** (solution guide): Verify the formula, all working steps, arithmetic, and final answer with units
3. **If you need to edit the problem**: type your corrected version in **Column H** (Teacher Notes) — the script uses Column H instead of Column F when posting
4. **When satisfied**: change **Column E** from `Draft` to `Approved`

> ⚠️ Groq is excellent at generating problems and evaluating reasoning, but **can make arithmetic errors**. Always verify the solution guide numerically yourself before approving.

---

### Step 10 — Post to Classroom

1. Select `postApproved` from the function dropdown
2. Click **Run**
3. Only rows marked `Approved` in Column E are posted
4. Column E turns green and Column I gets the Classroom link
5. Students receive a notification in Google Classroom automatically

---

### Step 11 — Automate (Optional)

To auto-generate drafts every Monday at 7 AM:

1. Select `setupTrigger` from the function dropdown
2. Click **Run** once

After that, `generateDrafts()` runs automatically every week. You still review and run `postApproved()` manually — the teacher review step is always yours.

---

## Evaluating Student Answers

After a student submits, paste their answer into the `evaluateStudentAnswer()` function:

```javascript
evaluateStudentAnswer(
  "Student's submitted answer here...",
  "The solution guide from Column G here...",
  "Shear Stress in Beams"
);
```

Run it and check the Logs. Groq returns:
- Method evaluation (formula, steps, units, sign convention)
- Answer evaluation (correct/wrong, where error occurred)
- Diagram evaluation (if applicable)
- 1–3 specific things to fix
- Score: Method [X/5] | Answer [X/5] | Overall [X/10]

---

## For Other Teachers Using This Repo

If you found this on GitHub and want to use it for your own course:

1. **Fork or download** this repository
2. Follow the Setup Guide above from Step 1
3. **Bring your own:**
   - Groq API key (free, your own account at console.groq.com)
   - Google Classroom Course ID (your own class)
   - NotebookLM content (your own textbook)
4. Nothing from the original teacher's setup is reused — credentials and content are always personal

To adapt for a different engineering course, edit `CONFIG.COURSE_NAME` in `Code.gs` and adjust the prompts in `buildProblemPrompt()`.

---

## Security — What Is Safe to Share on GitHub

| Item | Share on GitHub? |
|---|---|
| `Code.gs` (the script) | ✅ Yes — no secrets in the code |
| `README.md` | ✅ Yes |
| Your Groq API key | ❌ Never — stored in Script Properties only |
| Your Course ID | ❌ Never — stored in Script Properties only |
| NotebookLM content | ❌ Never — stays in your Google Sheet only |

---

## Troubleshooting

**"GROQ_API_KEY not found"**
→ Go to Project Settings → Script Properties → confirm the property is named exactly `GROQ_API_KEY`

**"COURSE_ID not found"**
→ Confirm the property is named exactly `COURSE_ID` and the value is only the number from your Classroom URL

**Row is being skipped**
→ Column D (Chapter Content) is empty or too short. Paste your NotebookLM summary (at least 50 words)

**Permission error when posting to Classroom**
→ Re-run the script and go through the Google permissions dialog again. Make sure you allow Classroom access.

**Groq returns a 429 error**
→ You have hit the rate limit (30 requests/minute). The script already pauses 2.5 seconds between rows. If you have many rows, wait a few minutes and re-run.

**Solution guide is missing / wrong delimiter**
→ Re-run `generateDrafts()` for that row. Set Column E back to blank first so the script reprocesses it.

---

## Free Tier Limits — Will This Work for My Class?

| Groq free limit | Your usage (50 students) |
|---|---|
| 1,000 requests/day | ~55 requests/week |
| 30 requests/minute | ~1 request every 2.5 sec (handled by script) |

You are using roughly **5% of the daily limit**. You have enormous headroom.

---

## License

MIT License — free to use, modify, and share. See `LICENSE` for details.

---

## Contributing

Pull requests welcome. If you adapt this for a different engineering subject (Fluid Mechanics, Thermodynamics, Structural Analysis), please open a PR with your modified prompt templates.
