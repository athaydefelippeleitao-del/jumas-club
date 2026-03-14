import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DeleteCategoryConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  categoryName: string;
  songCount: number;
}

export const DeleteCategoryConfirmModal: React.FC<DeleteCategoryConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  categoryName,
  songCount
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-bg-elevated rounded-3xl shadow-2xl border border-border-color flex flex-col overflow-hidden"
          >
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <AlertTriangle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">Excluir Categoria</h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                Tem certeza que deseja excluir a categoria <br/>
                <strong className="text-text-primary">"{categoryName}"</strong>? <br/>
                {songCount > 0 ? (
                  <span className="block mt-2 text-sm bg-bg-secondary p-3 rounded-xl border border-border-color/50">
                    Existem <strong className="text-jumas-green">{songCount}</strong> músicas nesta categoria. Elas ficarão <strong className="text-text-primary">Sem Categoria</strong>.
                  </span>
                ) : (
                  <span className="block mt-2 text-sm">Esta categoria está vazia.</span>
                )}
              </p>
              
              <div className="flex w-full gap-4">
                <button 
                  onClick={onClose} 
                  className="flex-1 py-4 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-2xl transition-all font-bold border border-border-color"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 py-4 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all font-bold shadow-lg shadow-red-600/20 active:scale-95"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
