import { useState, useRef } from 'react';
import { Upload, X, Loader2, Camera } from 'lucide-react';

const ProfilePhotoModal = ({ isOpen, onClose, onConfirm }) => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  if (!isOpen) return null;

  const validateFile = (selectedFile) => {
    setError(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Formato não suportado. Use JPG, PNG ou WEBP.");
      return false;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Arquivo muito grande. O limite é 5MB.");
      return false;
    }
    return true;
  };

  const handleFile = (selectedFile) => {
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    inputRef.current.click();
  };

  const handleConfirm = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await onConfirm(file);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Erro ao fazer upload da imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] p-8 md:p-10 max-w-md w-full shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-[#003366] uppercase tracking-tight">Alterar foto de perfil</h2>
          <button 
            onClick={handleClose} 
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-6">
          {!preview ? (
            <div 
              className={`w-full h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
                dragActive ? 'border-[#003366] bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
            >
              <div className="p-4 bg-white rounded-2xl shadow-sm text-[#003366]">
                <Upload size={32} />
              </div>
              <div className="text-center px-6">
                <p className="text-sm font-bold text-gray-600">Arraste uma imagem ou clique para selecionar</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-wider">
                  Formatos aceitos: JPG, PNG, WEBP · Tamanho máximo: 5MB
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleChange}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-xl ring-8 ring-gray-50 relative group">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                {uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 size={32} className="text-white animate-spin" />
                  </div>
                )}
              </div>
              <button 
                onClick={onButtonClick} 
                disabled={uploading}
                className="text-[#003366] font-extrabold text-xs uppercase tracking-widest hover:underline flex items-center gap-2"
              >
                <Camera size={14} />
                Trocar imagem
              </button>
            </div>
          )}

          {error && (
            <div className="w-full p-4 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs font-bold text-red-600 text-center">{error}</p>
            </div>
          )}

          <div className="w-full flex flex-col sm:flex-row gap-4 mt-4">
            <button
              onClick={handleClose}
              disabled={uploading}
              className="flex-1 bg-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest py-4 rounded-xl hover:bg-gray-200 transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={uploading || !file}
              className="flex-1 bg-[#003366] text-white font-black text-xs uppercase tracking-widest py-4 rounded-xl hover:bg-[#002244] transition-all shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                'Confirmar'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhotoModal;
