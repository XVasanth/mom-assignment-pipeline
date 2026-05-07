// ============================================================
//  MECHANICS OF MATERIALS — AI Assignment Pipeline
//  Version: 1.0
//  Author:  [Your Name / Institution]
//  License: MIT
//
//  WHAT THIS DOES:
//  Automatically generates curriculum-aligned assignment problems
//  for Mechanics of Materials using Groq AI (free), posts them
//  to Google Classroom, and evaluates student answers.
//
//  DESIGNED FOR: Custom / Autonomous engineering curricula
//  Handles: Numerical, Diagram-based, Conceptual problems
//
//  ─────────────────────────────────────────────────────────
//  QUICK START (read README.md for full setup guide):
//  1. Copy this file into script.google.com
//  2. Enable Google Classroom API (Services → +)
//  3. Add Script Properties: GROQ_API_KEY and COURSE_ID
//  4. Run testWithSampleContent() to verify connection
//  5. Fill Google Sheet with topics + NotebookLM content
//  6. Run generateDrafts() → review → mark "Approved"
//  7. Run postApproved() to send to students
//  ─────────────────────────────────────────────────────────
//
//  SHEET COLUMNS (tab named "Problems"):
//  A: Topic
//  B: Problem Type   → numerical / diagram / conceptual / mixed
//  C: Difficulty     → Easy / Medium / Hard
//  D: Chapter Content (paste summary from NotebookLM)
//  E: Status         → [blank] → Draft → Approved → Posted
//  F: Generated Problem  (Groq fills — what students see)
//  G: Solution Guide     (Groq fills — TEACHER ONLY, never posted)
//  H: Teacher Notes      (your edits before posting — optional)
//  I: Assignment Link    (auto-filled after posting)
//  J: Date Posted        (auto-filled after posting)
//
//  SCRIPT PROPERTIES (Project Settings → Script Properties):
//  GROQ_API_KEY  → get free key from console.groq.com
//  COURSE_ID     → from Classroom URL: classroom.google.com/c/XXXXXXX
// ============================================================


// ─────────────────────────────────────────────
//  CONFIGURATION
//  Edit these values to match your setup
// ─────────────────────────────────────────────
const CONFIG = {
  SHEET_NAME:   "Problems",           // Name of the Sheet tab
  MODEL:        "llama-3.3-70b-versatile",  // Groq model (free tier)
  MAX_TOKENS:   2000,                 // Max response length
  DAYS_DUE:     7,                    // Assignment due in X days
  COURSE_NAME:  "Mechanics of Materials",   // Shown in assignment header
};


