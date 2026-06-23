import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { 
  ChevronRight, 
  Settings, 
  MapPin, 
  Link as LinkIcon, 
  Clock, 
  Calendar,
  VideoOff,
  ArrowLeft,
  Wifi,
  CheckCircle,
  AlertCircle,
  Cpu,
  Building2,
  Activity,
  Power
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const CameraForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [opMode, setOpMode] = useState('continuo');
  const [nome, setNome] = useState("");
  const [fabricante, setFabricante] = useState("");
  const [setorId, setSetorId] = useState("");
  const [rtspUrl, setRtspUrl] = useState("");
  const [status, setStatus] = useState('ativa'); // 'ativa' ou 'offline'
  const [inicioOperacao, setInicioOperacao] = useState("08:00");
  const [fimOperacao, setFimOperacao] = useState("18:00");
  
  const [setores, setSetores] = useState([]);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // 'idle', 'testing', 'success', 'error'
  const [streamUrl, setStreamUrl] = useState(null);
  const currentCidRef = useRef(null);

  const { token } = useAuth();

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handleTestConnection = useCallback(async (manual = true) => {
    // RTSP/RTMP
    const isValidSource = rtspUrl && (rtspUrl.startsWith('rtsp://') || rtspUrl.startsWith('rtmp://') || /^\d+$/.test(rtspUrl));
    
    if (!isValidSource) {
      if (manual) toast.warn("Informe um link de stream válido (RTSP/RTMP) ou índice da webcam (ex: 0).");
      return;
    }
    
    setIsTesting(true);
    setConnectionStatus('testing');
    
    try {
      const res = await axios.post(`${API_URL}/cameras/test`, { url: rtspUrl });
      const cid = res.data.camera_id;
      
      if (isMountedRef.current) {
        currentCidRef.current = cid;
        const urlWithToken = `${res.data.stream_url}?token=${token}&t=${Date.now()}`;
        setStreamUrl(urlWithToken);
        setConnectionStatus('success');
        if (manual) toast.success("Câmera conectada com sucesso!");
      } else {
        const stopUrl = `${API_URL}/cameras/${cid}/stream/stop?token=${token}`;
        navigator.sendBeacon(stopUrl);
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error("Erro ao testar câmera:", err);
        setConnectionStatus('error');
        setStreamUrl(null);
        currentCidRef.current = null;
        if (manual) toast.error("Falha ao conectar à câmera.");
      }
    } finally {
      if (isMountedRef.current) setIsTesting(false);
    }
  }, [rtspUrl, token]);

  useEffect(() => {
    let interval = null;
    if (streamUrl && currentCidRef.current && token) {
      interval = setInterval(() => {
        axios.get(`${API_URL}/cameras/${currentCidRef.current}/stream/heartbeat?token=${token}`).catch(() => {});
      }, 5000);
    }
    return () => { 
      if (interval) clearInterval(interval); 
    };
  }, [streamUrl, token]);

  useEffect(() => {
    if (isEdit && rtspUrl && !streamUrl && connectionStatus === null) {
      handleTestConnection(false);
    }
  }, [isEdit, rtspUrl, streamUrl, connectionStatus, handleTestConnection]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const setoresRes = await axios.get(`${API_URL}/setores`);
        if (isMounted) {
          setSetores(setoresRes.data);
          
          if (isEdit) {
            const camRes = await axios.get(`${API_URL}/cameras/${id}`);
            const cam = camRes.data;
            setNome(cam.nome);
            setFabricante(cam.fabricante || "");
            setSetorId(cam.setor_id);
            setRtspUrl(cam.link_rtsp);
            setOpMode(cam.modo_operacao);
            setStatus(cam.status || 'ativa');
            if (cam.inicio_operacao) setInicioOperacao(cam.inicio_operacao);
            if (cam.fim_operacao) setFimOperacao(cam.fim_operacao);
          } else if (setoresRes.data.length > 0) {
            setSetorId(setoresRes.data[0].id);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        if (isMounted) toast.error("Erro ao carregar informações da página.");
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [id, isEdit]);

  //PREVIEW QUANDO ATIVA CÂMERA
  useEffect(() => {
    const isValidSource = rtspUrl && (rtspUrl.startsWith('rtsp://') || /^\d+$/.test(rtspUrl));
    if (status === 'ativa' && isValidSource && !streamUrl && !isTesting) {
      handleTestConnection(false);
    }
  }, [status, rtspUrl, streamUrl, isTesting, handleTestConnection]);

  // Cleanup effect to stop stream on unmount
  useEffect(() => {
    return () => {
      if (currentCidRef.current) {
        const stopUrl = `${API_URL}/cameras/${currentCidRef.current}/stream/stop?token=${token}`;
        navigator.sendBeacon(stopUrl);
        currentCidRef.current = null;
      }
    };
  }, [token]);

  const handleStatusToggle = () => {
    const newStatus = status === 'ativa' ? 'offline' : 'ativa';
    setStatus(newStatus);

    if (newStatus === 'offline') {
      setStreamUrl(null);
      setConnectionStatus(null);
    }

    if (isEdit && id) {
      axios.put(`${API_URL}/cameras/${id}`, {
        nome, fabricante, setor_id: setorId, link_rtsp: rtspUrl,
        modo_operacao: opMode, inicio_operacao, fim_operacao, status: newStatus
      }).then(() => {
        toast.info(`Câmera ${newStatus === 'ativa' ? 'ativada' : 'desativada'}.`);
      }).catch((err) => {
        console.warn("Status atualizado localmente. Sync com backend pendente:", err?.response?.status);
      });
    }
  };

  const handleSave = async () => {
    if (!nome || !rtspUrl || !setorId) {
      toast.warn("Preencha nome, link/índice e setor.");
      return;
    }
    try {
      const payload = { 
        nome, fabricante, setor_id: setorId, link_rtsp: rtspUrl, 
        modo_operacao: opMode,
        inicio_operacao: opMode === 'agendamento' ? inicioOperacao : null,
        fim_operacao: opMode === 'agendamento' ? fimOperacao : null,
        status
      };

      if (isEdit) {
        await axios.put(`${API_URL}/cameras/${id}`, payload);
        toast.success("Câmera atualizada!");
      } else {
        await axios.post(`${API_URL}/cameras`, payload);
        toast.success("Câmera cadastrada!");
      }
      navigate('/cameras');
    } catch (err) {
      console.error("Erro ao salvar câmera:", err);
      toast.error(isEdit ? "Erro ao atualizar." : "Erro ao salvar.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa]">
      <div className="px-4 md:px-8 py-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
            <span>Gestão de Dispositivos</span>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-[#003366]">{isEdit ? 'Editar Câmera' : 'Nova Câmera'}</span>
          </div>
          <h1 className="text-3xl font-black text-[#003366] tracking-tight">
            {isEdit ? 'Atualizar parâmetros' : 'Detalhes da câmera'}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end gap-1">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status da Conexão</span>
             <button 
               onClick={handleStatusToggle}
               className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl border-2 transition-all group ${
                 status === 'ativa' 
                   ? 'bg-emerald-50 border-emerald-500 text-emerald-600' 
                   : 'bg-gray-50 border-gray-200 text-gray-400'
               }`}
             >
               <Power size={18} className={status === 'ativa' ? 'animate-pulse' : ''} />
               <span className="font-black text-xs uppercase tracking-widest">
                 {status === 'ativa' ? 'Ativada' : 'Desativada'}
               </span>
               <div className={`w-10 h-5 rounded-full relative transition-colors ${status === 'ativa' ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${status === 'ativa' ? 'left-6' : 'left-1'}`}></div>
               </div>
             </button>
          </div>
          <button 
            onClick={() => navigate('/cameras')}
            className="flex items-center gap-2 text-gray-400 hover:text-[#003366] transition-colors font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col xl:flex-row gap-6 mx-auto w-full max-w-[1800px]">
        {/* Formulário */}
        <div className="flex-1 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 border-l-[6px] border-l-[#003366] w-full min-w-0">
          <div className="flex items-center gap-3 mb-8">
            <Settings className="text-[#003366]" size={24} />
            <h3 className="text-xl md:text-2xl font-black text-[#003366] uppercase tracking-tight">Parâmetros de Configuração</h3>
          </div>

          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nome da Câmera</label>
                <input 
                  type="text" 
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: CAM-WELD-04"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-semibold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Fabricante</label>
                <input 
                  type="text" 
                  value={fabricante}
                  onChange={(e) => setFabricante(e.target.value)}
                  placeholder="Ex: HIKVision"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-semibold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Setor Responsável</label>
              <select 
                value={setorId}
                onChange={(e) => setSetorId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-semibold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
              >
                {setores.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Link RTSP</label>
              <input 
                type="text" 
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                placeholder="rtsp://admin:senha@192.168.1.100:554/live"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-semibold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Modo de Operação</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={() => setOpMode('continuo')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    opMode === 'continuo' ? 'bg-blue-50 border-[#003366]' : 'bg-gray-50 border-transparent hover:border-gray-200'
                  }`}
                >
                  <Clock size={18} className={opMode === 'continuo' ? 'text-[#003366]' : 'text-gray-400'} />
                  <span className="text-xs font-black uppercase text-[#003366]">Contínuo</span>
                </button>
                <button 
                  onClick={() => setOpMode('agendamento')}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    opMode === 'agendamento' ? 'bg-blue-50 border-[#003366]' : 'bg-gray-50 border-transparent hover:border-gray-200'
                  }`}
                >
                  <Calendar size={18} className={opMode === 'agendamento' ? 'text-[#003366]' : 'text-gray-400'} />
                  <span className="text-xs font-black uppercase text-[#003366]">Agendado</span>
                </button>
              </div>
            </div>

            {opMode === 'agendamento' && (
              <div className="grid grid-cols-2 gap-4">
                <input type="time" value={inicioOperacao} onChange={(e) => setInicioOperacao(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm" />
                <input type="time" value={fimOperacao} onChange={(e) => setFimOperacao(e.target.value)} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm" />
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="w-full xl:w-[600px] flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Preview</h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connectionStatus === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                <span className="text-[10px] font-black uppercase">{connectionStatus === 'success' ? 'Online' : 'Offline'}</span>
              </div>
            </div>

            <div className="aspect-video bg-[#0a0a0a] rounded-2xl overflow-hidden flex items-center justify-center relative border border-black/50">
              {streamUrl && status === 'ativa' ? (
                <img src={streamUrl} className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-white/40">
                  <VideoOff size={32} />
                  <button onClick={() => handleTestConnection(true)} className="text-[10px] font-black uppercase px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-all">Testar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto bg-white border-t border-gray-100 p-6 flex flex-col sm:flex-row items-center justify-end gap-6 sticky bottom-0 z-20">
        <button 
          onClick={() => navigate('/cameras')}
          className="text-sm font-black text-gray-400 hover:text-gray-600 uppercase tracking-[0.2em] transition-colors py-2"
        >
          Cancelar
        </button>
        <button 
          onClick={handleSave}
          className="w-full sm:w-auto bg-[#003366] text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-[#002244] transition-all shadow-xl shadow-blue-900/20 active:scale-95"
        >
          {isEdit ? 'Atualizar Câmera' : 'Salvar Câmera'}
        </button>
      </div>
    </div>
  );
};

export default CameraForm;
