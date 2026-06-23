import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import { 
  Video as VideoIcon,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  MapPin,
  TrendingUp,
  Clock,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const HomeDash = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [period, setPeriod] = useState('24h');
  const [customRange, setCustomRange] = useState({
    startDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    startTime: '00:00',
    endDate: format(new Date(), 'yyyy-MM-dd'),
    endTime: '23:59'
  });
  const [summary, setSummary] = useState({ cameras_ativas: 0, violacoes: 0, faces_reconhecidas: 0 });
  const [recentEvents, setRecentEvents] = useState([]);
  const [chartData, setChartData] = useState({ por_setor: [], por_tipo_epi: [], comparativo_diario: [] });
  const { token } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!token) return;

    const controller = new AbortController();

    const fetchData = async () => {
      try {
        let queryParams = `period=${period}`;
        if (period === 'custom') {
          const startFull = `${customRange.startDate}T${customRange.startTime}`;
          const endFull = `${customRange.endDate}T${customRange.endTime}`;
          queryParams += `&start_date=${startFull}&end_date=${endFull}`;
        }

        const [sumRes, evRes, chartRes] = await Promise.all([
          axios.get(`${API_URL}/dashboard/summary?${queryParams}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
          axios.get(`${API_URL}/eventos?limit=5&${queryParams}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
          axios.get(`${API_URL}/dashboard/chart-data?${queryParams}`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
        ]);
        setSummary(sumRes.data);
        setRecentEvents(evRes.data.map(e => ({
            id: e.id,
            shortId: e.id.split('-')[0],
            timestamp: e.timestamp,
            date: e.data || 'Hoje',
            location: e.camera,
            sector: e.setor || 'N/A',
            violation: e.violacao || 'N/A',
            employee: e.colaborador || (e.status === 'desconhecido' ? 'Pessoa Desconhecida' : 'Não Identificado'),
            status: e.status === 'identificado' ? 'IDENTIFICADO' : (e.status === 'desconhecido' ? 'DESCONHECIDO' : 'ID PENDENTE'),
            statusType: e.status === 'identificado' ? 'success' : (e.status === 'desconhecido' ? 'error' : 'warning')
        })));
        setChartData(chartRes.data);
      } catch (err) {
        if (axios.isCancel(err)) {
          console.log('Request canceled', err.message);
        } else {
          console.error("Erro ao buscar dados do dashboard:", err);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    
    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [token, period, customRange]);

  const maxSetor = chartData?.por_setor?.length > 0 ? Math.max(...chartData.por_setor.map(d => d.valor), 1) : 1;
  const totalEpi = chartData?.por_tipo_epi?.reduce((sum, d) => sum + d.valor, 0) || 0;
  const pieAngle = totalEpi > 0 ? ((chartData.por_tipo_epi[0]?.valor || 0) / totalEpi) * 360 : 0;

  return (
    <div className="p-4 md:p-8 flex flex-col gap-6 md:gap-8 max-w-[1800px] mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-[11px] font-extrabold text-orange-600 uppercase tracking-[0.2em] mb-1.5 leading-none">Monitoramento em Tempo Real</p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#003366] tracking-tighter uppercase leading-none">Painel de Segurança</h1>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {period === 'custom' && (
            <div className="flex items-center bg-white border-2 border-blue-100 rounded-[2rem] p-2 shadow-xl shadow-blue-900/10 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center gap-6 px-4 py-2 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Início</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={customRange.startDate}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                        className="text-[12px] font-black text-[#003366] uppercase bg-transparent focus:outline-none cursor-pointer hover:text-blue-600 transition-colors border-b-2 border-transparent focus:border-blue-200"
                      />
                      <input 
                        type="time" 
                        value={customRange.startTime}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, startTime: e.target.value }))}
                        className="text-[12px] font-black text-[#003366] bg-transparent focus:outline-none cursor-pointer hover:text-blue-600 transition-colors border-b-2 border-transparent focus:border-blue-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-[2px] h-10 bg-slate-200/60 rounded-full"></div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Término</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        value={customRange.endDate}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className="text-[12px] font-black text-[#003366] uppercase bg-transparent focus:outline-none cursor-pointer hover:text-blue-600 transition-colors border-b-2 border-transparent focus:border-blue-200"
                      />
                      <input 
                        type="time" 
                        value={customRange.endTime}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, endTime: e.target.value }))}
                        className="text-[12px] font-black text-[#003366] bg-transparent focus:outline-none cursor-pointer hover:text-blue-600 transition-colors border-b-2 border-transparent focus:border-blue-200"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center bg-white border-2 border-slate-100 rounded-[1.5rem] p-1.5 shadow-sm hover:border-blue-200 transition-all">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#003366]">
                <Calendar size={18} className="stroke-[2.5]" />
              </div>
              <select 
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-50 border-none rounded-2xl pl-12 pr-12 py-3 text-[12px] font-black text-[#003366] uppercase tracking-widest appearance-none cursor-pointer focus:ring-4 focus:ring-blue-50 transition-all"
              >
                <option value="24h">Últimas 24 Horas</option>
                <option value="7d">Últimos 7 Dias</option>
                <option value="30d">Últimos 30 Dias</option>
                <option value="all">Todo o Histórico</option>
                <option value="custom">Personalizado...</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#003366] pointer-events-none stroke-[3]" />
            </div>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 group hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-[0.15em] mb-2">Câmeras Ativas</p>
              <h3 className="text-4xl font-extrabold text-[#003366] tracking-tighter leading-none">{summary.cameras_ativas}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl text-[#003366] group-hover:scale-110 transition-transform">
              <VideoIcon size={24} />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
            <VideoIcon size={100} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 border-l-[6px] border-l-red-500 group hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-[0.15em] mb-2">
                Violações ({period === '24h' ? '24h' : period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : 'Total'})
              </p>
              <h3 className="text-4xl font-extrabold text-red-600 tracking-tighter leading-none">{summary.violacoes}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-2xl text-red-500 group-hover:scale-110 transition-transform">
              <ShieldAlert size={24} />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
            <ShieldAlert size={100} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sm:col-span-2 lg:col-span-1 group hover:shadow-md transition-all relative overflow-hidden">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-[0.15em] mb-2">
                Identificações ({period === '24h' ? '24h' : period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : 'Total'})
              </p>
              <h3 className="text-4xl font-extrabold text-[#003366] tracking-tighter leading-none">{summary.faces_reconhecidas}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
              <UserCheck size={24} />
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-[0.04] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
            <UserCheck size={100} />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex flex-col mb-8">
            <h3 className="text-lg font-extrabold text-[#003366] tracking-tight uppercase">Tráfego Hoje vs Ontem</h3>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.1em] mt-1">Comparativo de volume diário</p>
          </div>
          <div className="flex flex-col gap-6">
              {chartData?.comparativo_diario?.length > 0 ? chartData.comparativo_diario.map((d, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-tighter w-20 truncate group-hover:text-[#003366] transition-colors">{d.name}</span>
                      <div className="flex-1 h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                          <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${d.name === 'Hoje' ? 'bg-gradient-to-r from-blue-600 to-blue-400' : 'bg-slate-300'}`} 
                               style={{ width: `${(d.valor / Math.max(...chartData.comparativo_diario.map(x=>x.valor), 1)) * 100}%` }}></div>
                      </div>
                      <span className="text-[11px] font-extrabold text-[#003366] tabular-nums">{d.valor}</span>
                  </div>
              )) : (
                <div className="py-10 text-center">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Calculando tendências...</p>
                </div>
              )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="flex flex-col self-start mb-8 w-full">
            <h3 className="text-lg font-extrabold text-[#003366] tracking-tight uppercase">Distribuição de EPIs</h3>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.1em] mt-1">Proporção por categoria de violação</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-around gap-12 w-full flex-1">
              <div className="relative w-48 h-48 rounded-full border-[16px] border-slate-50 shadow-inner flex items-center justify-center group"
                   style={{
                      background: totalEpi > 0 
                        ? `conic-gradient(#003366 0deg ${360 - pieAngle}deg, #ef4444 ${360 - pieAngle}deg 360deg)`
                        : '#f8fafc'
                   }}>
                  <div className="bg-white w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-lg border border-slate-50 group-hover:scale-105 transition-transform">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total</span>
                    <span className="text-3xl font-extrabold text-[#003366] tracking-tighter leading-none">{totalEpi}</span>
                  </div>
              </div>
              <div className="flex flex-col gap-4 min-w-[160px]">
                  {chartData?.por_tipo_epi?.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
                          <div className={`w-3 h-3 rounded-full shadow-sm ${i === 0 ? 'bg-red-500' : 'bg-[#003366]'}`}></div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-tighter leading-none mb-1">{t.name}</span>
                            <span className="text-sm font-extrabold text-[#003366] tabular-nums">{t.valor}</span>
                          </div>
                      </div>
                  ))}
                  {(!chartData?.por_tipo_epi || chartData.por_tipo_epi.length === 0) && (
                    <p className="text-[10px] font-bold text-slate-300 uppercase">Sem dados de EPI</p>
                  )}
              </div>
          </div>
        </div>
      </div>

      {/* Recent Log */}
      <section className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm flex flex-col mb-8">
        <div className="px-8 py-8 flex flex-col sm:flex-row justify-between items-center border-b border-gray-50 gap-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold text-[#003366] tracking-tight uppercase">Log de Incidentes Recentes</h2>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-[0.15em] mt-1">Últimas detecções processadas pela IA</p>
          </div>
          <button 
            onClick={() => navigate('/reports')}
            className="px-6 py-2.5 bg-[#003366] text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-[#002244] transition-all shadow-md active:scale-95"
          >
            Ver Tudo
          </button>
        </div>
        
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left min-w-[900px] border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-gray-100">
                <th className="px-8 py-6">Horário de Registro</th>
                <th className="px-8 py-6">Ponto de Monitoramento</th>
                <th className="px-8 py-6">Setor</th>
                <th className="px-8 py-6">Ocorrência IA</th>
                <th className="px-8 py-6">Colaborador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentEvents.map((event, idx) => (
                <tr 
                  key={event.id} 
                  className={`transition-all group border-l-4 ${idx % 2 === 0 ? 'bg-white border-l-transparent' : 'bg-slate-100/50 border-l-transparent'} hover:bg-blue-50 hover:border-l-blue-500`}
                >
                  <td className="px-8 py-7">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-[#003366]/40 uppercase tracking-widest mb-1.5 text-xs">ID: {event.shortId}</span>
                      <div className="flex flex-col">
                        <p className="text-[14px] font-black text-[#003366] tabular-nums leading-none mb-1.5">{event.timestamp}</p>
                        <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-tight">{event.date}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-slate-100 text-[#003366] group-hover:bg-[#003366] group-hover:text-white transition-all shadow-sm">
                        <MapPin size={14} className="stroke-[2.5]" />
                      </div>
                      <span className="text-[12px] font-black text-slate-700 uppercase tracking-tight">{event.location}</span>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{event.sector}</span>
                  </td>
                  <td className="px-8 py-7">
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 text-[10px] font-black uppercase tracking-widest shadow-sm">
                      <AlertTriangle size={12} className="stroke-[2.5]" />
                      {event.violation}
                    </span>
                  </td>
                  <td className="px-8 py-7">
                    <span className="text-[13px] font-black text-[#003366] uppercase tracking-tighter truncate max-w-[180px] block">{event.employee}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default HomeDash;
