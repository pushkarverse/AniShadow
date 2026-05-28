"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed as PWA)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (navigator as any).standalone === true;

    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e);

      // Check if user dismissed it in the current session
      const isDismissed = sessionStorage.getItem("anishadow-install-dismissed");
      if (!isDismissed) {
        // Show the custom banner after a 5 second delay to let the page load
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismissClick = () => {
    // Save dismissal to session storage so it doesn't prompt again in this session
    sessionStorage.setItem("anishadow-install-dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 150, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 150, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-[92px] left-4 right-4 z-50 md:hidden p-4 bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(255,74,74,0.15)] flex flex-col gap-4"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Logo Icon */}
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
              <span className="font-sans font-black text-white text-lg italic select-none">A</span>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white italic">
                Install AniShadow
              </h4>
              <p className="text-[10px] text-white/50 leading-snug mt-0.5 max-w-[200px]">
                Add to your home screen for lightning-fast speeds and offline resume.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismissClick}
            className="p-1 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-white/40 hover:text-white" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDismissClick}
            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all cursor-pointer"
          >
            Later
          </button>
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2.5 bg-primary hover:bg-primary/95 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-primary/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer animate-pulse-slow"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
