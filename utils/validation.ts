const MAX_BIO_LENGTH = 500;
const MAX_GAMES = 10;
const MAX_GAME_NAME_LENGTH = 40;
const MAX_RANK_LENGTH = 40;

export const validateUrl = (url: string): boolean => {
  const cleaned = url.trim();
  if (!cleaned) return true;
  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
};

export const validateBio = (bio: string): { ok: boolean; message?: string } => {
  const cleaned = bio.trim();
  if (!cleaned) return { ok: false, message: "La bio est obligatoire." };
  if (cleaned.length > MAX_BIO_LENGTH) {
    return { ok: false, message: `La bio doit faire au maximum ${MAX_BIO_LENGTH} caractères.` };
  }
  return { ok: true };
};

export const validateGames = (
  games: Array<{ name: string; rank: string }>,
): { ok: boolean; message?: string } => {
  const cleaned = games
    .map((g) => ({ name: g.name.trim(), rank: g.rank.trim() }))
    .filter((g) => g.name.length > 0);

  if (!cleaned.length) {
    return { ok: false, message: "Ajoute au moins un jeu." };
  }

  if (cleaned.length > MAX_GAMES) {
    return { ok: false, message: `Tu peux ajouter au maximum ${MAX_GAMES} jeux.` };
  }

  for (const g of cleaned) {
    if (g.name.length > MAX_GAME_NAME_LENGTH) {
      return {
        ok: false,
        message: `Le nom d’un jeu doit faire au maximum ${MAX_GAME_NAME_LENGTH} caractères.`,
      };
    }
    if (g.rank.length > MAX_RANK_LENGTH) {
      return {
        ok: false,
        message: `Le rang doit faire au maximum ${MAX_RANK_LENGTH} caractères.`,
      };
    }
  }

  const uniq = new Set(cleaned.map((g) => g.name.toLowerCase()));
  if (uniq.size !== cleaned.length) {
    return { ok: false, message: "Chaque jeu doit être unique." };
  }

  return { ok: true };
};

