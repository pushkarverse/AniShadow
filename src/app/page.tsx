"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MonitorPlay, BookOpen, Sparkles, Compass } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#050505] text-white flex flex-col justify-center items-center overflow-hidden px-4 py-12">
      {/* Background Glowing Gradients */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-red-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-[10s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.01] border border-white/[0.03] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.01] border border-white/[0.03] rounded-full pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full text-center space-y-12 sm:space-y-16">
        {/* Logo and Brand Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-4"
        >
          <div className="relative w-48 h-12 md:w-60 md:h-16 mx-auto">
            <Image
              src="/logo.png"
              alt="Ani Shadow Logo"
              fill
              priority
              sizes="240px"
              className="object-contain"
            />
          </div>
          <p className="text-white/40 text-xs sm:text-sm tracking-[0.3em] uppercase max-w-md mx-auto font-black leading-relaxed">
            Ultimate Media Platform
          </p>
        </motion.div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10 max-w-4xl mx-auto">
          {/* Anime Portal Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.05] hover:border-red-500/30 shadow-2xl backdrop-blur-md p-8 sm:p-10 flex flex-col justify-between text-left min-h-[360px] sm:min-h-[420px] transition-all"
          >
            {/* Corner Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-2xl group-hover:bg-red-600/20 transition-all pointer-events-none" />

            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all shadow-lg shadow-red-500/10">
                <MonitorPlay className="w-7 h-7" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  Anime Portal
                  <span className="text-[10px] font-black tracking-widest text-red-500 border border-red-500/20 rounded px-2 py-0.5 uppercase">STREAMS</span>
                </h2>
                <p className="text-white/50 text-sm leading-relaxed font-medium">
                  Watch thousands of high-fidelity, subbed and dubbed anime series using our ad-free proxy players, auto-skip, and watchparty tracking features.
                </p>
              </div>
            </div>

            <div className="pt-8">
              <Link 
                href="/anime"
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 transition-all cursor-pointer group-hover:shadow-red-500/30 active:scale-95"
              >
                <span>Browse Anime</span>
                <Sparkles className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>

          {/* Reader Portal Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.05] hover:border-purple-500/30 shadow-2xl backdrop-blur-md p-8 sm:p-10 flex flex-col justify-between text-left min-h-[360px] sm:min-h-[420px] transition-all"
          >
            {/* Corner Accent Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl group-hover:bg-purple-600/20 transition-all pointer-events-none" />

            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-lg shadow-purple-500/10">
                <BookOpen className="w-7 h-7" />
              </div>
              
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  Reader Portal
                  <span className="text-[10px] font-black tracking-widest text-purple-400 border border-purple-500/20 rounded px-2 py-0.5 uppercase font-sans">LITERATURE</span>
                </h2>
                <p className="text-white/50 text-sm leading-relaxed font-medium">
                  Immerse yourself in manga, manhwa, and novels. Complete with responsive reader customizations, progress saving, and interactive chapter navigation.
                </p>
              </div>
            </div>

            <div className="pt-8">
              <Link 
                href="/reader"
                className="w-full py-4 rounded-2xl bg-[#5b128c] hover:bg-[#7216af] text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-purple-600/20 transition-all cursor-pointer group-hover:shadow-purple-600/30 active:scale-95"
              >
                <span>Open Reader</span>
                <Compass className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Footer Credit */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-white/20 text-[10px] tracking-widest uppercase font-black"
        >
          &copy; {new Date().getFullYear()} Ani Shadow &bull; All Rights Reserved
        </motion.div>
      </div>
    </div>
  );
}
