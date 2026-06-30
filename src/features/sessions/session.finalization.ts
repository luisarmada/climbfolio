import { Session, SessionMetadataInput } from '../../domain/models';
import { inputLimits, normalizeMultilineInput, normalizeSingleLineInput } from '../../utils/inputValidation';

export type NormalizedSessionMetadata = {
  name: string;
  description: string | null;
};

export function getDefaultSessionName(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Morning climbing session 🌅';
  }

  if (hour < 17) {
    return 'Afternoon climbing session ☀️';
  }

  return 'Evening climbing session 🌙';
}

export function normalizeSessionMetadata(input: SessionMetadataInput = {}, fallbackDate = new Date()): NormalizedSessionMetadata {
  const name = normalizeSingleLineInput(input.name, inputLimits.sessionName) || getDefaultSessionName(fallbackDate);
  const description = normalizeMultilineInput(input.description, inputLimits.sessionDescription) || null;

  return { description, name };
}

export function getSessionDisplayName(session: Pick<Session, 'name' | 'startTime'>) {
  return session.name ?? getDefaultSessionName(new Date(session.startTime));
}