// ============================================================
//  STAGE 1 — GENERATE DRAFTS
//  Run this first. Reads your Sheet, calls Groq for each
//  pending row, saves generated problem + solution guide.
//  Nothing is posted to Classroom yet — you review first.
// ============================================================
function generateDrafts() {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GROQ_API_KEY");

  if (!apiKey) {
    Logger.log("❌ ERROR: GROQ_API_KEY not found in Script Properties.");
    Logger.log("   Go to: Project Settings (gear icon) → Script Properties → Add property");
    return;
  }

  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();
  let generated = 0;
  let skipped   = 0;

  Logger.log("Starting draft generation...\n");

  for (let i = 1; i < rows.length; i++) {
    const [topic, probType, difficulty, content, status] = rows[i];

    // Skip rows already processed
    if (!topic || status) continue;

    // Skip rows missing NotebookLM content
    if (!content || content.trim().length < 50) {
      Logger.log(`⚠ SKIPPING row ${i + 1} ("${topic}")`);
      Logger.log(`  Reason: Column D is empty. Paste your NotebookLM chapter summary there first.\n`);
      sheet.getRange(i + 1, 5).setValue("Skipped — paste NotebookLM content in Column D");
      skipped++;
      continue;
    }

    Logger.log(`⏳ Generating: "${topic}" (${probType || "mixed"}, ${difficulty || "Medium"})`);

    try {
      const result = callGroq(
        buildProblemPrompt(topic, probType, difficulty, content.trim()),
        buildSystemPrompt(),
        apiKey
      );

      if (!result) {
        sheet.getRange(i + 1, 5).setValue("Error — no response from Groq");
        Logger.log(`✗ No response received for "${topic}"\n`);
        continue;
      }

      const parsed = parseProblemAndSolution(result);

      // Write generated content back to Sheet
      sheet.getRange(i + 1, 5).setValue("Draft");
      sheet.getRange(i + 1, 6).setValue(parsed.problem);
      sheet.getRange(i + 1, 7).setValue(parsed.solution);
      sheet.getRange(i + 1, 7).setBackground("#FFF9C4"); // Yellow — teacher reminder

      generated++;
      Logger.log(`✓ Draft saved for: "${topic}"\n`);

    } catch (e) {
      Logger.log(`✗ Error on "${topic}": ${e.message}\n`);
      sheet.getRange(i + 1, 5).setValue("Error: " + e.message);
    }

    // Pause between rows to respect Groq rate limits (30 req/min)
    Utilities.sleep(2500);
  }

  Logger.log("─────────────────────────────────────────");
  Logger.log(`Done. Generated: ${generated} | Skipped: ${skipped}`);
  Logger.log("Next steps:");
  Logger.log("  1. Review Column F (problem) and Column G (solution guide — highlighted yellow)");
  Logger.log("  2. Correct any errors in Column G (especially numerical answers)");
  Logger.log("  3. Optionally edit the problem in Column H (Teacher Notes)");
  Logger.log("  4. Change Column E to 'Approved' for rows you're happy with");
  Logger.log("  5. Run postApproved()");
}


// ============================================================
//  STAGE 2 — POST APPROVED ASSIGNMENTS TO CLASSROOM
//  Only posts rows where Column E = "Approved"
//  Solution guide stays in Sheet — NEVER sent to students
// ============================================================
function postApproved() {
  const props     = PropertiesService.getScriptProperties();
  const COURSE_ID = props.getProperty("COURSE_ID");

  if (!COURSE_ID) {
    Logger.log("❌ ERROR: COURSE_ID not found in Script Properties.");
    Logger.log("   Find it in your Classroom URL: classroom.google.com/c/XXXXXXX");
    return;
  }

  const sheet  = getSheet();
  const rows   = sheet.getDataRange().getValues();
  let posted   = 0;
  let approved = 0;

  Logger.log("Posting approved assignments to Google Classroom...\n");

  for (let i = 1; i < rows.length; i++) {
    const [topic, probType, difficulty, , status, problem, , teacherNotes] = rows[i];

    if (status !== "Approved") continue;
    approved++;

    if (!problem) {
      Logger.log(`⚠ Row ${i + 1} ("${topic}"): No problem text found. Run generateDrafts() first.\n`);
      continue;
    }

    Logger.log(`📤 Posting: "${topic}"`);

    try {
      // Use teacher's edited version if available, otherwise use Groq's problem
      const finalProblem = (teacherNotes && teacherNotes.trim().length > 20)
        ? teacherNotes.trim()
        : problem.trim();

      const title       = `${CONFIG.COURSE_NAME} — ${topic} (${difficulty || "Standard"})`;
      const description = formatAssignment(topic, difficulty, probType, finalProblem);
      const link        = postToClassroom(COURSE_ID, title, description);

      // Update Sheet
      sheet.getRange(i + 1, 5).setValue("Posted");
      sheet.getRange(i + 1, 5).setBackground("#C8E6C9"); // Green
      sheet.getRange(i + 1, 9).setValue(link);
      sheet.getRange(i + 1, 10).setValue(new Date().toDateString());

      posted++;
      Logger.log(`✓ Posted: "${title}"`);
      Logger.log(`  Link: ${link}\n`);

    } catch (e) {
      Logger.log(`✗ Failed to post "${topic}": ${e.message}\n`);
      sheet.getRange(i + 1, 5).setValue("Post failed: " + e.message);
    }

    Utilities.sleep(1500);
  }

  Logger.log("─────────────────────────────────────────");
  Logger.log(`Done. Approved: ${approved} | Posted: ${posted}`);
}


