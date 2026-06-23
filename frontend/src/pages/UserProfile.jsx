import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  UserPlus, 
  Camera, 
  ChevronRight,
  Bell,
  Mail,
  Smartphone,
  Monitor,
  Lock,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import AddUserModal from '../components/AddUserModal';
import ProfilePhotoModal from '../components/ProfilePhotoModal';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const InputField = ({ label, placeholder, value, field, type = "text", isSelect = false, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        {isSelect ? (
          <select 
            value={value || ""}
            onChange={(e) => onChange(field, e.target.value)}
            className="w-full bg-gray-100 border-none rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-[#003366] outline-none appearance-none cursor-pointer"
          >
            <option value="">Selecione...</option>
            <option value="Segurança Industrial">Segurança Industrial</option>
            <option value="TI">TI</option>
            <option value="Operações">Operações</option>
          </select>
        ) : (
          <>
            <input 
              type={isPassword ? (showPassword ? "text" : "password") : type} 
              placeholder={placeholder}
              value={value || ""}
              onChange={(e) => onChange(field, e.target.value)}
              className={`w-full bg-gray-100 border-none rounded-lg p-3 text-sm font-medium placeholder:text-gray-400 focus:ring-2 focus:ring-[#003366] outline-none transition-all ${isPassword ? 'pr-10' : ''}`}
              autoComplete="off"
            />
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#003366] transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const PasswordStrengthMeter = ({ password }) => {
  const getStrength = () => {
    if (!password) return { level: 0, label: '', color: 'bg-gray-200' };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    switch (strength) {
      case 1: return { level: 1, label: 'Fraca', color: 'bg-red-500' };
      case 2: return { level: 2, label: 'Razoável', color: 'bg-orange-500' };
      case 3: return { level: 3, label: 'Forte', color: 'bg-yellow-500' };
      case 4: return { level: 4, label: 'Muito forte', color: 'bg-green-500' };
      default: return { level: 0, label: 'Fraca', color: 'bg-red-500' };
    }
  };

  const { level, label, color } = getStrength();

  return (
    <div className="mt-2">
      <div className="flex gap-1 h-1.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`flex-1 rounded-full transition-colors ${i <= level ? color : 'bg-gray-200'}`} />
        ))}
      </div>
      {password && <p className={`text-[10px] font-black mt-1 ${color.replace('bg-', 'text-')}`}>{label}</p>}
    </div>
  );
};

const PasswordInputField = ({ label, value, onChange, field, error }) => {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input 
          type={showPassword ? "text" : "password"}
          placeholder="**********"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          className={`w-full bg-gray-100 border-none rounded-lg p-3 text-sm font-medium focus:ring-2 focus:ring-[#003366] outline-none transition-all pr-10 ${error ? 'ring-2 ring-red-500' : ''}`}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#003366]"
        >
          {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
      {error && <p className="text-[10px] font-bold text-red-500 mt-0.5">{error}</p>}
      {field === 'nova_senha' && <PasswordStrengthMeter password={value} />}
    </div>
  );
};

const Toggle = ({ active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
      active ? 'bg-[#003366]' : 'bg-gray-200'
    }`}
  >
    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${
      active ? 'translate-x-6' : 'translate-x-0'
    }`} />
  </button>
);

