import { useForm } from 'react-hook-form';
import API from '../api';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      const res = await API.post('/login', data);
      localStorage.setItem('token', res.data.token);
      alert('Login uspješan!');
      navigate('/dashboard');
    } catch (err) {
      alert(err.response?.data?.error || 'Greška pri prijavi');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm mx-auto flex flex-col gap-2">
      <input {...register('email')} type="email" placeholder="Email" className="border p-2" />
      <input {...register('password')} type="password" placeholder="Lozinka" className="border p-2" />
      <button type="submit" className="bg-blue-500 text-white p-2">Prijavi se</button>
    </form>
  );
}
