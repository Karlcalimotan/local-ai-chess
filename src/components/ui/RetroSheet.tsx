import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { retroAudio } from '../../utils/audio';

interface RetroSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const RetroSheet: React.FC<RetroSheetProps> = ({
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
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 cursor-pointer"
            onClick={handleClose}
          />

          {/* Sheet Frame sliding from the right */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="relative w-full max-w-md h-full bg-zinc-900 border-l border-zinc-805 border-zinc-800 p-6 text-zinc-100 z-10 flex flex-col shadow-2xl font-sans"
          >
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-zinc-800 pb-4 mb-4 select-none">
              <h2 className="text-sm font-semibold tracking-wider text-zinc-150">
                {title}
              </h2>
              <button
                onClick={handleClose}
                className="bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer"
                aria-label="Close panel"
              >
                <X size={14} className="text-zinc-400 hover:text-zinc-200" />
              </button>
            </div>

            {/* Content scrollable wrapper */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
