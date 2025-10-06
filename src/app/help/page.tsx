'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Image from 'next/image';

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header/>

      <div className="flex-1 flex flex-col items-center mt-6 px-4 pb-6">
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold">🕵️ Let's Play "Guess Who" with an LLM!</h2>
          <p>
              With this little game you can try to play "Guess Who" against an LLM of your choice,
              create your own LLM player and have different LLMs compete with each other.
          </p>
          <h2 className="text-2xl font-bold">The Rules</h2>
          <p>
              If you are not familiar with "Guess Who", here is a quick recap of the rules:
          </p>
          <ul className="list-disc list-inside space-y-2">
              <li>Each player has a board full of characters.</li>
              <li>Each players draws an additional random character.</li>
              <li>Your goal is to guess which character the other player has received by asking yes/no questions, such as "Is your character male?" or "Does your character have black hair?" and so on</li>
              <li>The first player to guess the opponent character's name wins.</li>
          </ul>
          <h2 className="text-2xl font-bold">Connect to your LLM provider</h2>
          <p>
              Before you can play you have to <b>connect an LLM provider</b>. This game supports OpenAI-compatible endpoints. Just click on Settings, type in the model name of the LLM you want to play against and add your API key. If you're not using OpenAI models, you should also add the endpoint of your provider.
          </p>

          <details className="space-y-2">
              <summary className="font-semibold cursor-pointer">What's an API key?</summary>
              <p>
                  An API key is similar to a password: it gives application access to a private resource. For example, have a look here to get your own OpenAI API key: <a href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-openai-api-key" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Where do I find my OpenAI API Key? - OpenAI Help Center</a>
              </p>
          </details>
          <details className="space-y-2">
              <summary className="font-semibold cursor-pointer">No way I'm giving you my API keys dude</summary>
              <p>
                  Legit! I wouldn't either. If you still want to play, you can <a href="https://github.com/ZanSara/guess-who" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">get the source code on GitHub</a> and run the game yourself. It's extremely easy! The entire game is an HTML file with a little JS and CSS on the side. No frameworks, no build systems, no Node.js, React or whatever. This game has no backend at all. It's fully hosted on GitHub Pages and everything is stored in your browser's local storage. Check the <a href="https://github.com/ZanSara/guess-who?tab=readme-ov-file" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">README</a> of the repo for more details, but it all boils down to running <a href="https://github.com/ZanSara/guess-who?tab=readme-ov-file#how-to-play" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">these three commands</a> on any modern Linux or Mac OS.
              </p>
          </details>
          <details className="space-y-2">
              <summary className="font-semibold cursor-pointer">Can I play for free?</summary>
              <p>
                  The game is free, but if you're using a hosted LLM you're likely going to be charged by the token. Check your provider's terms to learn how much the tokens cost in your specific case. Rest assured: in this game there's no hidden consumption of tokens. The LLM is used exclusively to chat with you, so in most cases it should cost very little per game (pennies or less).
              </p>
          </details>

          <Image src="/help/settings.png" alt="Settings" width={800} height={600} className="mx-auto"/>

          <h2 className="text-2xl font-bold">Gameplay</h2>
          <p>
              You can communicate with the LLM through a free form chat, just like you would play with another person.
          </p>
          <Image src="/help/chat.png" alt="Chat" width={800} height={600} className="mx-auto"/>
          <p>
              Your board will be on the left, with your chosen character at the top. You can remove characters from your board by clicking on them. Clicking on an eliminated character brings it back.
          </p>
          <Image src="/help/user-board.png" alt="User Board" width={800} height={600} className="mx-auto"/>
          <p>
              You can also see the LLM's board to know how many characters it already filtered out and how close it is to winning.                
          </p>
          <Image src="/help/llm-board.png" alt="LLM Board" width={800} height={600} className="mx-auto"/>
          <p>
              The LLM is in charge of declaring a winner. When you win, the LLM should declare you the winner:                
          </p>
          <Image src="/help/user-wins.png" alt="User Wins" width={800} height={600} className="mx-auto"/>
          <p>
              When you lose, you'll see this instead:               
          </p>
          <Image src="/help/llm-wins.png" alt="LLM Wins" width={800} height={600} className="mx-auto"/>

          <h2 className="text-2xl font-bold">For the pros</h2>
          <p>
              In the Settings window you can find some more tools. They are especially useful if you're trying to prove a point.
          </p>
          <ul className="list-disc list-inside space-y-2">
              <li><b>Reveal character</b>: reveals the LLM's selected character. With this setting turned on, winning is trivial. However, in many cases the LLM will lie about its character's features (!!!) so it can come useful if you're suspecting your LLM's partner of cheating.</li>
              <li><b>System Prompt</b>: the system prompt is crucial to the behavior of the LLM. By modifying the system prompt you can alter completely the behavior of the LLM and try to make it play better/worse/differently. I prepared two system prompts that can be loaded with the press of a button:
              </li>
              <ul className="list-disc list-inside ml-4 space-y-2">
                  <li> the "simple" prompt: what I believe would be sufficient for a smart LLM such as GPT-5 or Claude Opus to play this game normally.</li>
                  <li> the "spelled-out" prompt: what I eventually had to use in order to make most LLMs get close to a gameplay that makes sense.</li>
              </ul>
          </ul>
          <h2 className="text-2xl font-bold">Why?</h2>
          <p>
              My original intent was to make LLMs play against each other and make a sort of leaderboard of their Guess Who prowess... but the results of my initial testing were so delirious that I needed to share this version too. <br/>
              I am now collecting a few gameplays for a future post on my <a href="https://zansara.dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">blog</a>, which I will link here once ready (or you can subscribe to my <a href="https://zansara.substack.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Substack</a> to receive it in your inbox). If you stumble upon some odd behavior, please share it with me! You can find me on <a href="https://x.com/zansara_dev" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Twitter/X</a>, <a href="https://bsky.app/profile/zansara.bsky.social" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Bluesky</a>, <a href="https://mastodon.social/@zansara" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Mastodon</a>, <a href="https://www.linkedin.com/in/sarazanzottera/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn</a>, and of course via <a href="mailto:hello@zansara.dev" className="text-blue-600 hover:underline">email</a>. 
              Needless to say, <a href="https://github.com/ZanSara/guess-who" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">contributions are welcome</a>.<br/>
              Enjoy!
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
