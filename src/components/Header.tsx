'use client';

import DropdownMenu from './DropdownMenu';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="bg-white/10 backdrop-blur-md text-white py-4 px-6 flex justify-between items-center border-b border-white/20">
      <a href="https://zansara.dev" target="_blank"> <img src="https://zansara.dev/me/avatar.svg" className="inline-block h-10 w-10 mx-1"/></a> 
      <h1 className="text-3xl font-semibold" style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
        {title}
      </h1>
      <DropdownMenu />
    </header>
  );
}
