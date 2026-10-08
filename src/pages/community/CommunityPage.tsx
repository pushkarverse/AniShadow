
import { Navbar } from "@/components/Navbar";
import { useState, useEffect } from "react";
import Image from "@/compat/Image";
import { Users, Plus, Play } from "lucide-react";
import { RoomModal } from "@/components/RoomModal";

interface Room {
  id: number;
  name: string;
  host: string;
  viewers: number;
  status: 'Live' | 'Waiting...' | 'Ended';
  anime: string;
  episode: number;
  image: string;
  timeAgo: string;
  hasCC: boolean;
}

interface SharedAnimeProperties {
  id: number;
  title: { english?: string; native?: string; userPreferred?: string };
  coverImage: { large: string; extraLarge: string };
  nextAiringEpisode?: { episode: number };
}

export default function CommunityPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    async function fetchRealData() {
      try {
        const query = `
          query {
            Page(page: 1, perPage: 15) {
              media(sort: TRENDING_DESC, type: ANIME) {
                id
                title { english native userPreferred }
                coverImage { large extraLarge }
                nextAiringEpisode { episode }
              }
            }
          }
        `;

        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });

        const data = await response.json();
        const animeList = data?.data?.Page?.media || [];

        const hosts = ["ShadowMaster", "LuffyFan99", "Zenitsu", "GojoSatoru", "Mikasa_Ackerman", "Tanjiro_K", "Tailung_5", "ThoBanter", "Muzan79"];
        const statuses: ('Live' | 'Waiting...' | 'Ended')[] = ['Live', 'Waiting...', 'Ended'];

        const mappedRooms = (animeList.length > 0 ? animeList.slice(0, 12) : [
          { id: 1, title: { english: "Demon Slayer" }, coverImage: { extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx101922-WgeXT7ayESuN.jpg" }, nextAiringEpisode: { episode: 26 } },
          { id: 2, title: { english: "Jujutsu Kaisen" }, coverImage: { extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-bbBWj4hS3EgS.jpg" }, nextAiringEpisode: { episode: 24 } },
          { id: 3, title: { english: "One Piece" }, coverImage: { extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-YCDoj1EkAx2G.jpg" }, nextAiringEpisode: { episode: 1100 } },
          { id: 4, title: { english: "Solo Leveling" }, coverImage: { extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m17Z777U7U7U.jpg" }, nextAiringEpisode: { episode: 12 } },
          { id: 5, title: { english: "Attack on Titan" }, coverImage: { extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-739345.jpg" }, nextAiringEpisode: { episode: 75 } },
          { id: 6, title: { english: "Bleach: TYBW" }, coverImage: { extraLarge: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx142329-798858.jpg" }, nextAiringEpisode: { episode: 13 } }
        ]).map((anime: SharedAnimeProperties, i: number) => {
          const status = statuses[i % 3];
          return {
            id: anime.id,
            name: anime.title.english || anime.title.userPreferred || "Unknown Anime",
            host: hosts[i % hosts.length],
            viewers: status === 'Ended' ? 0 : Math.floor(Math.random() * 50) + 1,
            status,
            anime: anime.title.english || anime.title.userPreferred || "Unknown Anime",
            episode: anime.nextAiringEpisode?.episode ? anime.nextAiringEpisode.episode - 1 : Math.floor(Math.random() * 12) + 1,
            image: anime.coverImage.extraLarge || anime.coverImage.large,
            timeAgo: `${(i + 1) * 5} minutes ago`,
            hasCC: Math.random() > 0.5
          };
        });

        setRooms(mappedRooms);
      } catch (error) {
        console.error("Failed to fetch community data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRealData();
  }, []);

  const filteredRooms = rooms.filter(room => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Live') return room.status === 'Live';
    if (activeFilter === 'Waiting') return room.status === 'Waiting...';
    if (activeFilter === 'Ended') return room.status === 'Ended';
    if (activeFilter === 'My Rooms') return false;
    return true;
  });

  const showEmptyState = !loading && filteredRooms.length === 0;

  return (
    <div className="min-h-screen bg-[#080B12] text-white flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-900/20">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Hub</h1>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Watch together in real-time</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md overflow-x-auto max-w-full no-scrollbar">
            {['All', 'Live', 'Waiting', 'Ended', 'My Rooms'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeFilter === filter
                    ? (filter === "My Rooms" ? "bg-red-600 text-white shadow-lg shadow-red-900/40" : "bg-amber-600 text-white shadow-lg shadow-amber-900/40")
                    : "text-white/30 hover:text-white hover:bg-white/5"
                  }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="aspect-[3/4.5] bg-white/5 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : showEmptyState ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/5">
              <Users className="w-10 h-10 text-amber-500/40" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-3">
              {activeFilter === 'My Rooms' ? 'No active sessions' : 'No rooms found'}
            </h2>
            <p className="text-white/30 text-xs max-w-xs mb-10 leading-relaxed font-bold uppercase tracking-widest">
              {activeFilter === 'My Rooms'
                ? "You haven't started a room yet. Create one to watch with friends!"
                : 'Currently there is no one here. Be the first to start a session!'}
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-3 px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-amber-900/20 transition-all hover:scale-105 active:scale-95 group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
              <span>Create Your First Room</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="group relative bg-[#111418] border border-white/5 rounded-[2rem] overflow-hidden transition-all duration-500 hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-900/10 hover:-translate-y-1 block cursor-pointer"
                onClick={() => window.location.href = `/community/watch/${room.id}`}
              >
                {/* Image Section */}
                <div className="relative aspect-[3/4.5] w-full overflow-hidden">
                  <Image
                    src={room.image}
                    alt={room.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                    className="object-cover transition-transform duration-500"
                  />
                </div>

                {/* Content area */}
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <h3 className="text-sm font-black text-white group-hover:text-amber-500 transition-colors line-clamp-1 uppercase tracking-tight">{room.name}</h3>
                    <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      {room.anime}
                    </p>
                  </div>

                  {/* Metadata Bar */}
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                          <span className="text-[9px] font-black text-amber-500">CC</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{room.episode} EP</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{room.viewers}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${room.status === 'Live' ? 'bg-red-800 text-white shadow-lg shadow-red-900/20' :
                        room.status === 'Waiting...' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' :
                          'bg-white/5 text-white/30'
                      }`}>
                      {room.status}
                    </span>
                  </div>

                  {/* Host Info */}
                  <div className="flex items-center justify-between mt-1 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-white/10 ring-2 ring-white/5">
                        <Image
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.host}`}
                          alt={room.host}
                          width={28}
                          height={28}
                        />
                      </div>
                      <span className="text-[10px] font-black text-white/60 tracking-wider transition-colors">{room.host}</span>
                    </div>
                    <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{room.timeAgo}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-8 right-8 w-16 h-16 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-900/40 border border-amber-400/20 transition-all hover:scale-110 active:scale-95 group z-50 overflow-hidden"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Create Room Modal */}
        <RoomModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          animeId="one-piece"
          animeTitle="Live Watch Party"
          slug="one-piece"
        />

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
          
          body {
            font-family: 'Space Grotesk', sans-serif;
            background-color: #080B12;
            color: white;
          }
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }

          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </main>
    </div>
  );
}
