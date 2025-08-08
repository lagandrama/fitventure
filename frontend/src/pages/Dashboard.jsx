import { useEffect, useState } from 'react';
import API from '../api';

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    API.get('/me')
      .then(res => setUser(res.data.user))
      .catch(() => alert('Niste prijavljeni.'));
  }, []);

  if (!user) return <p>Učitavanje...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Dobrodošao, {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
