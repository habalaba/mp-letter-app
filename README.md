# MP / MPP Letter Builder

Simple Node + Express app that helps you:

- Look up your Canadian **MP or MPP** by postal code
- Enter your own message in plain language
- Have AI polish it into a formal, respectful business letter body
- Generate a printable letter with proper addresses and layout (via browser Print to PDF)

## Tech stack

- Node.js + Express
- OpenAI API (for wording)
- Represent API (Open North) to look up representatives
- Vanilla HTML / CSS / JS front-end

## Getting started

1. **Clone the repo and install dependencies**

   ```bash
   git clone YOUR_REPO_URL_HERE
   cd mp-letter-app
   npm install
   ```

2. **Configure OpenAI key**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:

   ```bash
   OPENAI_API_KEY=sk-...
   ```

3. **Run the app**

   ```bash
   npm start
   ```

   Then open:

   - http://localhost:3000

## How it works

- You enter your postal code and choose MP (federal) or MPP (Ontario).
- The app calls the Represent API to find your representative and address.
- You write your message and click **Enhance with AI**.
- The back end calls OpenAI to polish the body of the letter.
- The front end assembles a business-style letter you can print or save as PDF.

## Important

- Your OpenAI API key is **not** committed. Keep it in `.env`.
- This is a starter app; you can extend it with:
  - PDF generation on the server
  - Email sending
  - Saving drafts / history
