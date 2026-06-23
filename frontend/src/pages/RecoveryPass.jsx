import { useState } from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import logoMain from '../assets/logo-main.png';

const RecoveryPass = () => {
  const [email, setEmail] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md my-auto">
        <div className="flex flex-col items-center mb-10">
          <img src={logoMain} alt="Real Intelligence Logo" className="h-32 object-contain mb-6" />
          <h2 className="text-2xl font-bold text-[#003366]">Recuperar Senha</h2>
          <p className="text-gray-400 text-sm text-center mt-2 px-4 font-medium">
            Insira seu e-mail para receber as instruções de recuperação.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 tracking-wider uppercase">E-MAIL</label>
            <div className="relative">
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="nome@empresa.com.br"
                className="w-full bg-gray-100 border-none rounded-lg py-3 pl-4 pr-10 text-sm focus:ring-2 focus:ring-[#003366] outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#003366] text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-[#002244] transition-all transform hover:scale-[1.01] active:scale-95 shadow-lg shadow-blue-900/20"
          >
            ENVIAR LINK
            <Send size={18} />
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link to="/login" className="text-[#003366] font-bold text-sm flex items-center justify-center gap-2 hover:underline">
            <ArrowLeft size={16} />
            Voltar para o Login
          </Link>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 bg-[#003366] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-900/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#003366] mb-2">E-mail Enviado!</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Enviamos as instruções de recuperação para o seu e-mail corporativo. Por favor, verifique sua caixa de entrada.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-[#003366] text-white font-bold py-3 rounded-lg hover:bg-[#002244] transition-colors uppercase tracking-wider text-xs"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      <div className="mt-auto py-6 w-full max-w-6xl flex flex-col md:flex-row justify-between items-center text-[10px] text-gray-400 font-bold tracking-widest uppercase px-4">
        <div>© 2026 - REAL INTELLIGENCE.</div>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-gray-600 transition-colors">POLITICA DE PRIVACIDADE</a>
          <a href="#" className="hover:text-gray-600 transition-colors">TERMOS DE SERVIÇO</a>
        </div>
      </div>
    </div>
  );
};

export default RecoveryPass;
