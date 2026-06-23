import { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useSearchParams } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('http://localhost:8080/reset-password', { token, new_password: newPassword });
      toast.success('Senha alterada com sucesso!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
        <h2 className="text-2xl font-black text-[#003366] mb-6">Definir Nova Senha</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="password" placeholder="Nova Senha" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} required
            className="w-full bg-gray-100 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
          />
          <input 
            type="password" placeholder="Confirmar Nova Senha" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} required
            className="w-full bg-gray-100 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#003366] outline-none"
          />
          <button type="submit" disabled={loading} className="bg-[#003366] text-white p-3 rounded-lg font-bold text-sm hover:bg-[#002244] transition-all">
            {loading ? 'SALVANDO...' : 'REDEFINIR SENHA'}
          </button>
        </form>
      </div>
    </div>
  );
};
export default ResetPassword;
