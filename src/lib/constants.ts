export const CHARACTERS = [
  'Abigail', 'Alex', 'Alice', 'Amy', 'Andy', 'Ashley', 'Brandon', 'Brian',
  'Daniel', 'David', 'Emily', 'Henry', 'Jake', 'James', 'Joe', 'Jon',
  'Joseph', 'Joshua', 'Justin', 'Kyle', 'Matt', 'Megan', 'Melissa',
  'Nick', 'Peter', 'Rachael', 'Tyler', 'William'
] as const;

export type Character = typeof CHARACTERS[number];

export const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'eliminateCharacter',
      description: 'Eliminate a character from your board when you learn they cannot be the user\'s character',
      parameters: {
        type: 'object',
        properties: {
          characterName: {
            type: 'string',
            description: 'The name of the character to eliminate'
          }
        },
        required: ['characterName']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'endGame',
      description: 'When you or the user guesses correctly, the game should end.',
      parameters: {
        type: 'object',
        properties: {
          winner: {
            type: 'string',
            enum: ['user', 'llm'],
            description: 'Who won the game'
          }
        },
        required: ['winner']
      }
    }
  }
];
