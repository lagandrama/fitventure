import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Challenges from './pages/Challenges';
import Profile from './pages/Profile';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <>
      <Header />

      <div className="p-6">
        <h1 className="text-3xl font-bold underline text-red-600 mb-4">
          Hello FitVenture!
        </h1>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/challenges" element={<Challenges />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
