import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import logoMain from '../assets/logo-main.png';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('O campo de e-mail é obrigatório.');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Insira um e-mail válido (ex: nome@empresa.com)');
      return;
    }

    if (!password) {
      toast.error('O campo de senha é obrigatório.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await login(email, password);
      
      if (result.success) {
        toast.success('Acesso validado! Entrando...');
        navigate('/dashboard');
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Erro inesperado ao realizar login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center p-4">
      <div className="flex-grow flex items-center justify-center w-full py-10">
        <div className="bg-white w-full max-w-[440px] rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] p-10 md:p-14 flex flex-col items-center">
          <div className="mb-4">
            <img src={logoMain} alt="Real Intelligence Logo" className="h-32 object-contain" />
          </div>

          <h2 className="text-2xl font-bold text-[#002B5B] mb-10">Acesso ao Sistema</h2>

          <form onSubmit={handleSubmit} className="w-full space-y-7" noValidate>
            {/* Email Field */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Mail size={20} />
                </span>
                <input
                  type="email"
                  placeholder="nome@empresa.com.br"
                  className="w-full bg-[#e9ecef] border-none rounded-sm py-4 pl-12 pr-4 text-base font-medium text-[#002B5B] focus:ring-1 focus:ring-gray-300 outline-none transition-all placeholder:text-gray-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Senha</label>
                <Link to="/request-password-reset" className="text-xs font-bold text-[#002B5B] hover:underline">Esqueceu a senha?</Link>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                  <Lock size={20} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-[#e9ecef] border-none rounded-sm py-4 pl-12 pr-12 text-base font-medium text-[#002B5B] focus:ring-1 focus:ring-gray-300 outline-none transition-all placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#002B5B] transition-colors p-1"
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>


            <div className="flex items-center px-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded-sm border-gray-300 bg-gray-100 text-[#003366] focus:ring-[#003366] cursor-pointer"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="text-sm text-gray-500 font-semibold">
                  Lembrar neste dispositivo
                </span>
              </label>
            </div>


            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-[#003366] text-white font-extrabold text-lg py-4 rounded-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-lg shadow-blue-900/10 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#002244]'}`}
            >
              {isSubmitting ? 'VALIDANDO...' : 'ENTRAR'}
              {!isSubmitting && <ArrowRight size={22} />}
            </button>
          </form>
        </div>
      </div>


      <footer className="w-full py-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 font-bold uppercase tracking-[0.2em] px-10 gap-4 md:gap-0">
        <div>© 2026 - REAL INTELLIGENCE.</div>
        <div className="flex gap-10">
          <a href="#" className="hover:text-gray-600 transition-colors">Politica de Privacidade</a>
          <a href="#" className="hover:text-gray-600 transition-colors">Termos de Serviço</a>
        </div>
      </footer>
    </div>
  );
};

export default Login;
