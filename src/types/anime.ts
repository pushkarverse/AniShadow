export interface AnimeTitle {
  english?: string;
  userPreferred?: string;
  romaji?: string;
  native?: string;
}

export interface Episode {
  id: string;
  number: number;
  title?: string;
  image?: string;
  description?: string;
  url?: string;
}

export interface AnimeDetails {
  id: string;
  title: string | AnimeTitle;
  image?: string;
  cover?: string;
  description?: string;
  status?: string;
  releaseDate?: string;
  genres?: string[];
  totalEpisodes?: number;
  currentEpisode?: number;
  type?: string;
  rating?: number;
  episodes?: Episode[];
}

export interface AnimeResult {
  id: string;
  title: string | AnimeTitle;
  image?: string;
  type?: string;
  rating?: number;
  [key: string]: unknown;
}

export interface HeroResult {
    id: string;
    title: { romaji?: string; english?: string; native?: string };
    image: string;
    cover: string;
    description: string;
    genres: string[];
    type: string;
    rating: number;
    releaseDate: string | number;
    episodeNumber: number;
    subEpisodes?: number;
    dubEpisodes?: number;
}
