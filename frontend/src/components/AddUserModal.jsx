import { useState } from 'react';
import axios from 'axios';
import Modal from './Modal';
import { toast } from 'react-toastify';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const AddUserModal = ({ isOpen, onClose }) => {
  const [userData, setUserData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    id_funcionario: '',
    departamento: '',
    cargo: ''
  });

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      toast.error('Insira um e-mail válido (ex: nome@empresa.com)');
      return;
    }

    try {
      const payload = {
        nome_completo: userData.nome_completo,
        email: userData.email,
        telefone: userData.telefone,
        id_funcionario: userData.id_funcionario,
        departamento: userData.departamento,
        cargo: userData.cargo
      };

      await axios.post(`${API_URL}/usuarios`, payload);
      toast.success('Usuário cadastrado com sucesso! Um e-mail foi enviado para definir a senha.');
      onClose();
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar usuário.');
    }
  };

  const inputStyle = "w-full bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-sm font-medium text-[#003366] focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400";
  const labelStyle = "text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Novo Usuário">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className={labelStyle}>Nome Completo</label>
            <input name="nome_completo" required onChange={handleChange} className={inputStyle} placeholder="Nome do usuário" />
          </div>
          <div className="flex flex-col">
            <label className={labelStyle}>E-mail Corporativo</label>
            <input name="email" type="email" required onChange={handleChange} className={inputStyle} placeholder="exemplo@empresa.com" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className={labelStyle}>Telefone</label>
            <input name="telefone" type="tel" onChange={handleChange} className={inputStyle} placeholder="(00) 00000-0000" />
          </div>
          <div className="flex flex-col">
            <label className={labelStyle}>ID Funcionário</label>
            <input name="id_funcionario" required onChange={handleChange} className={inputStyle} placeholder="Ex: RI-0000" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col">
            <label className={labelStyle}>Departamento</label>
            <select name="departamento" required onChange={handleChange} className={`${inputStyle} cursor-pointer appearance-none`}>
              <option value="">Selecione...</option>
              <option value="Segurança Industrial">Segurança Industrial</option>
              <option value="TI">TI</option>
              <option value="Operações">Operações</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className={labelStyle}>Cargo</label>
            <input name="cargo" required onChange={handleChange} className={inputStyle} placeholder="Ex: Analista de Segurança" />
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-[#003366] text-white py-4 rounded-xl font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-[#002244] mt-6 transition-all shadow-xl shadow-blue-900/10 active:scale-95"
        >
          CADASTRAR USUÁRIO
        </button>
      </form>
    </Modal>
  );
};
export default AddUserModal;
