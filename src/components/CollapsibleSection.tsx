
'use client';

import { useState, ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
}

export default function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-left gap-3 items-center text-xl font-semibold"
      >
        <span>{isOpen ? '−' : '+'}</span>
        <span>{title}</span>
      </button>
      {isOpen && (
        <div className="mt-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}
