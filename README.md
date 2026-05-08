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
    Google Apps Script     ← automation glue (lives inside your Sheet)
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
6. Copy both outputs — you will paste them into the Google Sheet in Step 7

> **Why NotebookLM?** Groq has never seen your custom curriculum. NotebookLM reads your textbook and produces a clean summary that Groq uses to generate curriculum-specific questions. Without this, Groq generates generic questions unrelated to your syllabus.

---

### Step 3 — Create the Google Sheet and attach the Script

> ⚠️ **Important:** Do NOT go to script.google.com directly. The script must be created from inside a Google Sheet — otherwise it cannot find the spreadsheet to read and write.

1. Go to [sheets.google.com](https://sheets.google.com)
2. Click **+ Blank** to create a new spreadsheet
3. Rename it — click "Untitled spreadsheet" at the top and type `MOM Assignment Pipeline`
4. Click **Extensions** in the menu bar → **Apps Script**
   - This opens the script editor already attached to your Sheet
5. Click the project name at the top (it says "Untitled project") → rename it to `MOM Assignment Pipeline`
6. Delete the default empty function in the editor
7. Copy the entire contents of `src/Code.gs` from this repository
8. Paste it into the editor
9. Press **Ctrl + S** (Windows) or **Cmd + S** (Mac) to save

---

### Step 4 — Enable the Google Classroom API

1. In the Apps Script editor, click the **+** button next to **Services** in the left panel
2. Scroll down to find **Google Classroom API**
3. Click it → Click **Add**
4. You will now see `Classroom` listed under Services

---

### Step 5 — Add Your Credentials (Script Properties)

Your API key and Course ID are stored securely in Script Properties — they are **never in the code** and never go to GitHub.

1. Click the **gear icon ⚙** (Project Settings) in the left panel of the Apps Script editor
2. Scroll down to **Script Properties**
3. Click **Add script property** and add these two properties:

| Property Name | Value | Where to find it |
|---|---|---|
| `GROQ_API_KEY` | `gsk_xxxxxxxxxxxx` | From Step 1 |
| `COURSE_ID` | `863385955779` | From the `listMyCourses` function — see below |

**Finding your COURSE_ID — do this, not the URL:**

> ⚠️ **Do NOT copy the Course ID from the browser URL.** Google encodes the URL — what appears in the address bar (e.g., `ODYzMzg1OTU1Nzc5`) is Base64 encoded and will cause a "Requested entity was not found" error. Always get the numeric ID using the method below.

1. Add this temporary function to the **bottom** of your `Code.gs` and run it:

```javascript
function listMyCourses() {
  const response = Classroom.Courses.list({ pageSize: 20 });
  const courses  = response.courses;
  if (!courses || courses.length === 0) {
    Logger.log("No courses found. Make sure you are a TEACHER of the course.");
    return;
  }
  courses.forEach(c => {
    Logger.log(`Name: ${c.name}  |  ID: ${c.id}  |  State: ${c.courseState}`);
  });
}
```

2. Run `listMyCourses` from the function dropdown
3. Check the Execution log — find your course by name
4. Copy the **numeric ID** printed next to it (e.g., `863385955779`)
5. Paste that numeric ID as the value for `COURSE_ID` in Script Properties
6. You can delete the `listMyCourses` function from the code after this

4. Click **Save script properties**

---

### Step 6 — Test the Groq Connection

This step verifies that Groq is working before touching Google Classroom.

**How to find and run a function:**
- Look at the toolbar at the top of the editor
- There is a dropdown that says **"Select function"** — click it
- Choose `testWithSampleContent` from the list
- Click the **▶ Run** button next to the dropdown

**First-time authorization:**
- Google will pop up a dialog asking for permissions
- Click **Review permissions**
- Choose your Google account
- Click **Advanced** → **Go to MOM Assignment Pipeline (unsafe)**
  - This warning is normal for personal scripts — your script is not published or reviewed by Google
- Click **Allow**
- This grants the script access to Sheets, Classroom, and external URLs (Groq)

**Check the result:**
- Click **Execution log** at the bottom of the editor (or **View → Logs**)
- You should see `✅ SUCCESS! Groq is working.` followed by a generated problem and solution guide
- If you see an error, check that `GROQ_API_KEY` is saved correctly in Script Properties

> ⚠️ **Do not proceed to Step 7 until you see the SUCCESS message.** Everything after this depends on Groq working correctly.

---

### Step 7 — Fill In Your Google Sheet

Go back to your Google Sheet (the one you created in Step 3). The script has auto-created a tab called **Problems** with the correct column headers.

Fill in one row per topic like this:

| Column | What to put | Example |
|---|---|---|
| A — Topic | Chapter or concept name | `Shear Stress in Beams` |
| B — Problem Type | `numerical` / `diagram` / `conceptual` / `mixed` | `mixed` |
| C — Difficulty | `Easy` / `Medium` / `Hard` | `Medium` |
| D — Chapter Content | **Paste your NotebookLM summary here** (min 50 words) | *(paste here)* |
| E — Status | Leave **blank** — script fills this | *(leave empty)* |
| F to J | Leave blank — script fills these automatically | *(leave empty)* |

> ⚠️ **Column D is the most important column.** If it is empty or less than 50 words, the script will skip that row and warn you. Always paste your NotebookLM chapter summary here before running.

---

### Step 8 — Generate Drafts

1. In the Apps Script editor, select `generateDrafts` from the function dropdown
2. Click **▶ Run**
3. Open **Execution log** to watch progress
4. When done, go back to your Google Sheet:
   - **Column E** = `Draft` (script has updated this)
   - **Column F** = the problem students will see
   - **Column G** = solution guide (highlighted yellow — teacher only, never posted to students)

---

### Step 9 — Review and Approve

This is the most important step — especially for numerical problems.

1. **Read Column F** — Is the problem clear? Are the given values sensible? Units correct?
2. **Read Column G** — Verify the formula, all working steps, arithmetic, and final answer with units
3. **If you need to edit** — type your corrected version in **Column H** (Teacher Notes). The script will use Column H instead of Column F when posting
4. **When satisfied** — change **Column E** from `Draft` to `Approved`

> ⚠️ Groq is excellent at generating problems and evaluating reasoning, but **can make arithmetic errors** in multi-step calculations. Always verify the solution guide numerically yourself before approving. This is why the review step exists.

---

### Step 10 — Post to Classroom

1. In the Apps Script editor, select `postApproved` from the function dropdown
2. Click **▶ Run**
3. Only rows where Column E = `Approved` are posted — nothing else is touched
4. After posting:
   - Column E turns green and shows `Posted`
   - Column I gets the direct Classroom assignment link
5. Students receive a Classroom notification automatically

---

### Step 11 — Automate (Optional)

To auto-generate drafts every Monday at 7 AM without manually running the script:

1. Select `setupTrigger` from the function dropdown
2. Click **▶ Run** once

After that, `generateDrafts()` runs automatically every Monday. You still need to review Column G and run `postApproved()` manually — the teacher review step is always yours and cannot be automated.

To stop the automation at any time, run `removeTrigger`.

---

## Running Functions — Quick Reference

All functions are run from the **function dropdown** in the Apps Script editor toolbar:

```
[ Save ] [ ▶ Run ] [ Debug ] | Select function ▼ |
```

| Function | When to run | What it does |
|---|---|---|
| `testWithSampleContent` | Step 6 — first time only | Verifies Groq API key works |
| `generateDrafts` | Step 8 — after filling Sheet | Generates problems + solution guides |
| `postApproved` | Step 10 — after your review | Posts approved rows to Classroom |
| `evaluateStudentAnswer` | After student submits | Scores method + answer, gives feedback |
| `setupTrigger` | Step 11 — once, when ready | Automates generateDrafts every Monday |
| `removeTrigger` | If you want to stop | Removes the weekly automation |

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

Run it and check the Execution log. Groq returns:
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

**Script says "Cannot read properties of null (reading 'getSheetByName')"**
→ You created the script at script.google.com instead of from inside a Google Sheet. Start fresh — create a Sheet first, then Extensions → Apps Script.

**"GROQ_API_KEY not found"**
→ Go to Project Settings (gear icon) → Script Properties → confirm the property is named exactly `GROQ_API_KEY` with no spaces.

**"COURSE_ID not found"**
→ Confirm the property is named exactly `COURSE_ID` and the value contains only the numeric ID — no extra characters.

**Classroom API error: "Requested entity was not found" even with correct-looking ID**
→ The ID copied from the browser URL is Base64 encoded and will not work. The URL shows something like `ODYzMzg1OTU1Nzc5` but the API needs the numeric ID like `863385955779`. Run `listMyCourses()` (see Step 5) to get the correct numeric ID, then update Script Properties.

**Authorization dialog does not appear**
→ You may have already authorized. Check Execution log — if you see an error about permissions, go to Project Settings → re-authorize under OAuth scopes.

**Row is being skipped**
→ Column D (Chapter Content) is empty or too short. Paste your NotebookLM summary (at least 50 words) before running generateDrafts().

**Permission error when posting to Classroom**
→ Re-run postApproved() and go through the Google permissions dialog again. Make sure you allow Classroom access when prompted.

**Groq returns a 429 error**
→ You have hit the rate limit (30 requests/minute). The script already pauses 2.5 seconds between rows. If you have many rows, wait a few minutes and re-run.

**Solution guide is missing**
→ The delimiter was not generated correctly. Set Column E back to blank for that row and re-run generateDrafts().

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
