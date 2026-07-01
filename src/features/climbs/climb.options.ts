import { fontScaleGrades, vScaleGrades } from '../../domain/gradeScales';

export const climbGrades = vScaleGrades;
export { fontScaleGrades, vScaleGrades };

export const holdContactFeatures = [
  'Jug',
  'Crimp',
  'Sloper',
  'Pinch',
  'Pocket',
  'Jib',
  'Undercling',
  'Sidepull',
  'Gaston',
  'Volume',
  'Rail',
  'Crack',
  'Dualtex',
];

export const wallTerrainFeatures = ['Slab', 'Overhang', 'Roof/Cave', 'Arete', 'Dihedral/Corner', 'Chimney', 'Traverse'];

export const movementStyleFeatures = [
  'Dyno',
  'Mantle',
  'Campus',
  'Compression',
  'Stemming/Bridging',
  'Layback',
  'Heel hook',
  'Toe hook',
  'Kneebar',
  'Rockover',
  'Smear/friction',
  'Coordination',
];

export const featureSections = [
  { features: holdContactFeatures, showIcons: true, title: 'Hold & Contact' },
  { features: wallTerrainFeatures, showIcons: false, title: 'Wall & Terrain' },
  { features: movementStyleFeatures, showIcons: false, title: 'Movement & Style' },
];

export const holdTypes = featureSections.flatMap((section) => section.features);

export const commonFeatures = [
  'Jug',
  'Crimp',
  'Sloper',
  'Pinch',
  'Pocket',
  'Slab',
  'Overhang',
  'Dyno',
  'Heel hook',
  'Toe hook',
];

export const maxAdditionalFeatures = 3;

const featureAliases: Record<string, string> = {
  Cave: 'Roof/Cave',
  Undercut: 'Undercling',
};

const featureSearchKeywords: Record<string, string[]> = {
  Jug: ['juggy', 'juggy hold', 'bucket'],
  Undercling: ['undercut', 'undercling hold'],
  'Roof/Cave': ['cave', 'roof', 'horizontal'],
  'Dihedral/Corner': ['dihedral', 'corner'],
  'Heel hook': ['heelhook', 'heel'],
  'Toe hook': ['toehook', 'toe'],
  Kneebar: ['knee bar', 'knee'],
  'Smear/friction': ['smear', 'smearing', 'friction'],
  'Stemming/Bridging': ['stemming', 'bridging', 'bridge'],
};

function normalizeSearchText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function normalizeFeature(feature: string) {
  return featureAliases[feature] ?? feature;
}

export function getKnownFeature(feature: string) {
  const normalizedFeature = normalizeFeature(feature);

  return holdTypes.includes(normalizedFeature) ? normalizedFeature : null;
}

export function featureHasIcon(feature: string) {
  return holdContactFeatures.includes(normalizeFeature(feature));
}

export function isCommonFeature(feature: string) {
  return commonFeatures.includes(normalizeFeature(feature));
}

export function getKnownFeatures(features: string[]) {
  const knownFeatures: string[] = [];

  for (const feature of features) {
    if (feature === warmUpHoldType) {
      continue;
    }

    const knownFeature = getKnownFeature(feature);

    if (knownFeature && !knownFeatures.includes(knownFeature)) {
      knownFeatures.push(knownFeature);
    }
  }

  return knownFeatures;
}

export function getAdditionalFeatures(features: string[]) {
  return getKnownFeatures(features).slice(1, maxAdditionalFeatures + 1);
}

export function buildFeatureSelection(mainFeature: string | null | undefined, additionalFeatures: string[] = []) {
  const knownMainFeature = mainFeature ? getKnownFeature(mainFeature) : null;
  const knownAdditionalFeatures = getKnownFeatures(additionalFeatures).filter((feature) => feature !== knownMainFeature);

  return knownMainFeature ? [knownMainFeature, ...knownAdditionalFeatures.slice(0, maxAdditionalFeatures)] : [];
}

export function matchesFeatureSearch(feature: string, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const normalizedFeature = normalizeFeature(feature);
  const searchableValues = [normalizedFeature, ...(featureSearchKeywords[normalizedFeature] ?? [])].map(normalizeSearchText);

  return searchableValues.some(
    (searchableValue) => searchableValue.includes(normalizedQuery) || normalizedQuery.includes(searchableValue),
  );
}

export const climbColours = [
  { label: 'Red', value: '#E85845' },
  { label: 'Blue', value: '#4C8BD9' },
  { label: 'Light blue', value: '#A8DADC' },
  { label: 'Green', value: '#58AA81' },
  { label: 'Yellow', value: '#FFD166' },
  { label: 'Purple', value: '#8F6ED5' },
  { label: 'Black', value: '#1E1E1E' },
  { label: 'Grey', value: '#8F969A' },
  { label: 'White', value: '#FFFFFF' },
  { label: 'Clear', value: 'rgba(218, 244, 255, 0.72)' },
  { label: 'Pink', value: '#F59AC7' },
  { label: 'Orange', value: '#FF9666' },
];

export const warmUpHoldType = 'Warm-up';
