import { useForm } from 'react-hook-form';
import API from '../api';
import { useNavigate } from 'react-router-dom';

export default function ChallengeNew() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await API.post('/challenges', data);
      alert('Challenge created');
      navigate('/challenges');
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to create');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg mx-auto grid gap-2">
      <input className="border p-2" placeholder="Title" {...register('title')} />
      <textarea className="border p-2" placeholder="Description" {...register('description')} />
      <select className="border p-2" {...register('type')}>
        <option value="running">Running</option>
        <option value="yoga">Yoga</option>
        <option value="hiit">HIIT</option>
        <option value="steps">Steps</option>
        <option value="weightloss">Weight Loss</option>
        <option value="custom">Custom</option>
      </select>
      <select className="border p-2" {...register('privacy')}>
        <option value="public">Public</option>
        <option value="private">Private</option>
      </select>
      <input className="border p-2" type="number" step="0.01" placeholder="Entry fee" {...register('entryFee')} />
      <textarea className="border p-2" placeholder="Rules" {...register('rules')} />
      <label className="text-sm text-gray-600">Start</label>
      <input className="border p-2" type="date" {...register('startDate')} />
      <label className="text-sm text-gray-600">End</label>
      <input className="border p-2" type="date" {...register('endDate')} />
      <button className="bg-green-600 text-white p-2 mt-2" type="submit">Create</button>
    </form>
  );
}
