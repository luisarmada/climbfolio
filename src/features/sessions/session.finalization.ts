import { Session, SessionMetadataInput } from '../../domain/models';

export type NormalizedSessionMetadata = {
  name: string;
  description: string | null;
};

export function getDefaultSessionName(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Morning session';
  }

  if (hour < 17) {
    return 'Afternoon Session';
  }

  return 'Evening Session';
}

export function normalizeSessionMetadata(input: SessionMetadataInput = {}, fallbackDate = new Date()): NormalizedSessionMetadata {
  const name = input.name?.trim() || getDefaultSessionName(fallbackDate);
  const description = input.description?.trim() || null;

  return { description, name };
}

export function getSessionDisplayName(session: Pick<Session, 'name' | 'startTime'>) {
  return session.name ?? getDefaultSessionName(new Date(session.startTime));
}
