import { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Video, 
  UserPlus, 
  Camera, 
  FileText,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  AlertTriangle,
  UserCheck,
  Clock
} from 'lucide-react';
import logoMain from '../assets/logo-main.png';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const SidebarItem = ({ icon: Icon, label, active = false, to, onClick }) => {
  const content = (
    <div className={`flex items-center gap-3 px-6 py-4 cursor-pointer transition-all border-r-4 ${
      active 
        ? 'bg-blue-50 text-[#003366] border-[#003366]' 
        : 'text-gray-500 border-transparent hover:bg-gray-50 hover:text-[#003366]'
    }`}>
      <Icon size={20} />
      <span className="font-semibold text-sm">{label}</span>
    </div>
  );

  return <Link to={to} onClick={onClick}>{content}</Link>;
};

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { notifications, unreadCount, clearUnread } = useNotifications();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (!isNotificationsOpen) {
      clearUnread();
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Painel de Controle', to: '/dashboard' },
    { icon: Video, label: 'Transmissão ao Vivo', to: '/live' },
    { icon: UserPlus, label: 'Cadastro de Faces', to: '/faces' },
    { icon: Camera, label: 'Cadastro de Câmeras', to: '/cameras' },
    { icon: FileText, label: 'Relatórios de Gerenciamento', to: '/reports' },
    { icon: Settings, label: 'Configurações', to: '/profile' },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800 font-sans relative">
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      <aside className={`
        w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full z-40 transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-4 flex justify-between items-center border-b border-gray-50 lg:justify-center">
          <Link to="/dashboard" onClick={closeMobileMenu} className="block transition-transform active:scale-95">
            <img src={logoMain} alt="Logo" className="h-16 lg:h-20 w-auto lg:w-full object-contain" />
          </Link>
          <button onClick={closeMobileMenu} className="lg:hidden p-2 text-gray-400">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 flex flex-col pt-4">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.to}
              icon={item.icon} 
              label={item.label} 
              to={item.to}
              active={location.pathname === item.to}
              onClick={closeMobileMenu}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 mt-auto bg-white">
          <Link to="/profile" onClick={closeMobileMenu} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-xl transition-all group">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden ring-2 ring-transparent group-hover:ring-[#003366] transition-all">
              <img 
                src={user?.foto_url ? `${API_URL}${user.foto_url}` : "https://github.com/shadcn.png"} 
                alt="Profile" 
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            </div>
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-bold text-sm text-[#003366] truncate w-32">
                {user?.nome || 'Usuário'}
              </span>
              <span className="text-[9px] text-gray-400 font-bold uppercase truncate">
                {user?.cargo || 'Cargo'}
              </span>
            </div>
          </Link>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col w-full min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between lg:justify-end px-4 md:px-8 sticky top-0 z-[100]">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-[#003366] hover:bg-blue-50 rounded-lg transition-all"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={handleOpenNotifications}
                className="p-2.5 text-gray-400 hover:text-[#003366] hover:bg-slate-50 rounded-2xl transition-all relative group shadow-sm border border-transparent hover:border-slate-100"
              >        
                <Bell size={20} className={unreadCount > 0 ? "animate-swing" : ""} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-red-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce-subtle">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-[110] animate-in fade-in zoom-in duration-200 origin-top-right">
                  <div className="p-5 border-b border-slate-50 bg-[#003366] flex items-center justify-between">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-400" />
                      Alertas de Segurança
                    </h3>
                    <span className="text-[10px] font-black text-white/50 uppercase">Tempo Real</span>
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-100">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div 
                          key={notif.id} 
                          onClick={() => {
                            setIsNotificationsOpen(false);
                            navigate('/reports');
                          }}
                          className="p-4 border-b border-slate-50 hover:bg-blue-50/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl flex-none ${notif.violacao ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {notif.violacao ? <AlertTriangle size={16} /> : <UserCheck size={16} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-black text-[#003366] uppercase tracking-tighter truncate">
                                  {notif.camera}
                                </span>
                                <span className="text-[9px] font-bold text-slate-300 flex items-center gap-1">
                                  <Clock size={10} /> {notif.timestamp}
                                </span>
                              </div>
                              <p className="text-[11px] font-bold text-slate-600 leading-relaxed line-clamp-2">
                                {notif.violacao ? `${notif.violacao} detectado.` : 'Acesso identificado e seguro.'}
                                <span className="text-[#003366] ml-1 opacity-0 group-hover:opacity-100 transition-opacity">Ver detalhes →</span>
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {notif.colaborador || (notif.status === 'desconhecido' ? 'Pessoa Desconhecida' : 'Não Identificado')}
                                </span>
                                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">ID: {notif.id.split('-')[0]}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-300 gap-3">
                        <Bell size={32} className="opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Sem novas notificações</p>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      navigate('/reports');
                    }}
                    className="w-full p-4 bg-slate-50 text-[#003366] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-100 transition-colors border-t border-slate-100"
                  >
                    Ver Histórico Completo
                  </button>
                </div>
              )}
            </div>

            <div className="h-6 w-[1px] bg-gray-200 mx-1 md:mx-2"></div>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all group"
            >
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Sair</span>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
