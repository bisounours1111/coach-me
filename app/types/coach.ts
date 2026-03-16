export interface CoachGameInfo {
  gameId: string;
  gameSlug: string;
  gameName: string;
  isCoach: boolean;
  playerRank: string | null;
  hourlyRate: number | null;
}

export interface CoachSearchResult {
  profileId: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  games: CoachGameInfo[];
  // Ces champs pourront être remplis plus tard via reviews
  averageRating?: number | null;
  reviewsCount?: number | null;
}

export interface CoachFilters {
  gameSlug: string | null;
  searchText: string;
}

