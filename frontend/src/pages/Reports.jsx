import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart2, 
  AlertTriangle, 
  UserCheck, 
  Calendar, 
  ChevronDown, 
  Eye, 
  Download,
  VideoOff,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  MapPin,
  Clock,
  LayoutGrid,
  FileText,
  Search,
  ShieldAlert,
  Video as VideoIcon
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { format, subDays } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const StatCard = ({ icon: Icon, label, value, badge, badgeColor, iconColor, trend }) => (
  <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative overflow-hidden group hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-2xl bg-slate-50 ${iconColor} group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      {badge && (
        <div className="flex flex-col items-end">
          <span className={`font-bold text-xs ${badgeColor} flex items-center gap-1 tracking-tight`}>
            {trend === 'up' ? <TrendingUp size={12} /> : null}
            {badge}
          </span>
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest opacity-80">vs período</span>
        </div>
      )}
    </div>
    <div>
      <p className="text-[11px] text-slate-500 uppercase font-extrabold tracking-[0.15em] mb-1.5">{label}</p>
      <h3 className="text-3xl font-extrabold text-[#003366] tracking-tighter leading-none truncate pr-2">
        {value}
      </h3>
    </div>
    <div className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
      <Icon size={120} />
    </div>
  </div>
);

const FilterSelect = ({ options, value, onChange, icon: Icon }) => (
  <div className="flex-1 relative">
    <Icon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <select 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-50 border-none rounded-xl pl-10 pr-4 py-3 text-sm font-bold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
  </div>
);

const CustomBarChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.valor), 1);
  
  return (
    <div className="w-full h-full flex flex-col justify-end gap-2 pt-4">
      <div className="flex-1 flex items-end justify-around gap-4 h-[250px]">
        {data.map((item, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
            <div className="relative w-full flex justify-center items-end h-full">
              <div 
                className="w-full max-w-[40px] bg-[#003366] rounded-t-lg transition-all duration-1000 ease-out group-hover:bg-blue-500 cursor-help relative"
                style={{ height: `${(item.valor / maxVal) * 100}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {item.valor} ocorrências
                </div>
              </div>
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter text-center w-full truncate">
              {item.name}
            </span>
          </div>
        ))}
      </div>
      <div className="h-[1px] bg-slate-100 w-full mt-2"></div>
    </div>
  );
};

const CustomPieChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const total = data.reduce((acc, curr) => acc + curr.valor, 0);
  const COLORS = ['#003366', '#0066CC', '#3399FF', '#99CCFF', '#CCE5FF'];
  
  if (total === 0) return null;

  // Caso especial: apenas uma categoria ou 100% (SVG Arcs falham com 360 graus)
  if (data.length === 1 || data.some(d => d.valor === total)) {
    const mainItem = data.find(d => d.valor === total) || data[0];
    return (
      <div className="relative w-64 h-64 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
          <circle cx="50" cy="50" r="40" fill={COLORS[0]} className="cursor-pointer hover:opacity-80 transition-opacity">
            <title>{mainItem.name}: {mainItem.valor}</title>
          </circle>
          <circle cx="50" cy="50" r="28" fill="white" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black text-slate-300 uppercase">Total</span>
          <span className="text-xl font-black text-[#003366]">{total}</span>
        </div>
      </div>
    );
  }

  let currentAngle = 0;
  
  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
        {data.map((item, i) => {
          const sliceAngle = (item.valor / total) * 360;
          const largeArcFlag = sliceAngle > 180 ? 1 : 0;
          
          const x1 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
          const y1 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
          
          currentAngle += sliceAngle;
          
          const x2 = 50 + 40 * Math.cos((Math.PI * currentAngle) / 180);
          const y2 = 50 + 40 * Math.sin((Math.PI * currentAngle) / 180);
          
          return (
            <path
              key={i}
              d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={COLORS[i % COLORS.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{item.name}: {item.valor}</title>
            </path>
          );
        })}
        <circle cx="50" cy="50" r="28" fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[10px] font-black text-slate-300 uppercase">Total</span>
        <span className="text-xl font-black text-[#003366]">{total}</span>
      </div>
    </div>
  );
};

const Reports = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_deteccoes: 0,
    violacoes: 0,
    taxa_reconhecimento: 0,
    setor_critico: '---'
  });
  const [chartData, setChartData] = useState({ por_setor: [], por_tipo_epi: [], comparativo_diario: [] });
  const [events, setEvents] = useState([]);
  const [selectedScreenshot, setSelectedScreenshot] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [filterCamera, setFilterCamera] = useState('all');
  const [filterViolation, setFilterViolation] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [dateStart, setDateStart] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [dateEnd, setDateEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [cameras, setCameras] = useState([]);
  const [setores, setSetores] = useState([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, chartRes, eventRes, camRes, setRes] = await Promise.all([
        axios.get(`${API_URL}/dashboard/summary`),
        axios.get(`${API_URL}/dashboard/chart-data`),
        axios.get(`${API_URL}/eventos?limit=1000`), 
        axios.get(`${API_URL}/cameras`),
        axios.get(`${API_URL}/setores`)
      ]);

      setSummary({
        total_deteccoes: sumRes.data.total_deteccoes,
        violacoes: sumRes.data.violacoes,
        taxa_reconhecimento: ((sumRes.data.violacoes_reconhecidas / (sumRes.data.violacoes || 1)) * 100).toFixed(1),
        setor_critico: chartRes.data.por_setor.length > 0 
          ? chartRes.data.por_setor.sort((a,b) => b.valor - a.valor)[0].name 
          : 'Nenhum'
      });
      setChartData(chartRes.data);
      setEvents(eventRes.data);
      setCameras(camRes.data);
      setSetores(setRes.data);
    } catch (err) {
      console.error("Erro ao carregar relatórios:", err);
      toast.error("Erro ao carregar dados do relatório.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const eventsFiltrados = events.filter(e => {
    const eventDate = e.data ? e.data.split('/').reverse().join('-') : format(new Date(), 'yyyy-MM-dd');
    const matchDate = eventDate >= dateStart && eventDate <= dateEnd;
    const matchCamera = filterCamera === 'all' || String(e.camera) === String(cameras.find(c => String(c.id) === String(filterCamera))?.nome);
    const matchSector = filterSector === 'all' || String(e.setor) === String(setores.find(s => String(s.id) === String(filterSector))?.nome);
    return matchDate && matchCamera && matchSector;
  });


  const summaryFiltrado = {
    total_deteccoes: eventsFiltrados.length,
    violacoes: eventsFiltrados.filter(e => e.violacao).length,
    faces_reconhecidas: eventsFiltrados.filter(e => e.colaborador).length,
    setor_critico: '---',
    camera_critica: '---'
  };


  const chartDataFiltrado = {
    por_setor: [],
    por_tipo_epi: [],
    comparativo_diario: chartData.comparativo_diario
  };


  const setoresMap = {};
  const camerasMap = {};
  
  eventsFiltrados.forEach(e => {
    if (e.violacao) {
      setoresMap[e.setor] = (setoresMap[e.setor] || 0) + 1;
      camerasMap[e.camera] = (camerasMap[e.camera] || 0) + 1;
    }
  });

  chartDataFiltrado.por_setor = Object.entries(setoresMap).map(([name, valor]) => ({ name, valor }));
  if (chartDataFiltrado.por_setor.length > 0) {
    summaryFiltrado.setor_critico = chartDataFiltrado.por_setor.sort((a,b) => b.valor - a.valor)[0].name;
  }

  const camerasRanking = Object.entries(camerasMap).sort((a,b) => b[1] - a[1]);
  if (camerasRanking.length > 0) {
    summaryFiltrado.camera_critica = camerasRanking[0][0];
  }

  const epiMap = {};
  eventsFiltrados.forEach(e => {
    if (e.violacao && e.violacao.trim()) {
      const nomeEpi = e.violacao.toUpperCase();
      epiMap[nomeEpi] = (epiMap[nomeEpi] || 0) + 1;
    }
  });
  chartDataFiltrado.por_tipo_epi = Object.entries(epiMap).map(([name, valor]) => ({ name, valor }));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEvents = eventsFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(eventsFiltrados.length / itemsPerPage) || 1;

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCamera, filterSector, dateStart, dateEnd]);

  const handleExport = () => {
    toast.info("Geração de relatório PDF em andamento...");
    let exportUrl = `${API_URL}/eventos/export/pdf?token=${token}`;
    if (filterCamera !== 'all') exportUrl += `&camera_id=${filterCamera}`;
    if (filterSector !== 'all') exportUrl += `&setor_id=${filterSector}`;
    if (dateStart) exportUrl += `&start_date=${dateStart}`;
    if (dateEnd) exportUrl += `&end_date=${dateEnd}`;
    exportUrl += `&period=custom`;
    
    const link = document.createElement('a');
    link.href = exportUrl;
    link.setAttribute('download', 'relatorio_seguranca.pdf');
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => toast.success("Relatório exportado com sucesso!"), 2000);
  };

  const COLORS = ['#003366', '#0066CC', '#3399FF', '#99CCFF', '#CCE5FF'];

  return (
    <div className="flex flex-col min-h-screen bg-[#f8f9fa] pb-12">
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
            <div className="p-2 md:p-4 text-center">
               <img 
                 src={selectedScreenshot} 
                 alt="Evidência" 
                 className="w-full h-auto rounded-2xl shadow-inner border border-white/5 mx-auto"
                 crossOrigin="anonymous"
               />
               <div className="mt-4 px-4 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-widest text-left">Evidência Fotográfica</h3>
                    <p className="text-white/40 text-[10px] font-bold uppercase mt-1 text-left">Registro oficial do sistema de inteligência artificial</p>
                  </div>
                  <button 
                    onClick={() => window.open(selectedScreenshot, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20"
                  >
                    Download Original
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-8 py-6 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
            <BarChart2 size={14} />
            <span>Inteligência de Dados</span>
          </div>
          <h1 className="text-3xl font-black text-[#003366] tracking-tighter uppercase">Relatórios Analíticos</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl p-2 shadow-inner group focus-within:ring-2 focus-within:ring-blue-100 transition-all">
            <Calendar size={18} className="text-[#003366] ml-2" />
            <div className="flex items-center gap-4 px-3">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Início</span>
                <input 
                  type="date" 
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="text-sm font-bold text-[#003366] bg-transparent outline-none cursor-pointer"
                />
              </div>
              <div className="w-[1px] h-8 bg-gray-200"></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Término</span>
                <input 
                  type="date" 
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="text-sm font-bold text-[#003366] bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleExport}
            className="flex items-center gap-3 bg-[#003366] text-white rounded-xl px-6 py-3.5 font-black text-sm uppercase tracking-widest hover:bg-[#002244] transition-all shadow-xl shadow-blue-900/20 active:scale-95"
          >
            <Download size={18} />
            Gerar PDF
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8 flex flex-col gap-8 max-w-[1800px] mx-auto w-full">
        
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-5 rounded-[2rem] border border-blue-50 shadow-xl shadow-blue-900/5">
          <FilterSelect 
            icon={VideoOff}
            options={[{label: 'TODAS AS CÂMERAS', value: 'all'}, ...cameras.map(c => ({label: c.nome.toUpperCase(), value: c.id}))]}
            value={filterCamera}
            onChange={setFilterCamera}
          />
          <FilterSelect 
            icon={MapPin}
            options={[{label: 'TODOS OS SETORES', value: 'all'}, ...setores.map(s => ({label: s.nome.toUpperCase(), value: s.id}))]}
            value={filterSector}
            onChange={setFilterSector}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            icon={ShieldAlert}
            label="Violações de EPI"
            value={summaryFiltrado.violacoes.toLocaleString()}
            badge="Crítico"
            badgeColor="text-red-500"
            iconColor="text-red-500"
          />
          <StatCard 
            icon={UserCheck}
            label="Faces Reconhecidas"
            value={summaryFiltrado.faces_reconhecidas.toLocaleString()}
            badge="Identificado"
            badgeColor="text-emerald-500"
            iconColor="text-blue-600"
          />
          <StatCard 
            icon={VideoIcon}
            label="Câmera Crítica"
            value={summaryFiltrado.camera_critica}
            badge="Top Alertas"
            badgeColor="text-orange-500"
            iconColor="text-orange-500"
          />
          <StatCard 
            icon={MapPin}
            label="Zona Crítica"
            value={summaryFiltrado.setor_critico}
            badge="Área de Risco"
            badgeColor="text-purple-500"
            iconColor="text-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-[#003366] tracking-tighter uppercase">Incidentes por Setor</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Distribuição volumétrica no período</p>
              </div>
              <BarChart2 size={24} className="text-gray-200" />
            </div>
            
            <div className="h-[350px] w-full flex items-center justify-center">
              {chartDataFiltrado.por_setor.length > 0 ? (
                <CustomBarChart data={chartDataFiltrado.por_setor} />
              ) : (
                <div className="text-center text-slate-300">
                   <BarChart2 size={48} className="mx-auto mb-2 opacity-20" />
                   <p className="text-xs font-black uppercase">Sem dados volumétricos</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-8">
              <div>
                <h3 className="text-xl font-black text-[#003366] tracking-tighter uppercase">Tipos de Violação EPI</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Distribuição por categoria</p>
              </div>
              <LayoutGrid size={24} className="text-gray-200" />
            </div>

            <div className="flex-1 flex items-center justify-center w-full min-h-[300px]">
              {chartDataFiltrado.por_tipo_epi.length > 0 ? (
                <CustomPieChart data={chartDataFiltrado.por_tipo_epi} />
              ) : (
                <div className="text-center text-slate-300">
                   <TrendingUp size={48} className="mx-auto mb-2 opacity-20" />
                   <p className="text-xs font-black uppercase">Sem dados de EPI</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full mt-6 px-4">
              {chartDataFiltrado.por_tipo_epi.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                  <span className="text-[10px] font-black text-[#003366] uppercase tracking-tighter truncate">{item.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 ml-auto">{item.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-[#003366] tracking-tighter uppercase">Log Geral de Atividade</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Histórico completo processado pelo núcleo de IA</p>
            </div>
            <div className="bg-gray-50 px-4 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
              <FileText size={18} className="text-gray-400" />
              <span className="text-xs font-black text-[#003366] uppercase tracking-widest">Registros: {eventsFiltrados.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
            <table className="w-full text-left min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50/50 text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                  <th className="px-8 py-6">Registro IA</th>
                  <th className="px-8 py-6">Colaborador</th>
                  <th className="px-8 py-6">Violação / Status</th>
                  <th className="px-8 py-6">Localização</th>
                  <th className="px-8 py-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">Carregando dados...</td>
                  </tr>
                ) : eventsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum registro encontrado para os filtros selecionados</td>
                  </tr>
                ) : currentEvents.map((e, idx) => (
                  <tr 
                    key={e.id} 
                    className={`transition-all group border-l-4 ${idx % 2 === 0 ? 'bg-white border-l-transparent' : 'bg-slate-100/50 border-l-transparent'} hover:bg-blue-50 hover:border-l-blue-500`}
                  >
                    <td className="px-8 py-7">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID: {e.id.split('-')[0]}</span>
                        <span className="text-base font-black text-[#003366] tabular-nums leading-none mb-1.5">{e.timestamp}</span>
                        <span className="text-xs text-slate-500 font-extrabold uppercase tracking-widest">{e.data || 'Hoje'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-[#003366] font-black text-sm overflow-hidden group-hover:border-blue-200 transition-all shadow-sm">
                          {e.foto_referencia ? (
                            <img src={`${API_URL}${e.foto_referencia}?token=${token}`} className="w-full h-full object-cover" crossOrigin="anonymous" />
                          ) : (
                            e.colaborador?.charAt(0) || (e.status === 'desconhecido' ? '?' : 'ID')
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-black text-[#003366] uppercase truncate max-w-[220px] tracking-tight mb-1">
                            {e.colaborador || (e.status === 'desconhecido' ? 'Pessoa Desconhecida' : 'Não Identificado')}
                          </span>
                          <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                            {e.cargo || (e.status === 'desconhecido' ? 'NÃO CADASTRADO' : 'Externo/Visitante')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      {e.violacao ? (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase border border-red-100 shadow-sm">
                          <AlertTriangle size={14} className="stroke-[2.5]" />
                          {e.violacao}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase border border-emerald-100 shadow-sm">
                          <UserCheck size={14} className="stroke-[2.5]" />
                          Seguro
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[12px] font-black text-[#003366] uppercase flex items-center gap-2">
                          <MapPin size={14} className="text-blue-600 stroke-[2.5]" />
                          {e.camera}
                        </span>
                        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest ml-5">{e.setor}</span>
                      </div>
                    </td>
                    <td className="px-8 py-7 text-right">
                       <button 
                         onClick={() => e.screenshot && setSelectedScreenshot(`${API_URL}${e.screenshot}`)}
                         className="inline-flex items-center gap-2 px-6 py-3 bg-[#003366] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] hover:bg-[#002244] transition-all shadow-lg shadow-blue-900/10 active:scale-95"
                       >
                          <Eye size={16} className="stroke-[2.5]" />
                          Analisar
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="px-8 py-8 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-gray-100">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-gray-400 font-black uppercase tracking-widest">
                Exibindo {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, eventsFiltrados.length)} de {eventsFiltrados.length} registros
              </span>
              <div className="h-1.5 w-64 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#003366] transition-all duration-500" 
                  style={{ width: `${(currentPage / totalPages) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2.5 bg-white border border-gray-100 rounded-xl transition-all shadow-sm ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'text-[#003366] hover:bg-gray-50'}`}
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-2">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  if (pageNum <= 0) pageNum = i + 1;
                  
                  return pageNum <= totalPages ? (
                    <button 
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-xs transition-all ${
                        currentPage === pageNum 
                          ? 'bg-[#003366] text-white shadow-lg shadow-blue-900/20' 
                          : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ) : null;
                })}
              </div>

              <button 
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2.5 bg-white border border-gray-100 rounded-xl transition-all shadow-sm ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'text-[#003366] hover:bg-gray-50'}`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