// ============================================================
//  EVALUATE STUDENT ANSWER
//  Use after a student submits. Paste their answer and
//  Groq will evaluate method + final answer vs solution guide.
//  Returns structured feedback with score out of 10.
// ============================================================
function evaluateStudentAnswer(studentAnswer, solutionGuide, topic) {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GROQ_API_KEY");

  if (!apiKey) {
    Logger.log("❌ ERROR: GROQ_API_KEY not set in Script Properties.");
    return;
  }

  if (!studentAnswer || !solutionGuide) {
    Logger.log("❌ ERROR: Both studentAnswer and solutionGuide must be provided.");
    return;
  }

  const prompt =
    `A student submitted their answer to a Mechanics of Materials problem on "${topic}".\n\n` +
    `CORRECT SOLUTION GUIDE:\n"""\n${solutionGuide}\n"""\n\n` +
    `STUDENT'S SUBMITTED ANSWER:\n"""\n${studentAnswer}\n"""\n\n` +
    `Evaluate the student's work constructively. Use this exact structure:\n\n` +
    `METHOD EVALUATION:\n` +
    `- Correct formula used? (yes / partially / no)\n` +
    `- Steps followed in correct order? (yes / partially / no)\n` +
    `- Units carried through every step? (yes / partially / no)\n` +
    `- Sign conventions correct? (yes / no / not applicable)\n\n` +
    `ANSWER EVALUATION:\n` +
    `- Final answer correct? (yes / close / no)\n` +
    `- If wrong: pinpoint exactly where the error occurred\n` +
    `- Final answer has correct units? (yes / no)\n\n` +
    `DIAGRAM EVALUATION (skip if not applicable):\n` +
    `- Correct shape? | Key values labelled? | Critical points correct?\n\n` +
    `WHAT TO FIX (1–3 specific, actionable points):\n` +
    `- [point 1]\n` +
    `- [point 2]\n\n` +
    `SCORE: Method [X/5] | Answer [X/5] | Overall [X/10]`;

  const feedback = callGroq(
    prompt,
    "You are a Mechanics of Materials professor. Give specific, constructive feedback. " +
    "Reference exact engineering concepts, formula names, and unit conventions. " +
    "Be encouraging but precise about errors.",
    apiKey
  );

  Logger.log("─── FEEDBACK FOR: " + topic + " ───\n");
  Logger.log(feedback || "No feedback generated.");
  return feedback;
}


