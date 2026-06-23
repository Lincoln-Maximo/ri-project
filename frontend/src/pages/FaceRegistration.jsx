import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ChevronRight, 
  Download, 
  UploadCloud, 
  Camera,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Filter,
  UserPlus,
  Trash2,
  Edit2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const AuthImage = ({ faceId, alt, className }) => {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState(false);
  const { token } = useAuth();

  useEffect(() => {
    let isMounted = true;
    let objectUrl = null;

    const fetchImage = async () => {
      if (!faceId || !token) return;
      try {
        const response = await axios.get(`${API_URL}/faces/${faceId}/photo`, {
          responseType: 'blob'
        });
        if (isMounted) {
          objectUrl = URL.createObjectURL(response.data);
          setSrc(objectUrl);
          setError(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Erro ao carregar foto da face ${faceId}:`, err);
          setError(true);
        }
      }
    };

    fetchImage();
    
    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [faceId, token]);

  if (error) return (
    <div className={`${className} bg-gray-100 flex items-center justify-center`}>
      <span className="text-[10px] font-bold text-gray-400 uppercase">Erro</span>
    </div>
  );

  if (!src) return (
    <div className={`${className} bg-gray-50 flex items-center justify-center animate-pulse`}>
      <div className="w-4 h-4 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  return <img src={src} alt={alt} className={className} />;
};

const FaceRegistration = () => {
  const { token } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [colaboradores, setColaboradores] = useState([]);
  const [setores, setSetores] = useState([]);
  
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [setor, setSetor] = useState("");
  const [cargo, setCargo] = useState("");
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState(null);
  const [filtro, setFiltro] = useState("");
  const [filtroSetor, setFiltroSetor] = useState("Todos os Setores");

  const colaboradoresFiltrados = colaboradores.filter(c => {
    const termo = filtro.toLowerCase();
    const matchBusca = c.nome.toLowerCase().includes(termo) || c.matricula.toLowerCase().includes(termo);
    const matchSetor = filtroSetor === "Todos os Setores" || c.setor === filtroSetor;
    return matchBusca && matchSetor;
  });

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [colaboradorToDelete, setColaboradorToDelete] = useState(null);

  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [facesRes, setoresRes] = await Promise.all([
        axios.get(`${API_URL}/faces`),
        axios.get(`${API_URL}/setores`)
      ]);
      setColaboradores(facesRes.data);
      setSetores(setoresRes.data);
    } catch (error) {
      toast.error("Erro ao carregar dados.");
    }
  };

  const resetForm = () => {
    setNome(""); setMatricula(""); setSetor(""); setCargo(""); setFotoFile(null); setFotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome || !matricula || !setor || (!fotoFile && !editingColaborador)) {
      toast.warn("Preencha todos os campos obrigatórios.");
      return;
    }

    const formData = new FormData();
    formData.append("nome", nome);
    formData.append("matricula", matricula);
    formData.append("setor", setor);
    formData.append("cargo", cargo);
    if (fotoFile) formData.append("foto", fotoFile);

    try {
      if (editingColaborador) {
        await axios.put(`${API_URL}/faces/${editingColaborador.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Colaborador atualizado!");
        fetchData();
        setIsEditModalOpen(false);
        setEditingColaborador(null);
      } else {
        await axios.post(`${API_URL}/faces`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast.success("Face cadastrada com sucesso!");
        fetchData();
        if (isSidebarOpen) setIsSidebarOpen(false);
      }
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Erro na operação.");
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      setFotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemove = async (id) => {
    try {
      await axios.delete(`${API_URL}/faces/${id}`);
      toast.success("Face removida.");
      setColaboradores(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      toast.error("Erro ao remover face.");
    }
  };

  const openEditModal = (colaborador) => {
    setEditingColaborador(colaborador);
    setNome(colaborador.nome);
    setMatricula(colaborador.matricula);
    setSetor(colaborador.setor || "");
    setCargo(colaborador.cargo || "");
    setFotoPreview(null); 
    setFotoFile(null); 
    setIsEditModalOpen(true);
  };

  const exportarParaCSV = () => {
    const headers = ["Nome,Matrícula,Setor,Cargo,Última Detecção"];
    const csvContent = colaboradoresFiltrados.map(c => 
      `"${c.nome}","${c.matricula}","${c.setor}","${c.cargo}","${c.ultima_deteccao || ''}"`
    ).join("\n");
    
    const blob = new Blob([headers.join("\n") + "\n" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "colaboradores.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#f8f9fa]">
      <div className="px-4 md:px-8 py-4 bg-white border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <span>Cadastro de faces</span>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-[#003366]">Nova face</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#003366] tracking-tight">Gerenciamento de faces</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4 md:gap-6">
          <button 
            onClick={exportarParaCSV}
            className="flex-1 md:flex-none bg-gray-100 text-[#003366] px-4 py-2.5 rounded-lg font-black text-xs hover:bg-gray-200 transition-all flex items-center justify-center gap-2 border border-gray-200/50 uppercase tracking-wider"
          >
            <Download size={16} />
            <span>Exportar Faces</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row flex-1 overflow-hidden p-4 md:p-8 gap-6 md:gap-8">
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
               <div className="flex-1 relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Filtrar por nome ou matrícula..." 
                    className="w-full bg-gray-50 border-none rounded-xl py-3 pl-12 pr-4 text-sm font-semibold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                  />
               </div>
               <div className="flex gap-2 flex-1 sm:flex-none">
                 <select 
                   value={filtroSetor}
                   onChange={(e) => setFiltroSetor(e.target.value)}
                   className="flex-1 sm:flex-none bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all sm:min-w-[180px] appearance-none cursor-pointer"
                 >
                    <option value="Todos os Setores">Todos os Setores</option>
                    {setores.map(s => (
                      <option key={s.id} value={s.nome}>{s.nome}</option>
                    ))}
                 </select>
               </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px] lg:min-w-0">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    <th className="px-6 md:px-8 py-5">Colaborador</th>
                    <th className="px-6 md:px-8 py-5">Matrícula</th>
                    <th className="px-6 md:px-8 py-5">Setor</th>
                    <th className="px-6 md:px-8 py-5">Última Detecção</th>
                    <th className="px-6 md:px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {colaboradoresFiltrados.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/30 transition-colors group text-sm">
                      <td className="px-6 md:px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden border border-gray-200/60 shadow-sm flex-none">
                            {c.foto_url ? (
                              <AuthImage faceId={c.id} alt={c.nome} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            ) : (
                              <span className="font-black text-orange-600 text-base">
                                {c.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="font-black text-[#003366] truncate">{c.nome}</span>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-5 font-bold text-gray-600">{c.matricula}</td>
                      <td className="px-6 md:px-8 py-5 font-bold text-gray-600">{c.setor}</td>
                      <td className="px-6 md:px-8 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-gray-600">{c.ultima_deteccao || 'Sem registros'}</span>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(c)} className="p-2 text-gray-400 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => { setColaboradorToDelete(c); setIsDeleteModalOpen(true); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-auto border-t border-gray-100 px-4 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between bg-white gap-4">
              <span className="text-xs font-bold text-gray-400">Mostrando {colaboradores.length} colaboradores</span>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-[#003366] transition-colors"><ChevronLeft size={16} /></button>
                <button className="w-8 h-8 rounded-lg bg-[#003366] text-white text-xs font-black">1</button>
                <button className="p-2 text-gray-400 hover:text-[#003366] transition-colors"><ChevronRightIcon size={16} /></button>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => { resetForm(); setIsSidebarOpen(true); }} className="xl:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#003366] text-white rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 transition-transform active:scale-95"><UserPlus size={24} /></button>

        {isSidebarOpen && <div className="xl:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setIsSidebarOpen(false)} />}

        <aside className={`fixed xl:relative inset-y-0 right-0 w-full max-w-[380px] bg-white xl:bg-transparent z-[70] xl:z-auto transform ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full xl:translate-x-0'} transition-transform duration-300 ease-in-out flex flex-col gap-6 p-6 md:p-8 xl:p-0 shadow-2xl xl:shadow-none`}>
          <div className="xl:hidden flex items-center justify-between mb-2">
            <h2 className="font-black text-[#003366] uppercase text-sm">Novo Cadastro</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400 p-2"><ChevronRightIcon size={24} /></button>
          </div>
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 flex flex-col flex-1 overflow-y-auto xl:overflow-visible">
            <div className="hidden xl:flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[#003366] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20"><Camera size={20} /></div>
              <h3 className="text-lg font-black text-[#003366] tracking-tight uppercase">Novo Cadastro Rápido</h3>
            </div>
            <div onClick={() => fileInputRef.current.click()} className="aspect-square bg-white border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-4 mb-8 group hover:border-[#003366] hover:bg-blue-50/30 transition-all cursor-pointer relative overflow-hidden">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="text-center px-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-[#003366] mx-auto mb-4"><UploadCloud size={28} /></div>
                  <p className="text-xs font-black text-[#003366] uppercase tracking-wide">Clique para selecionar uma foto</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Completo</label>
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João da Silva Santos" className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-semibold text-[#003366] outline-none focus:ring-2 focus:ring-blue-100 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Matrícula / ID</label>
                  <input type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="00000" className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-semibold text-[#003366] outline-none text-center" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Setor</label>
                  <select value={setor} onChange={(e) => setSetor(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-[#003366] outline-none cursor-pointer">
                    <option value="">Selecionar</option>
                    {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-[#003366] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#002244] transition-all shadow-lg mt-2 active:scale-95">Salvar</button>
            </form>
          </div>
        </aside>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingColaborador(null); resetForm(); }} title="Editar Colaborador">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex justify-center mb-6">
            <div onClick={() => editFileInputRef.current.click()} className="w-56 h-56 aspect-square bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center group hover:border-[#003366] hover:bg-blue-50/30 transition-all cursor-pointer overflow-hidden relative">
              {fotoPreview ? (
                <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : editingColaborador?.id ? (
                <AuthImage faceId={editingColaborador.id} alt="Current Photo" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2"><UploadCloud size={28} className="text-gray-400" /><span className="text-[10px] font-black text-gray-400 uppercase">Adicionar Foto</span></div>
              )}
              <input type="file" ref={editFileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Completo</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-semibold text-[#003366] outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Matrícula</label>
              <input type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-semibold text-[#003366] text-center" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Setor</label>
              <select value={setor} onChange={(e) => setSetor(e.target.value)} className="w-full bg-gray-50 border-none rounded-xl p-3.5 text-sm font-bold text-[#003366]">
                <option value="">Selecionar</option>
                {setores.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={() => { setIsEditModalOpen(false); setEditingColaborador(null); resetForm(); }} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-xl font-black text-xs uppercase hover:bg-gray-200 transition-all">Cancelar</button>
            <button type="submit" className="flex-2 bg-[#003366] text-white py-4 px-8 rounded-xl font-black text-xs uppercase hover:bg-[#002244] shadow-lg active:scale-95">Salvar Alterações</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setColaboradorToDelete(null); }} title="Confirmar Exclusão">
        <div className="flex flex-col gap-6">
          <p className="text-sm text-gray-600 font-semibold leading-relaxed">Tem certeza de que deseja remover a face de <span className="text-[#003366] font-black">{colaboradorToDelete?.nome}</span>? Esta ação não pode ser desfeita.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => { setIsDeleteModalOpen(false); setColaboradorToDelete(null); }} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-xl font-black text-xs uppercase hover:bg-gray-200 transition-all">Cancelar</button>
            <button type="button" onClick={() => { if (colaboradorToDelete) { handleRemove(colaboradorToDelete.id); setIsDeleteModalOpen(false); setColaboradorToDelete(null); } }} className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black text-xs uppercase hover:bg-red-700 shadow-lg active:scale-95">Confirmar Exclusão</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FaceRegistration;
