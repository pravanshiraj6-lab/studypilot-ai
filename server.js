const express = require("express");
const OpenAI = require("openai");
const path = require("path");
require("dotenv").config?.();

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/plan", async (req, res) => {
  const { subjects, examDate, hoursPerDay, level, notes } = req.body || {};
  if (!Array.isArray(subjects) || !subjects.length || !examDate || !hoursPerDay) {
    return res.status(400).json({ error: "Add subjects, an exam date, and daily study hours." });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.json({ plan: buildLocalPlan(subjects, examDate, Number(hoursPerDay), level || "Mixed") , mode: "local" });
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an expert, supportive study coach. Create a realistic study plan. Return JSON with keys: title, overview, days (array of objects with date, focus, tasks array of objects {subject, topic, minutes, priority, reason}), tips (array), checkpoints (array). Respect available hours, exam date, topics and levels. Include breaks implicitly by not filling every minute. Never promise guaranteed results." },
        { role: "user", content: JSON.stringify({ subjects, examDate, hoursPerDay, level, notes }) }
      ]
    });
    const plan = JSON.parse(completion.choices[0].message.content);
    res.json({ plan, mode: "ai" });
  } catch (e) {
    console.error(e.message);
    res.status(502).json({ error: "AI generation failed. Check your API key/model and try again." });
  }
});

app.post("/api/adapt", async (req, res) => {
  const { plan, update } = req.body || {};
  if (!plan || !update) return res.status(400).json({ error: "Plan and update are required." });
  if (!process.env.OPENAI_API_KEY) {
    return res.json({ message: "Your plan has been adjusted locally. Move unfinished topics to the next available study block, and keep the final day for revision.", suggestions: ["Shift unfinished topics to the next day.", "Keep one short revision block each day.", "Reduce lower-priority practice before removing revision."], mode: "local" });
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an adaptive study coach. Given a study plan and a student's progress update, return JSON with keys message, changes (array), nextSteps (array). Be practical, kind, and preserve the exam deadline." },
        { role: "user", content: JSON.stringify({ plan, update }) }
      ]
    });
    res.json({ ...JSON.parse(completion.choices[0].message.content), mode: "ai" });
  } catch (e) { res.status(502).json({ error: "Could not adapt the plan. Please try again." }); }
});

function buildLocalPlan(subjects, examDate, hours, level) {
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(examDate + "T00:00:00");
  const days = Math.max(1, Math.min(30, Math.ceil((end-today)/86400000)));
  const topics = subjects.flatMap(s => (s.topics || []).map(t => ({subject:s.name, topic:t.trim(), level:s.level || level}))).filter(x=>x.topic);
  const pool = topics.length ? topics : subjects.map(s=>({subject:s.name,topic:"Core concepts and practice",level:s.level||level}));
  const perDay = Math.max(1, Math.floor(hours*60/50));
  const schedule = [];
  for(let d=0; d<days; d++) {
    const date = new Date(today); date.setDate(today.getDate()+d);
    const tasks=[];
    for(let j=0;j<perDay;j++) {
      const item=pool[(d*perDay+j)%pool.length];
      tasks.push({subject:item.subject,topic:item.topic,minutes:Math.min(50,Math.round(hours*60/perDay)),priority:item.level==="Needs work"?"High":(j===0?"High":"Medium"),reason:item.level==="Needs work"?"Give extra attention to a topic you marked as difficult.":"Build understanding with focused practice."});
    }
    schedule.push({date:date.toISOString().slice(0,10),focus:d===days-1?"Final revision":`Learning and practice · Day ${d+1}`,tasks});
  }
  return {title:"Your personalized study plan",overview:`A ${days}-day plan with about ${hours} study hours per day. Adjust the blocks to fit your energy and commitments.`,days:schedule,tips:["Study in focused blocks and take short breaks.","Use active recall instead of only rereading.","End each day with a quick review of what you learned."],checkpoints:["Mark each topic complete after practice.","Revisit topics you found difficult.","Keep the final session for light revision."]};
}
app.listen(process.env.PORT || 3000, () => console.log(`StudyPlan AI running at http://localhost:${process.env.PORT || 3000}`));