// ============================================================
//  PROMPT BUILDER — PROBLEM GENERATION
//  Builds the prompt sent to Groq based on problem type.
//  Content comes from your NotebookLM paste in Column D.
// ============================================================
function buildProblemPrompt(topic, probType, difficulty, content) {
  const type = (probType || "mixed").toLowerCase();
  const diff = difficulty || "Medium";

  const context =
    `You are creating an assignment for university students studying Mechanics of Materials.\n\n` +
    `Topic: ${topic}\n` +
    `Difficulty level: ${diff}\n\n` +
    `CHAPTER CONTENT (source: course textbook, provided by teacher):\n` +
    `"""\n${content}\n"""\n\n` +
    `IMPORTANT: Generate ALL questions STRICTLY from the chapter content above.\n` +
    `Do NOT introduce formulas, values, scenarios, or concepts not present in the content.\n\n`;

  const types = {

    "numerical":
      context +
      `Generate:\n` +
      `  Q1 (Numerical): A realistic engineering problem with specific numerical values and units.\n` +
      `    - State all given values clearly.\n` +
      `    - Ask students to calculate a specific quantity.\n` +
      `    - Instruct students to show ALL working steps with units at each step.\n\n` +
      `  Q2 (Conceptual): A refutation problem.\n` +
      `    - Write a short flawed explanation (2–3 sentences) a student might believe.\n` +
      `    - Ask: "Identify the error in the above statement and write the correct explanation."\n\n` +
      `===SOLUTION GUIDE (TEACHER ONLY)===\n` +
      `Q1 Solution:\n` +
      `  - Formula used and why\n` +
      `  - Every substitution step with values and units\n` +
      `  - Final answer with units\n` +
      `  - 2 common student mistakes on this type of problem\n\n` +
      `Q2 Solution:\n` +
      `  - The error in the statement\n` +
      `  - The correct explanation`,

    "diagram":
      context +
      `Generate:\n` +
      `  Q1 (Diagram): A beam or structural loading problem.\n` +
      `    - Describe the loading scenario clearly (span, load type, magnitude, supports).\n` +
      `    - Describe cross-section geometry if relevant.\n` +
      `    - Ask students to: (a) draw the required diagram by hand, (b) label all key values with units,\n` +
      `      (c) identify maximum, minimum, and zero-crossing points.\n` +
      `    - Specify what to draw (SFD, BMD, stress distribution, Mohr's circle, etc.).\n` +
      `    - Note: students draw by hand and upload a photo.\n\n` +
      `  Q2 (Conceptual): Ask why a specific feature of the diagram has its shape — physical reasoning.\n\n` +
      `===SOLUTION GUIDE (TEACHER ONLY)===\n` +
      `Q1 Solution:\n` +
      `  - Correct diagram description: shape, key values at critical points (with units)\n` +
      `  - Maximum and minimum values and their locations\n` +
      `  - Zero crossing locations (if applicable)\n` +
      `  - Common diagramming errors to watch for\n\n` +
      `Q2 Solution:\n` +
      `  - Physical reasoning behind the diagram shape`,

    "conceptual":
      context +
      `Generate 3 conceptual questions:\n\n` +
      `  Q1 (Refutation): Write a flawed explanation (2–3 sentences), then ask:\n` +
      `    "Identify the error and write the correct explanation using correct terminology."\n\n` +
      `  Q2 (Explain-why): Ask why a specific physical behaviour occurs in this topic.\n` +
      `    (e.g., "Why does stress concentration occur near holes in a plate?")\n\n` +
      `  Q3 (Compare): Ask the student to distinguish between two closely related concepts from this chapter.\n\n` +
      `===SOLUTION GUIDE (TEACHER ONLY)===\n` +
      `  Q1: The error + correct explanation\n` +
      `  Q2: The physical reasoning (3–5 sentences)\n` +
      `  Q3: Key distinctions between the two concepts`,

    "mixed":
      context +
      `Generate:\n` +
      `  Q1 (Numerical): Engineering problem with specific values.\n` +
      `    - All given values stated with units.\n` +
      `    - Ask for full working steps + final answer with units.\n\n` +
      `  Q2 (Diagram): Loading scenario description.\n` +
      `    - Students draw the required diagram by hand and upload a photo.\n` +
      `    - Specify what to draw and what to label.\n\n` +
      `  Q3 (Refutation): A realistic misconception (2–3 sentences).\n` +
      `    - Ask: "Identify the error and write the correct version."\n\n` +
      `===SOLUTION GUIDE (TEACHER ONLY)===\n` +
      `Q1: Step-by-step solution with all substitutions and units. Final answer with units.\n` +
      `    Common mistakes students make.\n\n` +
      `Q2: Correct diagram description — shape, values at critical points, units.\n` +
      `    What to look for when grading the photo.\n\n` +
      `Q3: The error + correct explanation.`
  };

  return types[type] || types["mixed"];
}


