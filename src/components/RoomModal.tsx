"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, LogIn, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeId: string;
  animeTitle: string;
}

export function RoomModal({ isOpen, onClose, animeId, animeTitle }: RoomModalProps) {
  const router = useRouter();

  const handleCreateRoom = () => {
    // Navigate to the specialized community watch page
    router.push(`/community/watch/${animeId}?ep=1`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/60 gold-framed"
          >
            {/* Header */}
            <div className="p-8 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary" />
                  Watch Party
                </h2>
                <p className="text-white/40 text-sm mt-1 line-clamp-1 font-medium italic">
                  &ldquo;{animeTitle}&rdquo;
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options */}
            <div className="p-8 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Create Room Option */}
              <button 
                onClick={handleCreateRoom}
                className="group flex flex-col gap-4 p-6 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all text-left relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-lg font-bold text-white uppercase tracking-wider">Create Room</h3>
                   <p className="text-white/40 text-xs mt-1 leading-relaxed">Start a new private session and invite others to watch.</p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none" />
              </button>

              {/* Join Room Option */}
              <button className="group flex flex-col gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left relative overflow-hidden">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/10">
                  <LogIn className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Join Room</h3>
                  <p className="text-white/40 text-xs mt-1 leading-relaxed">Enter a room code to join an existing watch party.</p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="p-8 pt-0 text-center">
               <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-black">Powered by AniShadow Rooms</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
