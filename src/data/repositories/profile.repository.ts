import { ProfileBadgePreference, UpdateUserProfileInput, UserProfile } from '../../domain/models';
import { nowIso } from '../../utils/dates';
import { initializeDatabase } from '../db/client';

const localProfileId = 'local_profile';

type UserProfileRow = {
  id: string;
  display_name: string;
  climber_type: string;
  badge_preference: string;
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
  climberType: 'Indoor boulderer',
  displayName: 'Local Climber',
};

const badgePreferences: ProfileBadgePreference[] = ['best_grade', 'sessions', 'weekly_streak', 'local_only'];

function isBadgePreference(value: string): value is ProfileBadgePreference {
  return badgePreferences.includes(value as ProfileBadgePreference);
}

function mapProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    badgePreference: isBadgePreference(row.badge_preference) ? row.badge_preference : defaultProfile.badgePreference,
    climberType: row.climber_type,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    displayName: row.display_name,
    updatedAt: row.updated_at,
  };
}

async function createDefaultProfile() {
  const database = await initializeDatabase();
  const timestamp = nowIso();
  const profile: UserProfile = {
    id: localProfileId,
    badgePreference: defaultProfile.badgePreference,
    climberType: defaultProfile.climberType,
    createdAt: timestamp,
    deletedAt: null,
    displayName: defaultProfile.displayName,
    updatedAt: timestamp,
  };

  await database.runAsync(
    `
      INSERT INTO user_profile (
        id, display_name, climber_type, badge_preference, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    [
      profile.id,
      profile.displayName,
      profile.climberType,
      profile.badgePreference,
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
      badgePreference: input.badgePreference ?? current.badgePreference,
      climberType: input.climberType?.trim() || current.climberType,
      displayName: input.displayName?.trim() || current.displayName,
      updatedAt,
    };

    await database.runAsync(
      `
        UPDATE user_profile
        SET display_name = ?, climber_type = ?, badge_preference = ?, updated_at = ?
        WHERE id = ?;
      `,
      [next.displayName, next.climberType, next.badgePreference, next.updatedAt, next.id],
    );

    return next;
  },
};
