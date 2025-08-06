import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold">FitVenture</h1>
      <nav className="space-x-4">
        <Link to="/" className="hover:underline text-gray-200">Home</Link>
        <Link to="/challenges" className="hover:underline text-gray-200">Challenges</Link>
        <Link to="/profile" className="hover:underline text-gray-200">Profile</Link>
      </nav>
    </header>
  );
}