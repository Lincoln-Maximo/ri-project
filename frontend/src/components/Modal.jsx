const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] p-8 md:p-10 max-w-lg w-full shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-[#003366] uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">FECHAR</button>
        </div>
        {children}
      </div>
    </div>
  );
};
export default Modal;
