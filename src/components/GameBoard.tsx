'use client';

import { Character, CHARACTERS } from '@/lib/constants';
import CharacterCard from './CharacterCard';

interface GameBoardProps {
  selectedCharacter?: Character | null;
  eliminatedCharacters: Set<Character>;
  onCharacterClick?: (character: Character) => void;
  showSelectedName?: boolean;
}

export default function GameBoard({
  selectedCharacter,
  eliminatedCharacters,
  onCharacterClick,
  showSelectedName = true,
}: GameBoardProps) {
  return (
    <div className="w-full flex flex-col">
      {selectedCharacter && (
        <div className="mb-4 flex items-center justify-center gap-3 py-2">
          <div className="w-[100px] h-[133px]">
            <CharacterCard
              character={selectedCharacter}
              isEliminated={false}
              isSelected={true}
              isHidden={!showSelectedName}
            />
          </div>
          {showSelectedName && (
            <div className="text-center">
              <div className="text-xl font-bold text-gray-800">{selectedCharacter}</div>
              <div className="text-sm text-gray-600">Your Character</div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-auto">
        <div className="grid grid-cols-7 gap-1 p-2 justify-items-center">
          {CHARACTERS.map((character) => (
            <CharacterCard
              key={character}
              character={character}
              isEliminated={eliminatedCharacters.has(character)}
              onClick={() => onCharacterClick?.(character)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
