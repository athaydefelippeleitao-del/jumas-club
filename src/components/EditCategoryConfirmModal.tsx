import React from 'react';
import { AlertTriangle, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EditCategoryConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  oldCategoryName: string;
  newCategoryName: string;
  songCount: number;
}

export const EditCategoryConfirmModal: React.FC<EditCategoryConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  oldCategoryName,
  newCategoryName,
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
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Edit2 size={40} />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">Editar Categoria</h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                Tem certeza que deseja renomear a categoria <br/>
                <strong className="text-text-primary">"{oldCategoryName}"</strong> para <strong className="text-text-primary">"{newCategoryName}"</strong>? <br/>
                
                {songCount > 0 && (
                  <span className="block mt-2 text-sm bg-bg-secondary p-3 rounded-xl border border-border-color/50">
                    Isso atualizará <strong className="text-jumas-green">{songCount}</strong> {songCount === 1 ? 'música' : 'músicas'} que {songCount === 1 ? 'está' : 'estão'} nesta categoria.
                  </span>
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
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Sim, Renomear
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