// ============================================================
//  SYSTEM PROMPT — sent to Groq with every request
// ============================================================
function buildSystemPrompt() {
  return (
    "You are an expert Mechanics of Materials professor creating university-level assignments. " +
    "Be precise with engineering units (MPa, kN, mm, m, N/m², kN·m, etc.). " +
    "Always use correct sign conventions. Be realistic with numerical values for engineering scenarios. " +
    "Separate the student problem from the teacher solution using EXACTLY this delimiter on its own line:\n" +
    "===SOLUTION GUIDE (TEACHER ONLY)===\n" +
    "Everything before the delimiter = student problem. Everything after = teacher solution guide. " +
    "The solution guide is NEVER shown to students."
  );
}


// ============================================================
//  PARSE GROQ RESPONSE
//  Splits the student problem from the teacher solution guide
// ============================================================
function parseProblemAndSolution(raw) {
  const DELIMITER = "===SOLUTION GUIDE (TEACHER ONLY)===";
  const idx       = raw.indexOf(DELIMITER);

  if (idx === -1) {
    // Delimiter not found — treat full response as problem, flag solution
    return {
      problem:  raw.trim(),
      solution: "⚠ Solution guide not generated. Re-run generateDrafts() for this row."
    };
  }

  return {
    problem:  raw.substring(0, idx).trim(),
    solution: raw.substring(idx + DELIMITER.length).trim()
  };
}


// ============================================================
//  FORMAT ASSIGNMENT TEXT
//  What students see in Google Classroom
// ============================================================
function formatAssignment(topic, difficulty, probType, problem) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + CONFIG.DAYS_DUE);

  const hasDiagram = ["diagram", "mixed"].includes((probType || "").toLowerCase());
  const diagramNote = hasDiagram
    ? "• Diagram questions: draw neatly by hand, label ALL values with units, photograph clearly and upload.\n"
    : "";

  return (
    `Course: ${CONFIG.COURSE_NAME}\n` +
    `Topic: ${topic}\n` +
    `Difficulty: ${difficulty || "Standard"}\n` +
    `Due: ${dueDate.toDateString()} by 11:59 PM\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `INSTRUCTIONS\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `• Show ALL working steps — answers without working receive zero marks.\n` +
    `• State the formula before substituting any values.\n` +
    `• Include units at every step and in your final answer.\n` +
    `• For conceptual questions: use correct engineering terminology.\n` +
    diagramNote +
    `• Submit as a typed Google Doc OR a clear photo of hand-written work.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `QUESTIONS\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    problem +
    `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Complete working is required for full marks. Good luck!`
  );
}


// ============================================================
//  GOOGLE CLASSROOM — POST ASSIGNMENT
// ============================================================
function postToClassroom(courseId, title, description) {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + CONFIG.DAYS_DUE);

  const work = Classroom.Courses.CourseWork.create({
    title:       title,
    description: description,
    workType:    "ASSIGNMENT",
    state:       "PUBLISHED",
    dueDate: {
      year:  dueDate.getFullYear(),
      month: dueDate.getMonth() + 1,
      day:   dueDate.getDate()
    },
    dueTime: { hours: 23, minutes: 59 }
  }, courseId);

  return `https://classroom.google.com/c/${courseId}/a/${work.id}/details`;
}


// ============================================================
//  GROQ API CALL
//  Central function for all Groq requests
// ============================================================
function callGroq(userPrompt, systemPrompt, apiKey) {
  const payload = {
    model:      CONFIG.MODEL,
    max_tokens: CONFIG.MAX_TOKENS,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userPrompt   }
    ]
  };

  const options = {
    method:             "post",
    contentType:        "application/json",
    headers:            { "Authorization": "Bearer " + apiKey },
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    options
  );

  const json = JSON.parse(response.getContentText());

  if (json.error) {
    throw new Error("Groq API error: " + json.error.message);
  }

  return json.choices?.[0]?.message?.content?.trim() || null;
}


