export type ProfileBadgePreference = 'best_grade';

export type UserProfile = {
  id: string;
  displayName: string;
  tagline: string;
  badgePreference: ProfileBadgePreference;
  profilePictureId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type UpdateUserProfileInput = {
  badgePreference?: ProfileBadgePreference;
  displayName?: string;
  profilePictureId?: string;
  tagline?: string;
};
