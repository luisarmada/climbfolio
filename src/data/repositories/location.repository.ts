import { ClimbingLocation, ClimbingLocationType, CreateClimbingLocationInput, UpdateClimbingLocationInput } from '../../domain/models';
import { nowIso } from '../../utils/dates';
import { createLocalId } from '../../utils/ids';
import { initializeDatabase } from '../db/client';

type LocationRow = {
  created_at: string;
  deleted_at: string | null;
  grading_scale_id: string;
  id: string;
  is_selected: number;
  name: string;
  type: string;
  updated_at: string;
};

export type LocationRepository = {
  create(input: CreateClimbingLocationInput): Promise<ClimbingLocation>;
  getSelected(): Promise<ClimbingLocation | null>;
  list(): Promise<ClimbingLocation[]>;
  remove(locationId: string): Promise<ClimbingLocation | null>;
  select(locationId: string | null): Promise<ClimbingLocation | null>;
  update(locationId: string, input: UpdateClimbingLocationInput): Promise<ClimbingLocation | null>;
};

function normalizeLocationType(value: string): ClimbingLocationType {
  return value === 'gym' || value === 'outdoor' || value === 'other' ? value : 'other';
}

function mapLocation(row: LocationRow): ClimbingLocation {
  return {
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
    gradingScaleId: row.grading_scale_id,
    id: row.id,
    isSelected: Boolean(row.is_selected),
    name: row.name,
    type: normalizeLocationType(row.type),
    updatedAt: row.updated_at,
  };
}

export const locationRepository: LocationRepository = {
  async create(input) {
    const database = await initializeDatabase();
    const timestamp = nowIso();
    const location: ClimbingLocation = {
      createdAt: timestamp,
      deletedAt: null,
      gradingScaleId: input.gradingScaleId,
      id: input.id ?? createLocalId('location'),
      isSelected: Boolean(input.isSelected),
      name: input.name.trim(),
      type: input.type,
      updatedAt: timestamp,
    };

    await database.withTransactionAsync(async () => {
      if (location.isSelected) {
        await database.runAsync('UPDATE climbing_locations SET is_selected = 0 WHERE deleted_at IS NULL;');
      }

      await database.runAsync(
        `
          INSERT INTO climbing_locations (
            id, name, type, grading_scale_id, is_selected, created_at, updated_at, deleted_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `,
        [
          location.id,
          location.name,
          location.type,
          location.gradingScaleId,
          location.isSelected ? 1 : 0,
          location.createdAt,
          location.updatedAt,
          location.deletedAt,
        ],
      );
    });

    return location;
  },

  async getSelected() {
    const database = await initializeDatabase();
    const row = await database.getFirstAsync<LocationRow>(`
      SELECT * FROM climbing_locations
      WHERE is_selected = 1 AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1;
    `);

    return row ? mapLocation(row) : null;
  },

  async list() {
    const database = await initializeDatabase();
    const rows = await database.getAllAsync<LocationRow>(`
      SELECT * FROM climbing_locations
      WHERE deleted_at IS NULL
      ORDER BY is_selected DESC, name ASC;
    `);

    return rows.map(mapLocation);
  },

  async remove(locationId) {
    return locationRepository.update(locationId, { deletedAt: nowIso(), isSelected: false });
  },

  async select(locationId) {
    const database = await initializeDatabase();

    await database.withTransactionAsync(async () => {
      await database.runAsync('UPDATE climbing_locations SET is_selected = 0 WHERE deleted_at IS NULL;');

      if (!locationId) {
        return;
      }

      await database.runAsync('UPDATE climbing_locations SET is_selected = 1, updated_at = ? WHERE id = ? AND deleted_at IS NULL;', [
        nowIso(),
        locationId,
      ]);
    });

    if (!locationId) {
      return null;
    }

    return locationRepository.getSelected();
  },

  async update(locationId, input) {
    const database = await initializeDatabase();
    const current = await database.getFirstAsync<LocationRow>('SELECT * FROM climbing_locations WHERE id = ? AND deleted_at IS NULL LIMIT 1;', [
      locationId,
    ]);

    if (!current) {
      return null;
    }

    const next: ClimbingLocation = {
      ...mapLocation(current),
      deletedAt: input.deletedAt === undefined ? current.deleted_at : input.deletedAt,
      gradingScaleId: input.gradingScaleId ?? current.grading_scale_id,
      isSelected: input.isSelected === undefined ? Boolean(current.is_selected) : input.isSelected,
      name: input.name?.trim() ?? current.name,
      type: input.type ?? normalizeLocationType(current.type),
      updatedAt: nowIso(),
    };

    await database.withTransactionAsync(async () => {
      if (next.isSelected) {
        await database.runAsync('UPDATE climbing_locations SET is_selected = 0 WHERE deleted_at IS NULL;');
      }

      await database.runAsync(
        `
          UPDATE climbing_locations
          SET name = ?, type = ?, grading_scale_id = ?, is_selected = ?, deleted_at = ?, updated_at = ?
          WHERE id = ?;
        `,
        [next.name, next.type, next.gradingScaleId, next.isSelected ? 1 : 0, next.deletedAt, next.updatedAt, next.id],
      );
    });

    return next.deletedAt ? null : next;
  },
};