// ============================================================
//  SHEET SETUP
//  Auto-creates the "Problems" sheet with correct columns
//  if it doesn't already exist
// ============================================================
function getSheet() {
  const ss  = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);

    const headers = [
      "Topic",
      "Problem Type\n(numerical / diagram / conceptual / mixed)",
      "Difficulty\n(Easy / Medium / Hard)",
      "Chapter Content\n← Paste NotebookLM summary here",
      "Status",
      "Generated Problem\n(review this before approving)",
      "Solution Guide\n⚠ TEACHER ONLY — never posted to students",
      "Teacher Notes\n(edit problem here before posting — optional)",
      "Assignment Link",
      "Date Posted"
    ];

    sheet.getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setFontWeight("bold")
      .setBackground("#E8EAF6")
      .setFontColor("#1a237e")
      .setWrap(true);

    // Column widths
    const widths = [200, 160, 110, 380, 130, 420, 420, 260, 220, 120];
    widths.forEach((w, i) => sheet.setColumnWidth(i + 1, w));

    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 60);

    // Sample row so the teacher knows the format
    sheet.getRange(2, 1, 1, 4).setValues([[
      "Shear Stress in Beams",
      "mixed",
      "Medium",
      "← Delete this and paste your NotebookLM chapter summary here (min 50 words)"
    ]]);

    Logger.log("✓ 'Problems' sheet created with sample row.");
    Logger.log("  Fill in your topics and paste NotebookLM content in Column D, then run generateDrafts().");
  }

  return sheet;
}


// ============================================================
//  TEST FUNCTION — run this first to verify Groq works
//  Uses a small sample of Mechanics of Materials content.
//  Check the Logs for the generated output.
// ============================================================
function testWithSampleContent() {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty("GROQ_API_KEY");

  if (!apiKey) {
    Logger.log("❌ ERROR: Add GROQ_API_KEY in Script Properties first.");
    Logger.log("   Project Settings (gear icon) → Script Properties → Add property");
    return;
  }

  Logger.log("🔄 Testing Groq API connection with sample content...\n");

  const sampleContent =
    "Shear stress in beams arises due to transverse loading. " +
    "The shear formula is τ = VQ/It, where V is the shear force at the section, " +
    "Q is the first moment of area of the portion above the point of interest about the neutral axis, " +
    "I is the second moment of area of the entire cross-section, and t is the width at the point. " +
    "Shear stress is zero at the outermost fibres (top and bottom) and reaches its maximum at the neutral axis. " +
    "For a rectangular cross-section, the shear stress distribution is parabolic, " +
    "and the maximum shear stress is τ_max = 1.5 × V/A, where A is the cross-sectional area. " +
    "The shear formula assumes the beam is prismatic and the material is linearly elastic.";

  try {
    const result = callGroq(
      buildProblemPrompt("Shear Stress in Beams", "mixed", "Medium", sampleContent),
      buildSystemPrompt(),
      apiKey
    );

    if (result) {
      const parsed = parseProblemAndSolution(result);
      Logger.log("✅ SUCCESS! Groq is working.\n");
      Logger.log("════ STUDENT-FACING PROBLEM ════\n");
      Logger.log(parsed.problem);
      Logger.log("\n════ SOLUTION GUIDE (TEACHER ONLY) ════\n");
      Logger.log(parsed.solution);
    } else {
      Logger.log("❌ FAILED: Groq returned an empty response.");
    }
  } catch (e) {
    Logger.log("❌ ERROR: " + e.message);
    Logger.log("Check that your GROQ_API_KEY is correct.");
  }
}


// ============================================================
//  WEEKLY AUTOMATION — run setupTrigger() ONCE
//  After that, generateDrafts() runs automatically every Monday
//  You still need to manually approve and run postApproved()
// ============================================================
function setupTrigger() {
  // Remove any existing triggers to avoid duplicates
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("generateDrafts")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(7)
    .create();

  Logger.log("✓ Trigger set: generateDrafts() will run every Monday at 7:00 AM.");
  Logger.log("  You will still need to review and run postApproved() manually.");
}

function removeTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Logger.log("✓ All triggers removed.");
}
