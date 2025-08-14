import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Challenges from './pages/Challenges';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Integrations from './pages/Integrations';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import ChallengeNew from './pages/ChallengeNew';
import ChallengeDetail from './pages/ChallengeDetail';
import RequireAuth from './components/RequireAuth';

function App() {
  return (
    <>
      <Header />

      <div className="p-6">
        {/* Privremeni linkovi za test navigacije */}
        <nav className="flex gap-4 mb-4">
          <Link to="/login" className="text-blue-500">Login</Link>
          <Link to="/integrations" className="px-3 py-2">Integrations</Link>
          <Link to="/register" className="text-blue-500">Register</Link>
          <Link to="/dashboard" className="text-blue-500">Dashboard</Link>
        </nav>

        <h1 className="text-3xl font-bold underline text-red-600 mb-4">
          Hello FitVenture!
        </h1>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/challenges/new" element={<RequireAuth><ChallengeNew /></RequireAuth>} />
          <Route path="/challenges/:id" element={<ChallengeDetail />} />    
        </Routes>
      </div>

      <Footer />
    </>
  );
}

export default App;
