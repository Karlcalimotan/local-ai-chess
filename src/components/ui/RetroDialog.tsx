import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { retroAudio } from '../../utils/audio';

interface RetroDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const RetroDialog: React.FC<RetroDialogProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  const handleClose = () => {
    retroAudio.playClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 cursor-pointer"
            onClick={handleClose}
          />

          {/* Dialog Frame */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-sm text-zinc-100 shadow-2xl z-10 overflow-hidden font-sans"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-zinc-800 pb-4 mb-4 select-none">
              <h2 className="text-sm font-semibold tracking-wider text-zinc-200">
                {title}
              </h2>
              <button
                onClick={handleClose}
                className="bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-753 border-zinc-700 p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={14} className="text-zinc-400 hover:text-zinc-200" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[70vh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
