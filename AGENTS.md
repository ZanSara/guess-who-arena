# Goal
We are going to implement a simple web-based Guess-Who game. 

# Existing work
I've already made a simple version at https://www.zansara.dev/guess-who/ with a single HTML page and I want to reimplement it in Next.js. 
You're in a boilerplate Next.js template and I want you to replicate the game's functionality and look as closely as possible. 
You can find the source code of the original game in the _old/ folder for reference (we will delete it after you finished the reimplementation). 
There's an AGENTS.md file in the _old/ folder you can use to understand how the old project worked. 
You must reuse the image assets, but rewrite the code.

# Improvements
- The new game should be written in Next.js/TypeScript following best practices.
- While the original game supports three LLM providers (OpenAI, Anthropic, Google's Gemini), I want you to port only the OpenAI support.
- Implement true streaming for faster perceived response
- Cache base64 images (currently reloaded each game)
- Reduce image sizes for faster transmission
- Add an account management system with Supabase (email/magic link based)
- Store the games for each player in Supabase as well and add a view where users can see their older games's chat and boards.
- Add a view where each player can store their custom prompts and LLM pairs.
