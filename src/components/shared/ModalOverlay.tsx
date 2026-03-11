interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
}

export default function ModalOverlay({ children, onClose }: ModalOverlayProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto scrollbar-thin p-4 md:p-6 slide-in">
        {children}
      </div>
    </div>
  );
}
