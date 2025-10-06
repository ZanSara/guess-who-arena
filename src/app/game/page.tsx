import { redirect } from 'next/navigation';

export default function GameLandingPage() {
  // Redirect to home page - user should click "Start Game" from there
  redirect('/');
}
