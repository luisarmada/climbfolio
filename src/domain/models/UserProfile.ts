export type ProfileBadgePreference = 'best_grade';
export type ProfileFlairId = 'best_grade' | 'contributor' | 'founder' | 'supporter';

export type UserProfile = {
  id: string;
  userId: string;
  displayName: string;
  tagline: string;
  badgePreference: ProfileBadgePreference;
  profilePictureId: string;
  selectedFlairIds: ProfileFlairId[];
  showStreakFlair: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type UpdateUserProfileInput = {
  badgePreference?: ProfileBadgePreference;
  displayName?: string;
  profilePictureId?: string;
  selectedFlairIds?: ProfileFlairId[];
  showStreakFlair?: boolean;
  tagline?: string;
};
