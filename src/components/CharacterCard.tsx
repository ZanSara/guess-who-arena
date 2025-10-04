'use client';

import { Character } from '@/lib/constants';
import Image from 'next/image';

interface CharacterCardProps {
  character: Character;
  isEliminated: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  isHidden?: boolean;
}

export default function CharacterCard({
  character,
  isEliminated,
  isSelected = false,
  onClick,
  isHidden = false,
}: CharacterCardProps) {
  const cardClasses = [
    'character-card',
    isEliminated && 'eliminated',
    isSelected && 'selected',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} onClick={onClick}>
      {isHidden ? (
        <Image
          src="/card-back.svg"
          alt="Hidden Character"
          width={85}
          height={113}
          className="w-full h-full object-cover"
        />
      ) : (
        <Image
          src={`/characters/${character}.png`}
          alt={character}
          width={85}
          height={113}
          className="w-full h-full object-cover"
        />
      )}
    </div>
  );
}
