import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  Video,
  Search
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const Cameras = () => {
  const navigate = useNavigate();
  const [cameras, setCameras] = useState([]);
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("Todos os Setores");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [camRes, setRes] = await Promise.all([
        axios.get(`${API_URL}/cameras`),
        axios.get(`${API_URL}/setores`)
      ]);
      setCameras(camRes.data);
      setSetores(setRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const camerasFiltradas = cameras.filter(c => {
    const termo = filtro.toLowerCase().trim();
    const matchSetor = filtroSetor === "Todos os Setores" || c.setor === filtroSetor;
    
    if (!termo) return matchSetor;
    
    const nome = String(c.nome || "").toLowerCase();
    const rtsp = String(c.rtsp || "").toLowerCase();
    const fabricante = String(c.fabricante || "").toLowerCase();
    
    let matchBusca = false;
    if (termo.length <= 2) {
      matchBusca = nome.includes(termo) || fabricante.includes(termo);
    } else {
      matchBusca = nome.includes(termo) || rtsp.includes(termo) || fabricante.includes(termo);
    }
    
    return matchBusca && matchSetor;
  });

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir esta câmera?")) return;
    try {
      await axios.delete(`${API_URL}/cameras/${id}`);
      toast.success("Câmera excluída.");
      fetchData();
    } catch (error) {
      toast.error("Erro ao excluir.");
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 min-h-full">
      {/* Page Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl md:text-3xl font-black text-[#003366] tracking-tight uppercase">GERENCIAMENTO DE DISPOSITIVOS</h1>
          <button 
            onClick={() => navigate('/cameras/new')}
            className="w-full sm:w-auto bg-[#003366] text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#002244] transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-95"
          >
            <Plus size={18} />
            Adicionar Nova Câmera
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex-1 relative">
             <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
             <input 
               type="text" 
               placeholder="Buscar por nome ou link RTSP..." 
               value={filtro}
               onChange={(e) => setFiltro(e.target.value)}
               className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all"
             />
          </div>
          <select 
            value={filtroSetor}
            onChange={(e) => setFiltroSetor(e.target.value)}
            className="bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all min-w-[200px]"
          >
            <option value="Todos os Setores">Todos os Setores</option>
            {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
          </select>
        </div>
      </div>

   
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="bg-gray-50/50 text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <th className="px-8 py-6">Dispositivo</th>
                <th className="px-8 py-6">Setor Responsável</th>
                <th className="px-8 py-6">Conexão IP/RTSP</th>
                <th className="px-8 py-6 text-center">Status</th>
                <th className="px-8 py-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">Carregando...</td>
                </tr>
              ) : camerasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum dispositivo encontrado</td>
                </tr>
              ) : camerasFiltradas.map((cam) => (
                <tr key={cam.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#003366] border border-gray-100">
                        <Video size={28} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-base font-black text-[#003366]">{cam.nome}</span>
                        <span className="text-xs text-gray-400 font-bold uppercase">{cam.fabricante || 'N/A'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-base font-black text-gray-700">{cam.setor || 'Sem setor'}</span>
                  </td>
                  <td className="px-8 py-6">
                    <code className="text-xs font-bold text-blue-600 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100/50 italic">
                      {cam.rtsp}
                    </code>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase ${cam.status === 'ativa' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                      <span className={`w-2.5 h-2.5 rounded-full ${cam.status === 'ativa' ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                      {cam.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="p-2 text-gray-400 hover:text-[#003366] transition-all" onClick={() => navigate(`/cameras/edit/${cam.id}`)}><Edit3 size={20} /></button>
                      <button className="p-2 text-gray-400 hover:text-red-600 transition-all" onClick={() => handleDelete(cam.id)}><Trash2 size={20} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Cameras;
