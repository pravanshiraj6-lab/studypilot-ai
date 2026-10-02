# StudyPilot — AI Study Plan Generator

A responsive study-planning website with an optional OpenAI-powered planner and adaptive study coach. It also has a local fallback so the app can be demonstrated without an API key.

## Run locally
1. Install Node.js 18+.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env`.
4. Optional: add your OpenAI API key to `.env`. Keep the key on the server; never put it in frontend JavaScript.
5. Run `npm start`.
6. Open http://localhost:3000.

Without an API key, the website uses its built-in local planner and fallback adaptation logic. With a valid key, both plan generation and adaptation use the configured OpenAI model.

## Features
- Subjects and comma-separated topic entry
- Exam date and available daily study time
- Personalized multi-day plan
- Adaptive coach for missed sessions or changing availability
- Responsive interface and print-to-PDF export

## Demo flow
1. Keep the sample subjects or add your own.
2. Set an exam date about two weeks away and choose 3 hours/day.
3. Generate the plan.
4. In the coach box enter: "I couldn't finish Physics today and I only have 2 hours tomorrow."
5. Show the suggested changes.
6. Use Export / Print to save the plan.

## Before a public deployment
Deploy the Node app to a Node-compatible host. Add `OPENAI_API_KEY` and `OPENAI_MODEL` as server environment variables. Do not commit `.env` or expose API keys in client code. Add authentication and rate limiting before opening the AI endpoint to the public.
