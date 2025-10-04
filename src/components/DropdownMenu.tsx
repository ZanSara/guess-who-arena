'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DropdownMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full text-white"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-25 bg-purple-100 rounded-md shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => router.push('/settings')}
              className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-indigo-100"
            >
              Settings
            </button>
            <button
              onClick={() => router.push('/help')}
              className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-indigo-100"
            >
              Help
            </button>
            {user ? (
              <button
                onClick={handleSignOut}
                className="block w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-indigo-100"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => router.push('/auth')}
                className="block w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-indigo-100"
              >
                Login
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
