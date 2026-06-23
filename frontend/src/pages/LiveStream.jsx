import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  LayoutGrid, 
  Target, 
  AlertTriangle,
  UserCheck,
  Eye,
  ChevronRight,
  Menu,
  VideoOff,
  Loader2,
  Search,
  Radio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const CameraFeed = ({ id, location, rtsp, dbId }) => {
  const [streamUrl, setStreamUrl] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { token } = useAuth();
  const cidRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    let heartbeatInterval = null;

    const startCamera = async () => {
      if (!rtsp || !token) return;
      
      setIsConnecting(true);
      try {
        const res = await axios.post(`${API_URL}/cameras/test`, { url: rtsp, camera_db_id: dbId });
        
        if (!isMountedRef.current) {
          const stopUrl = `${API_URL}/cameras/${res.data.camera_id}/stream/stop?token=${token}`;
          navigator.sendBeacon(stopUrl);
          return;
        }

        const cid = res.data.camera_id;
        cidRef.current = cid;
        
        const urlWithToken = `${res.data.stream_url}?token=${token}&t=${Date.now()}&fps=12&width=480&quality=45`;
        setStreamUrl(urlWithToken);

        heartbeatInterval = setInterval(() => {
          axios.get(`${API_URL}/cameras/${cid}/stream/heartbeat?token=${token}`).catch(() => {});
        }, 5000);

      } catch (err) {
        if (isMountedRef.current) console.error(`Error connecting to camera ${id}:`, err);
      } finally {
        if (isMountedRef.current) setIsConnecting(false);
      }
    };

    startCamera();

    return () => { 
      isMountedRef.current = false; 
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (cidRef.current) {
        const stopUrl = `${API_URL}/cameras/${cidRef.current}/stream/stop?token=${token}`;
        navigator.sendBeacon(stopUrl);
        cidRef.current = null;
      }
    };
  }, [rtsp, id, token, dbId]);

  return (
    <div className="relative aspect-video rounded-3xl overflow-hidden group shadow-sm border border-gray-100 bg-slate-950">
      <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/90 to-transparent z-10 flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)] ${streamUrl ? 'bg-red-500' : 'bg-slate-600'}`}></div>
        <span className="text-[11px] font-extrabold text-white uppercase tracking-[0.2em] drop-shadow-lg">
          CAM {id} <span className="mx-1.5 text-white/30">|</span> {location}
        </span>
      </div>

      <div className="w-full h-full relative flex items-center justify-center">
        {streamUrl ? (
          <img 
            src={streamUrl} 
            alt={`Feed ${location}`} 
            className="w-full h-full object-cover"
            onError={() => setStreamUrl(null)}
          />
        ) : isConnecting ? (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <Loader2 className="animate-spin" size={28} />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.25em]">Sincronizando...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <VideoOff size={28} />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.25em]">Sinal Interrompido</span>
          </div>
        )}
      </div>
    </div>
  );
};

const AlertCard = ({ id, type, user, timestamp, detail, screenshot, onShowScreenshot }) => {
  const isCritical = type === 'violation';
  
  return (
    <div 
      onClick={() => screenshot && onShowScreenshot(screenshot)}
      className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 hover:shadow-md transition-all cursor-pointer group active:scale-[0.98] relative overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-50 overflow-hidden border border-slate-100 group-hover:border-blue-200 transition-colors shadow-inner">
            {user.referenceImage ? (
              <img 
                src={user.referenceImage} 
                alt={user.name} 
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : user.image ? (
              <img 
                src={user.image} 
                alt={user.name} 
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <UserCheck size={20} />
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[12px] font-black text-[#003366] leading-tight truncate uppercase tracking-tight">{user.name}</span>
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">{user.role}</span>
          </div>
        </div>
        <span className="text-[10px] text-[#003366] font-black tracking-widest whitespace-nowrap bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-sm">{timestamp}</span>
      </div>

      <div className={`p-4 rounded-2xl border flex items-start gap-3 transition-colors relative z-10 ${
        isCritical 
          ? 'bg-red-50 border-red-100 text-red-700' 
          : 'bg-blue-50 border-blue-100 text-[#003366]'
      }`}>
        <div className="mt-0.5 flex-none">
          {isCritical ? <AlertTriangle size={18} className="stroke-[2.5]" /> : <UserCheck size={18} className="stroke-[2.5]" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">
              {isCritical ? 'Violação de EPI' : 'Acesso Autorizado'}
            </h4>
            {screenshot && (
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <Eye size={12} className="stroke-[2.5]" />
                <span className="text-[9px] font-black uppercase tracking-widest">Detalhes</span>
              </div>
            )}
          </div>
          <p className="text-[12px] font-black leading-relaxed">
            {detail}
          </p>
        </div>
      </div>
      
      <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none">
        {isCritical ? <AlertTriangle size={80} /> : <UserCheck size={80} />}
      </div>
    </div>
  );
};

const LiveStream = () => {
  const [viewMode, setViewMode] = useState('2x2');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [realAlerts, setRealAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const fetchCameras = async () => {
      try {
        const res = await axios.get(`${API_URL}/cameras`);
        if (isMounted) {
          const onlyActive = res.data.filter(c => c.status === 'ativa');
          setCameras(onlyActive);
        }
      } catch (err) {
        console.error("Erro ao buscar câmeras:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchCameras();

    return () => {
      isMounted = false;
    };
  }, []);

  const camerasFiltradas = cameras.filter(c => {
    const termo = filtro.toLowerCase().trim();
    if (!termo) return true;
    return c.nome.toLowerCase().includes(termo);
  });

  useEffect(() => {
    const controller = new AbortController();
    const fetchAlerts = async () => {
      try {
        const res = await axios.get(`${API_URL}/eventos?limit=10`, { signal: controller.signal });
        setRealAlerts(res.data.map(e => ({
          id: e.id,
          type: e.violacao ? 'violation' : 'recognition',
          timestamp: e.timestamp,
          screenshot: e.screenshot ? `${API_URL}${e.screenshot}` : null,
          user: { 
            name: e.colaborador || 'Desconhecido', 
            role: e.cargo || (e.colaborador ? 'Funcionário' : 'Não Identificado'), 
            image: e.miniatura ? `${API_URL}${e.miniatura}` : '',
            referenceImage: e.foto_referencia ? `${API_URL}${e.foto_referencia}?token=${token}` : ''
          },
          detail: e.violacao 
            ? `${e.violacao} detectado em ${e.camera} (${e.setor}).`
            : `Identificado em ${e.camera} (${e.setor}).`
        })));
      } catch (err) {
        if (!axios.isCancel(err)) {
          console.error("Erro ao buscar eventos:", err);
        }
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, [token]);

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa]">
      {selectedScreenshot && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-md transition-all animate-in fade-in duration-300"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-5xl w-full bg-[#001122] rounded-3xl overflow-hidden shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="absolute top-6 right-6 z-10">
              <button 
                onClick={() => setSelectedScreenshot(null)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full backdrop-blur-xl transition-all"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            <div className="p-2 md:p-4">
               <img 
                 src={selectedScreenshot} 
                 alt="Captura da Detecção" 
                 className="w-full h-auto rounded-2xl shadow-inner border border-white/5"
               />
               <div className="mt-4 px-4 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest">Screenshot da Detecção</h3>
                    <p className="text-white/40 text-[10px] font-bold uppercase mt-1">Evidência registrada em tempo real pelo sistema de IA</p>
                  </div>
                  <button 
                    onClick={() => window.open(selectedScreenshot, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter shadow-lg shadow-blue-600/20"
                  >
                    Baixar Original
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
      <div className="px-4 md:px-8 py-5 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="hidden lg:flex flex-col">
              <h2 className="text-xl font-extrabold text-[#003366] uppercase tracking-tighter leading-none flex items-center gap-3">
                Transmissão ao Vivo
              </h2>
           </div>
           <button 
             onClick={() => setIsSidebarOpen(true)}
             className="xl:hidden p-2.5 bg-blue-50 text-[#003366] rounded-2xl border border-blue-100 flex items-center gap-2 transition-all active:scale-95"
           >
              <Menu size={18} />
              <span className="text-[10px] font-extrabold uppercase tracking-widest">Alertas IA</span>
           </button>
        </div>
        
        <div className="flex bg-slate-50 rounded-2xl p-1.5 border border-slate-100 shadow-inner">
          <button 
            onClick={() => setViewMode('2x2')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all tracking-widest ${
              viewMode === '2x2' ? 'bg-white text-[#003366] shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutGrid size={14} /> 2×2
          </button>
          <button 
            onClick={() => setViewMode('focus')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all tracking-widest ${
              viewMode === 'focus' ? 'bg-white text-[#003366] shadow-md scale-105' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Target size={14} /> FOCO
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-[#f8f9fa] scrollbar-thin scrollbar-thumb-slate-200">
          <div className="hidden lg:flex items-center justify-between mb-8 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-xl text-red-600 animate-pulse border border-red-100 shadow-sm">
                <Radio size={20} />
              </div>
              <h3 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Ao Vivo</h3>
            </div>
            
            <div className="flex-1 max-w-md relative">
               <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Buscar câmera por nome..." 
                 value={filtro}
                 onChange={(e) => setFiltro(e.target.value)}
                 className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold text-[#003366] outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all shadow-sm"
               />
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="animate-spin text-[#003366]" size={48} />
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.3em] animate-pulse">Sincronizando Mosaico...</span>
            </div>
          ) : camerasFiltradas.length > 0 ? (
            <div className={`grid gap-6 md:gap-8 ${viewMode === '2x2' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-5xl mx-auto'}`}>
              {camerasFiltradas.map((cam, idx) => (
                <CameraFeed 
                  key={cam.id} 
                  id={String(idx + 1).padStart(2, '0')} 
                  location={cam.nome.toUpperCase()} 
                  rtsp={cam.rtsp}
                  dbId={cam.id}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-inner">
               <div className="p-6 bg-slate-50 rounded-full mb-6">
                 <VideoOff className="text-slate-300" size={56} />
               </div>
               <p className="text-sm font-extrabold text-slate-400 uppercase tracking-[0.2em]">Nenhuma câmera encontrada</p>
               <p className="text-xs text-slate-300 font-bold mt-3 uppercase tracking-widest">Ajuste os filtros de busca</p>
            </div>
          )}
        </div>

        {isSidebarOpen && (
          <div 
            className="xl:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 transition-all"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed xl:relative inset-y-0 right-0 w-full max-w-[420px] bg-white xl:bg-white z-40
          transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'}
          transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          flex flex-col shadow-2xl xl:shadow-none border-l border-slate-100
        `}>
          <div className="p-8 border-b border-slate-50 flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="text-orange-500" size={18} />
                <h3 className="text-lg font-extrabold text-[#003366] uppercase tracking-tight">Ocorrências</h3>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-orange-50 text-orange-600 text-[9px] font-extrabold px-3 py-1.5 rounded-full tracking-widest uppercase animate-pulse border border-orange-100 shadow-sm">
                Live
              </span>
              <button onClick={() => setIsSidebarOpen(false)} className="xl:hidden p-2 bg-slate-50 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                 <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-100">
            {realAlerts.length > 0 ? (
              realAlerts.map((alert) => (
                <AlertCard 
                  key={alert.id} 
                  {...alert} 
                  onShowScreenshot={(url) => setSelectedScreenshot(url)} 
                />
              ))
            ) : (
              <div className="text-center py-20 flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-slate-200" size={32} />
                <p className="text-[10px] font-extrabold text-slate-300 uppercase tracking-widest">Aguardando novos eventos...</p>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-slate-50 bg-slate-50/50">
            <button className="w-full py-4 bg-[#003366] text-white rounded-3xl text-[10px] font-extrabold uppercase tracking-[0.25em] hover:bg-[#002244] transition-all shadow-xl shadow-blue-900/20 active:scale-95 border-b-4 border-blue-900">
              Histórico de Segurança
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LiveStream;
