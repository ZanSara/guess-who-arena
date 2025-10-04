'use client';

import { Character } from '@/lib/constants';
import Image from 'next/image';

interface CharacterCardProps {
  character: Character;
  isEliminated: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  showName?: boolean;
  isHidden?: boolean;
}

export default function CharacterCard({
  character,
  isEliminated,
  isSelected = false,
  onClick,
  showName = false,
  isHidden = false,
}: CharacterCardProps) {
  const cardClasses = [
    'character-card',
    isEliminated && 'eliminated',
    isSelected && 'selected',
    isHidden && 'hidden'
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses} onClick={onClick}>
      <Image
        src={`/characters/${character}.png`}
        alt={character}
        width={85}
        height={113}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
