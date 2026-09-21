"use client";

import { Navbar } from "@/components/Navbar";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Send, Smile, Users, Play } from "lucide-react";
import { PlayerWrapper } from "@/components/PlayerWrapper";
import React, { useState } from "react";

interface CommunityWatchClientProps {
  id: string;
  slug: string;
  episodeNumber: number;
  anime: {
    title: string | { english?: string; romaji?: string; native?: string };
    image?: string;
    cover?: string;
    description?: string;
    episodes?: { id: string; number: number; title?: string }[];
  };
  streamData: {
    sources: { url: string; quality?: string }[];
    allServers?: { name: string; provider: string; url: string; kind?: "dub" | "hsub" | "sub" | "other"; label?: string }[];
  };
}

const mockMessages = [
  { id: 1, user: "ShadowMaster", text: "This episode is fire! 🔥", time: "12:01", color: "text-red-500" },
  { id: 2, user: "Zenitsu", text: "Wait for the 15:00 mark, visual peak!", time: "12:02", color: "text-amber-500" },
  { id: 3, user: "Mikasa_Ackerman", text: "The animation is surreal.", time: "12:03", color: "text-white/60" },
  { id: 4, user: "GojoSatoru", text: "Domain Expansion! 🤞", time: "12:05", color: "text-purple-400" },
];