const UserProfile = () => {
  const { user, setUser } = useAuth();
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    telefone: '',
    id_funcionario: '',
    departamento: '',
    cargo: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    system: true
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nome_completo: user.nome || user.nome_completo || '',
        email: user.email || '',
        telefone: user.telefone || '',
        id_funcionario: user.id_funcionario || '',
        departamento: user.departamento || '',
        cargo: user.cargo || '',
      });
      setNotifications({
        email: user.alerta_email ?? true,
        sms: user.alerta_sms ?? false,
        system: user.notificacao_sistema ?? true
      });
    }
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);

  const [passwordData, setPasswordData] = useState({
    senha_atual: '',
    nova_senha: '',
    confirmar_senha: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [passLoading, setPassLoading] = useState(false);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const toggleNotification = (key) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const validatePasswordFields = useCallback((data) => {
    const errors = {};
    if (!data.senha_atual) errors.senha_atual = 'Senha atual é obrigatória.';
    
    const senhaValida = (senha) => (
      senha.length >= 8 &&
      /[A-Z]/.test(senha) &&
      /[a-z]/.test(senha) &&
      /[0-9]/.test(senha) &&
      /[^A-Za-z0-9]/.test(senha)
    );

    if (!senhaValida(data.nova_senha)) {
      errors.nova_senha = 'Senha fraca. Deve ter 8+ caracteres, maiúsculas, minúsculas, números e símbolos.';
    }
    if (data.nova_senha === data.senha_atual) {
      errors.nova_senha = 'A nova senha não pode ser igual à atual.';
    }
    if (data.confirmar_senha !== data.nova_senha) {
      errors.confirmar_senha = 'As senhas não coincidem.';
    }
    return errors;
  }, []);

  const handlePasswordInputChange = useCallback((field, value) => {
    const newData = { ...passwordData, [field]: value };
    setPasswordData(newData);
    setPasswordErrors(validatePasswordFields(newData));
  }, [passwordData, validatePasswordFields]);

  const handlePasswordChange = async () => {
    const errors = validatePasswordFields(passwordData);
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPassLoading(true);
    setPasswordErrors({});
    try {
      const response = await axios.post(`${API_URL}/usuarios/me/senha`, {
        senha_atual: passwordData.senha_atual,
        nova_senha: passwordData.nova_senha
      });
      toast.success('Senha alterada com sucesso');
      setPasswordData({ senha_atual: '', nova_senha: '', confirmar_senha: '' });
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setPasswordErrors({ senha_atual: error.response?.data?.detail || 'Erro ao alterar senha.' });
    } finally {
      setPassLoading(false);
    }
  };

  const handleProfileSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Insira um e-mail válido (ex: nome@empresa.com)');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        password: "N/A",
        alerta_email: notifications.email,
        alerta_sms: notifications.sms,
        notificacao_sistema: notifications.system
      };

      await axios.put(`${API_URL}/usuarios/me`, payload);
      toast.success('Informações pessoais atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      const errorMsg = error.response?.data?.detail || 'Erro ao atualizar informações pessoais.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationsSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        alerta_email: notifications.email,
        alerta_sms: notifications.sms,
        notificacao_sistema: notifications.system
      };

      await axios.put(`${API_URL}/usuarios/me`, payload);
      toast.success('Preferências de notificação salvas!');
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar preferências.';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoConfirm = async (file) => {
    const formDataUpload = new FormData();
    formDataUpload.append('foto', file);
    
    setIsAvatarLoading(true);
    try {
      const response = await axios.post(`${API_URL}/usuarios/me/foto`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newPhotoUrl = response.data.foto_url;
      setUser(prev => ({ ...prev, foto_url: newPhotoUrl }));
      toast.success('Foto de perfil atualizada com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    } finally {
      setIsAvatarLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8">
      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        <span>Configurações</span>
        <ChevronRight size={14} />
        <span className="text-[#003366]">Meu Perfil</span>
      </div>

      <h1 className="text-2xl md:text-3xl font-black text-[#003366] tracking-tight uppercase">GERENCIAMENTO DE CONTA</h1>

      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col sm:flex-row items-center gap-6 md:gap-8 border border-gray-100">
        <div className="relative flex-none">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden shadow-inner border-2 border-white ring-4 ring-gray-50 flex items-center justify-center bg-gray-50">
             {isAvatarLoading ? (
               <Loader2 size={40} className="text-[#003366] animate-spin" />
             ) : (
               <img 
                 src={user?.foto_url ? `${API_URL}${user.foto_url}` : "https://github.com/shadcn.png"} 
                 alt="Profile" 
                 className="w-full h-full object-cover" 
               />
             )}
          </div>
          <button 
            onClick={() => setIsPhotoModalOpen(true)}
            className="absolute -right-2 -bottom-2 bg-[#003366] p-2 rounded-xl shadow-lg text-white hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isAvatarLoading}
          >
            <Camera size={18} />
          </button>
        </div>
        
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h2 className="text-xl md:text-2xl font-black text-[#003366] truncate">{formData.nome_completo}</h2>
          <p className="text-gray-400 font-bold text-xs md:text-sm uppercase tracking-wider">{formData.cargo}</p>
        </div>

        <div className="flex flex-col gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsPhotoModalOpen(true)}
            disabled={isAvatarLoading}
            className="bg-[#003366] text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#002244] transition-all shadow-lg shadow-blue-900/10 active:scale-95 disabled:opacity-50"
          >
            {isAvatarLoading ? 'Carregando...' : 'Alterar Foto'}
          </button>
          <button className="text-[#003366] font-bold text-xs uppercase tracking-widest hover:underline">
            Log de Atividade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-100 transition-all flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-50 rounded-lg text-[#003366]">
              <UserPlus size={20} />
            </div>
            <h3 className="text-lg font-black text-[#003366] uppercase tracking-tight">Informações Pessoais</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6 flex-1">
            <div className="sm:col-span-1">
              <InputField label="Nome Completo" value={formData.nome_completo} field="nome_completo" onChange={handleInputChange} />
            </div>
            <div className="sm:col-span-1">
              <InputField label="E-mail Corporativo" value={formData.email} field="email" type="email" onChange={handleInputChange} />
            </div>
            <div className="sm:col-span-1">
              <InputField label="Telefone" value={formData.telefone} field="telefone" onChange={handleInputChange} />
            </div>
            <div className="sm:col-span-1">
              <InputField label="ID do Funcionário" value={formData.id_funcionario} field="id_funcionario" onChange={handleInputChange} />
            </div>
            <div className="sm:col-span-1">
              <InputField label="Departamento" value={formData.departamento} field="departamento" isSelect onChange={handleInputChange} />
            </div>
            <div className="sm:col-span-1">
              <InputField label="Cargo" value={formData.cargo} field="cargo" onChange={handleInputChange} />
            </div>
          </div>

          <button 
            onClick={handleProfileSubmit}
            disabled={loading}
            className={`mt-8 w-full sm:w-auto self-end bg-[#003366] text-white px-8 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/10 ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#002244] active:scale-95'
            }`}
          >
            {loading ? 'SALVANDO...' : 'SALVAR INFORMAÇÕES'}
          </button>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 hover:border-blue-100 transition-all flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-50 rounded-lg text-[#003366]">
              <Lock size={20} />
            </div>
            <h3 className="text-lg font-black text-[#003366] uppercase tracking-tight">Altere sua senha</h3>
          </div>
          
          <div className="flex flex-col gap-6 flex-1">
            <PasswordInputField label="Senha Atual" field="senha_atual" value={passwordData.senha_atual} onChange={handlePasswordInputChange} error={passwordErrors.senha_atual} />
            <PasswordInputField label="Nova Senha" field="nova_senha" value={passwordData.nova_senha} onChange={handlePasswordInputChange} error={passwordErrors.nova_senha} />
            <PasswordInputField label="Confirmar Nova Senha" field="confirmar_senha" value={passwordData.confirmar_senha} onChange={handlePasswordInputChange} error={passwordErrors.confirmar_senha} />
          </div>

          <button 
            onClick={handlePasswordChange}
            disabled={passLoading || Object.keys(passwordErrors).length > 0 || !passwordData.senha_atual}
            className={`mt-8 w-full bg-[#003366] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/10 ${
              (passLoading || Object.keys(passwordErrors).length > 0 || !passwordData.senha_atual) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#002244] active:scale-95'
            }`}
          >
            {passLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'ATUALIZAR SENHA'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-50 rounded-lg text-[#003366]">
            <Bell size={20} />
          </div>
          <h3 className="text-lg font-black text-[#003366] uppercase tracking-tight">Preferências de Notificação</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { id: 'email', title: 'Alertas de E-mail', desc: 'Relatórios semanais.', icon: Mail },
            { id: 'sms', title: 'Alertas de SMS', desc: 'Apenas emergências.', icon: Smartphone },
            { id: 'system', title: 'Sistema', desc: 'Alertas em tempo real.', icon: Monitor },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-[#003366] flex-none">
                  <item.icon size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-black text-[#003366] text-[11px] uppercase tracking-wider truncate">{item.title}</h4>
                  <p className="text-[10px] text-gray-400 font-bold truncate">{item.desc}</p>
                </div>
              </div>
              <Toggle 
                active={notifications[item.id]} 
                onClick={() => toggleNotification(item.id)} 
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 pt-8 gap-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-gray-100 text-[#003366] px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all border border-gray-200/50 active:scale-95"
        >
          Novo Usuário
        </button>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={handleNotificationsSubmit}
            disabled={loading}
            className={`w-full sm:w-auto bg-[#003366] text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-900/10 ${
              loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#002244] active:scale-95'
            }`}
          >
            {loading ? 'SALVANDO...' : 'SALVAR PREFERÊNCIAS'}
          </button>
        </div>
      </div>
      <AddUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <ProfilePhotoModal 
        isOpen={isPhotoModalOpen} 
        onClose={() => setIsPhotoModalOpen(false)} 
        onConfirm={handlePhotoConfirm}
      />
    </div>
  );
};

export default UserProfile;
