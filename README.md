# Guess Who Arena

Play the classic "Guess Who" game against Large Language Models! This is a Next.js implementation of the game where you compete against AI to guess each other's characters through yes/no questions.

This is a reimplementation of the [original single-page version](https://www.zansara.dev/guess-who/) built with modern Next.js, TypeScript, and Supabase.

## Features

- 🎮 Play Guess Who against OpenAI models (GPT-4, GPT-5, etc.)
- 💬 Real-time streaming chat interface
- 🔐 Secure authentication with Supabase (magic link/email)
- 💾 Save and view game history
- ✨ Custom system prompts for different AI behaviors
- 🎨 Modern, responsive UI with Tailwind CSS
- 📊 Track wins/losses and replay past games

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth (magic link)
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI API with streaming support

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd guess-who-arena
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and publishable key
3. Run the SQL schema in your Supabase SQL editor:

```bash
# Copy contents of supabase-schema.sql and run it in Supabase SQL Editor
```

### 4. Configure environment variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your-publishable-key
USER_APIKEY_ENCRYPTION_KEY=your-32-byte-base64-encryption-key
```

Generate the encryption key with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play!

## How to Play

1. **Sign In**: Use your email to receive a magic link for authentication
2. **Configure Settings**: Add your OpenAI API key and select a model
3. **Start a Game**: Click "Start Game!" to begin
4. **Play**:
   - Ask yes/no questions about the LLM's character
   - Answer the LLM's questions about your character
   - Eliminate characters from your board by clicking on them
   - The LLM will eliminate characters using the `eliminateCharacter` tool
5. **Win**: Guess the LLM's character correctly before it guesses yours!

## Game Views

- **Chat Tab**: Communicate with the LLM
- **Your Board**: See your character and eliminate options
- **LLM's Board**: Track which characters the LLM has eliminated
- **History**: Review past games and conversations
- **Settings**: Configure API keys, models, and system prompts

## Custom Prompts

The game includes two default prompts:
- **Simple Prompt**: Basic instructions for capable models
- **Spelled-Out Prompt**: Detailed step-by-step guidance for better gameplay

You can create and save your own custom prompts in the Settings page.

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

MIT

## Credits

Based on the original [Guess Who LLM game](https://www.zansara.dev/guess-who/) by [zansara](https://zansara.dev).