export default function CommunityWatchClient({ id, slug, episodeNumber, anime, streamData }: CommunityWatchClientProps) {
  const titleString = typeof anime.title === 'string' ? anime.title : anime.title?.english || anime.title?.romaji || "";
  const currentEpisode = anime.episodes?.find(e => e.number === episodeNumber);
  const episodeTitle = currentEpisode?.title || `Episode ${episodeNumber}`;
  const videoUrl = (streamData?.sources as { url: string; quality?: string }[])?.find(s => s.quality === 'default' || s.quality === 'auto')?.url || streamData?.sources?.[0]?.url;

  const [messages, setMessages] = useState<{ id: number; user: string; text: string; time: string; color: string }[]>(mockMessages);
  const [inputValue, setInputValue] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "info">("chat");

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      user: "You",
      text: inputValue,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      color: "text-amber-500"
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setShowEmojiPicker(false);
  };

  const addEmoji = (emoji: string) => {
    setInputValue(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  return (
    <div className="min-h-screen bg-[#06080F] text-white flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Left Side: Video Player & Info */}
        <div className="flex-1 flex flex-col min-w-0">
           <div className="container mx-auto px-0 md:px-10 lg:px-12 py-0 md:py-8 space-y-4 md:space-y-8 pb-4 md:pb-32">
              <div className="px-4 md:px-0 pt-4 md:pt-0">
                <Link href="/community" className="inline-flex items-center gap-2 text-white/20 hover:text-amber-500 transition-all mb-2 group font-black uppercase tracking-widest text-[10px]">
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Back to Hub</span>
                </Link>
              </div>

              {/* Player Section */}
              <div className="w-full aspect-video rounded-none md:rounded-[2rem] overflow-hidden bg-black border-b md:border border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative ring-1 ring-white/5">
                {videoUrl ? (
                  <PlayerWrapper 
                    videoUrl={videoUrl} 
                    title={titleString}
                    episodeTitle={episodeTitle}
                    poster={anime.cover || anime.image || ""}
                    allServers={streamData.allServers}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-amber-500/20 bg-[#080B12] gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full" />
                      <Play className="w-16 h-16 animate-pulse relative z-10 opacity-20" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.4em] opacity-20">Loading Stream</p>
                  </div>
                )}
              </div>

              {/* Mobile Tab Selection Bar (Visible only on md:hidden) */}
              <div className="flex border-b border-white/5 bg-[#080B12] md:hidden w-full sticky top-0 z-30">
                <button
                  onClick={() => setActiveMobileTab("chat")}
                  className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                    activeMobileTab === "chat" 
                      ? "border-amber-500 text-amber-500 bg-white/[0.02]" 
                      : "border-transparent text-white/40"
                  }`}
                >
                  Live Chat
                </button>
                <button
                  onClick={() => setActiveMobileTab("info")}
                  className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
                    activeMobileTab === "info" 
                      ? "border-amber-500 text-amber-500 bg-white/[0.02]" 
                      : "border-transparent text-white/40"
                  }`}
                >
                  Info & Episodes
                </button>
              </div>

              {/* Content Info & Episode List - hidden on mobile unless activeMobileTab is "info" */}
              <div className={`${activeMobileTab === 'info' ? 'block px-4 pt-4' : 'hidden md:block'} space-y-8`}>
                {/* Content Info */}
                <div className="flex flex-col gap-6 max-w-5xl">
                  <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 font-black uppercase tracking-widest text-[10px] rounded border border-amber-500/20">{episodeTitle}</span>
                        <div className="flex items-center gap-1.5 text-white/20 text-[10px] font-bold uppercase">
                           <Users className="w-3.5 h-3.5" />
                           <span>42 watching</span>
                        </div>
                      </div>
                      <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-[0.9] text-white uppercase">{titleString}</h1>
                  </div>

                  <div className="p-8 rounded-[2rem] bg-white/[0.02] border border-white/5 backdrop-blur-2xl relative overflow-hidden group">
                    <div 
                      className="text-white/40 text-sm md:text-base leading-relaxed font-medium transition-colors group-hover:text-white/60"
                      dangerouslySetInnerHTML={{ __html: anime.description || 'No description available.' }} 
                    />
                  </div>
                </div>

                {/* Episode List */}
                <div className="pt-12 border-t border-white/5">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black uppercase tracking-[0.3em] flex items-center gap-4 text-white/20">
                      Episodes
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                    {anime.episodes?.map((episode: { id: string; number: number; title?: string }) => (
                      <Link
                        key={episode.id}
                        href={`/community/watch/${id}/${slug}?ep=${episode.number}`}
                        className={`group relative aspect-video rounded-2xl overflow-hidden border transition-all duration-500 ${
                          episode.number === episodeNumber 
                            ? "border-amber-500 bg-amber-500/5 ring-4 ring-amber-500/10" 
                            : "border-white/5 hover:border-white/20 bg-white/5"
                        }`}
                      >
                        <Image
                          src={anime.image || ""}
                          alt={episode.title || `EP ${episode.number}`}
                          fill
                          sizes="180px"
                          className={`object-cover transition-all duration-700 ${episode.number === episodeNumber ? "opacity-60 scale-110" : "opacity-20 group-hover:opacity-40"}`}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 to-transparent">
                          <span className={`text-base font-black ${episode.number === episodeNumber ? "text-amber-400" : "text-white/20 group-hover:text-white/60"} transition-all uppercase tracking-tighter`}>
                            {episode.number}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* Right Side: Live Chat Sidebar - hidden on mobile unless activeMobileTab is "chat" */}
        <div className={`${activeMobileTab === 'chat' ? 'flex' : 'hidden md:flex'} w-full h-[520px] lg:h-[calc(100vh-64px)] lg:w-[380px] shrink-0 lg:sticky lg:top-16 bg-[#080B12] border-l border-white/5 flex flex-col relative z-10 transition-all`}>
           {/* Chat Header */}
           <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-white/[0.01] to-transparent">
              <div className="flex items-center gap-4 font-black uppercase tracking-[0.3em] text-[10px] text-white/40">
                 <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                 <span>Live Chat</span>
              </div>
           </div>

           {/* Chat Messages */}
           <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar scroll-smooth">
              {messages.map((msg) => (
                 <div key={msg.id} className="flex flex-col gap-2 group">
                    <div className="flex items-center gap-3">
                       <span className={`text-[10px] font-black uppercase tracking-widest ${msg.color} opacity-80 group-hover:opacity-100 transition-opacity`}>{msg.user}</span>
                       <span className="text-[9px] text-white/10 ml-auto font-black">{msg.time}</span>
                    </div>
                    <p className="text-[13px] text-white/50 leading-relaxed font-medium group-hover:text-white/80 transition-colors">
                      {msg.text}
                    </p>
                 </div>
              ))}
              
              <div className="py-8 flex items-center justify-center">
                 <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.5em] border-y border-white/5 py-2 px-4 italic opacity-20">Chat started</span>
              </div>
           </div>

           {/* Chat Input */}
           <div className="p-6 border-t border-white/5 bg-[#080B12]/80 backdrop-blur-3xl relative">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div className="absolute bottom-full left-6 mb-4 p-4 bg-[#0a0d14] border border-white/10 rounded-2xl shadow-2xl grid grid-cols-4 gap-2 z-50 ring-1 ring-white/5">
                   {["🔥", "❤️", "😂", "😮", "💯", "👏", "🙌", "💀"].map(emoji => (
                      <button 
                        key={emoji}
                        onClick={() => addEmoji(emoji)}
                        className="p-2 hover:bg-white/5 rounded-lg text-lg transition-transform hover:scale-125"
                      >
                         {emoji}
                      </button>
                   ))}
                </div>
              )}

              <div className="relative group">
                 <input 
                    type="text" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Message..."
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-4 pr-24 text-[13px] focus:outline-none focus:border-amber-500/50 transition-all font-medium text-white/90 placeholder:text-white/10 focus:ring-4 focus:ring-amber-500/5 shadow-inner"
                 />
                 <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-2 transition-colors ${showEmojiPicker ? 'text-amber-500' : 'text-white/10 hover:text-white'}`}
                    >
                       <Smile className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={handleSendMessage}
                      className="p-2.5 bg-amber-600 rounded-xl text-white hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20 active:scale-95 cursor-pointer"
                    >
                       <Send className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        
        body {
          font-family: 'Space Grotesk', sans-serif !important;
          background-color: #06080F !important;
          overscroll-behavior-y: none;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
      `}} />
    </div>
  );
}
