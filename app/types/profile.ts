export interface SocialLinks {
  website: string;
  youtube: string;
  twitch: string;
  twitter: string;
  discord: string;
}

export interface CoachProfile {
  id: string;
  fullName: string;
  avatarUrl: string;
  bio: string;
  socialLinks: SocialLinks;
}

export interface CoachingOffer {
  id?: string;
  profileGameRoleId?: string;
  hourlyRate: number | null;
  description: string;
  videoUrls: string[];
  isActive: boolean;
}

export interface CoachGameRole {
  id?: string;
  gameId: string;
  gameName: string;
  selected: boolean;
  isCoach: boolean;
  playerRankId: string | null;
  playerRankLabel?: string;
  offers: CoachingOffer[];
}

export interface GameOption {
  id: string;
  slug: string;
  name: string;
}

export interface CoachGameRolePayload {
  gameId: string;
  isCoach: boolean;
  playerRankId: string | null;
  offers: CoachingOffer[];
}

export interface GameRankOption {
  id: string;
  gameId: string;
  label: string;
  iconUrl?: string | null;
}

export interface ProfileFormData {
  fullName: string;
  avatarUrl: string;
  bio: string;
  socialLinks: SocialLinks;
}

export type ProfileFieldErrors = Record<string, string>;

// Legacy type kept for compatibility with older form widgets.
export interface Game {
  name: string;
  rank: string;
}
