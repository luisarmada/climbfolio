export type ProfileBadgePreference = 'best_grade' | 'sessions' | 'weekly_streak' | 'local_only';

export type UserProfile = {
  id: string;
  displayName: string;
  climberType: string;
  badgePreference: ProfileBadgePreference;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type UpdateUserProfileInput = {
  badgePreference?: ProfileBadgePreference;
  climberType?: string;
  displayName?: string;
};
