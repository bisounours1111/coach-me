export type Game = {
  name: string;
  rank: string;
};

export type CoachSocialLinks = {
  website?: string;
  youtube?: string;
  twitch?: string;
  twitter?: string;
  discord?: string;
};

export interface CoachProfile {
  id: string;
  bio: string | null;
  games: string[] | null;
  ranks: Record<string, string> | null;
  social_links: CoachSocialLinks | null;
  video_urls: string[] | null;
}

export type ProfileFormData = {
  games: Game[];
  bio: string;
  videoUrl: string;
  contact: CoachSocialLinks;
};

export type ProfileFieldErrors = Partial<
  Record<
    | "games"
    | "bio"
    | "videoUrl"
    | "contact.website"
    | "contact.youtube"
    | "contact.twitch"
    | "contact.twitter"
    | "contact.discord",
    string
  >
>;

