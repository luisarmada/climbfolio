import { ProfileBadgePreference, UpdateUserProfileInput, UserProfile } from '../../domain/models';
import { localUserId } from '../../domain/userIdentity';
import { defaultProfilePictureId } from '../../features/profile/profilePictures';
import { nowIso } from '../../utils/dates';
import { initializeDatabase } from '../db/client';

const localProfileId = 'local_profile';

type UserProfileRow = {
  id: string;
  user_id?: string | null;
  display_name: string;
  climber_type: string;
  badge_preference: string;
  profile_picture_uri?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProfileRepository = {
  getLocalProfile(): Promise<UserProfile>;
  updateLocalProfile(input: UpdateUserProfileInput): Promise<UserProfile>;
};

const defaultProfile = {
  badgePreference: 'best_grade' as ProfileBadgePreference,
  displayName: 'Local Climber',
  profilePictureId: defaultProfilePictureId,
  tagline: 'Indoor boulderer',
  userId: localUserId,
};

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    badgePreference: defaultProfile.badgePreference,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    displayName: row.display_name,
    profilePictureId: row.profile_picture_uri ?? defaultProfile.profilePictureId,
    tagline: row.climber_type,
    userId: row.user_id ?? defaultProfile.userId,
    updatedAt: row.updated_at,
  };
}

async function createDefaultProfile() {
  const database = await initializeDatabase();
  const timestamp = nowIso();
  const profile: UserProfile = {
    id: localProfileId,
    badgePreference: defaultProfile.badgePreference,
    createdAt: timestamp,
    deletedAt: null,
    displayName: defaultProfile.displayName,
    profilePictureId: defaultProfile.profilePictureId,
    tagline: defaultProfile.tagline,
    userId: defaultProfile.userId,
    updatedAt: timestamp,
  };

  await database.runAsync(
    `
      INSERT INTO user_profile (
        id, user_id, display_name, climber_type, badge_preference, profile_picture_uri, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    [
      profile.id,
      profile.userId,
      profile.displayName,
      profile.tagline,
      profile.badgePreference,
      profile.profilePictureId,
      profile.createdAt,
      profile.updatedAt,
      profile.deletedAt,
    ],
  );

  return profile;
}

export const profileRepository: ProfileRepository = {
  async getLocalProfile() {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<UserProfileRow>(
      'SELECT * FROM user_profile WHERE id = ? AND deleted_at IS NULL LIMIT 1;',
      [localProfileId],
    );

    return row ? mapProfile(row) : createDefaultProfile();
  },

  async updateLocalProfile(input) {
    const current = await profileRepository.getLocalProfile();
    const database = await initializeDatabase();
    const updatedAt = nowIso();
    const next: UserProfile = {
      ...current,
      badgePreference: defaultProfile.badgePreference,
      displayName: input.displayName?.trim() || current.displayName,
      profilePictureId: input.profilePictureId?.trim() || current.profilePictureId,
      tagline: input.tagline?.trim() || current.tagline,
      updatedAt,
    };

    await database.runAsync(
      `
        UPDATE user_profile
        SET display_name = ?, climber_type = ?, badge_preference = ?, profile_picture_uri = ?, updated_at = ?
        WHERE id = ?;
      `,
      [next.displayName, next.tagline, next.badgePreference, next.profilePictureId, next.updatedAt, next.id],
    );

    return next;
  },
};
