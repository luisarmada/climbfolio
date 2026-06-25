import { Svg, Path, Circle } from 'react-native-svg';
import { climbColours, featureHasIcon, getKnownFeature } from '../features/climbs';

type HoldIconProps = {
  colours?: string[] | string | null;
  holdType?: string | null;
  size?: number;
};

type SvgHoldProps = {
  primary: string;
  secondary: string;
};

const defaultColour = '#4C8BD9';
const screwOuter = '#666A67';
const screwInner = '#B7B9B4';
const climberFill = '#1E1E1E';
const climberHighlight = '#FAF7F1';

function getColourValue(label?: string | null) {
  return climbColours.find((colour) => colour.label === label)?.value ?? defaultColour;
}

function normalizeColours(colours?: string[] | string | null) {
  if (Array.isArray(colours)) {
    return colours;
  }

  return colours?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

export function getMainFeature(featureValues: string[]) {
  for (const feature of featureValues) {
    const knownFeature = getKnownFeature(feature);

    if (knownFeature) {
      return knownFeature;
    }
  }

  return undefined;
}

export function getMainHoldType(holdTypeValues: string[]) {
  return getMainFeature(holdTypeValues);
}

export function HoldIcon({ colours, holdType, size = 42 }: HoldIconProps) {
  const selectedColours = normalizeColours(colours);
  const primary = getColourValue(selectedColours[0]);
  const secondary = getColourValue(selectedColours[1] ?? selectedColours[0]);
  const knownFeature = holdType ? getKnownFeature(holdType) : null;
  const Icon = knownFeature && featureHasIcon(knownFeature) ? holdSvgs[knownFeature as keyof typeof holdSvgs] : null;

  if (!Icon) {
    return null;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Icon primary={primary} secondary={secondary} />
    </Svg>
  );
}

function JugHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M12 35.5C12 22.7 21 14.5 34.9 14.5H45.3C50.6 14.5 54 18.2 54 23.1C54 39.4 43.6 49.5 28.7 49.5C18.5 49.5 12 43.9 12 35.5Z" fill={primary} />
      <Path d="M34.6 14.5H45.3C50.6 14.5 54 18.2 54 23.1C54 34.1 49.2 42.3 41.5 46.4C40.8 38.3 40.4 27.1 34.6 14.5Z" fill={secondary} />
      <Path d="M20.5 34.4C20.5 28 25.5 23.6 33.6 23.6H42.3C44.5 23.6 46 25.1 46 27.2C46 34.8 39.9 40.6 31.6 40.6C24.8 40.6 20.5 38 20.5 34.4Z" fill="#000" fillOpacity={0.1} />
      <Path d="M21.7 23.3C28.2 19.8 36.7 19 44.8 20.9" stroke="#FFF" strokeOpacity={0.22} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx={36.6} cy={31.8} r={4.15} fill={screwOuter} />
      <Circle cx={36.6} cy={31.8} r={2.05} fill={screwInner} />
    </>
  );
}

function CrimpHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M9.5 34.2C10.6 29.2 14.8 25.1 20.8 24.1L48.9 19.4C52.4 18.8 55.1 21.5 54.6 24.9L54 29.1C53.3 33.7 49.4 37 44.8 37H15.4C11.5 37 8.8 36.3 9.5 34.2Z" fill={primary} />
      <Path d="M34.4 21.8L48.9 19.4C52.4 18.8 55.1 21.5 54.6 24.9L54 29.1C53.3 33.7 49.4 37 44.8 37H33.7C36.1 32.5 36.1 26.7 34.4 21.8Z" fill={secondary} />
      <Path d="M16.4 31.1C25.8 29.9 37.1 28.9 49.3 28.8" stroke="#FFF" strokeOpacity={0.2} strokeWidth={2} strokeLinecap="round" />
      <Path d="M19.4 24C28.4 21.6 38 20.8 49 21.1" stroke="#FFF" strokeOpacity={0.12} strokeWidth={1.7} strokeLinecap="round" />
      <Circle cx={37.7} cy={28.3} r={3.95} fill={screwOuter} />
      <Circle cx={37.7} cy={28.3} r={1.95} fill={screwInner} />
    </>
  );
}

function SloperHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M13 36.2C13 23.9 22.2 15 35.9 15C47.8 15 55 22.2 55 33.1C55 43.8 46.3 49.5 32.8 49.5C20.7 49.5 13 44.5 13 36.2Z" fill={primary} />
      <Path d="M36 15C47.8 15 55 22.2 55 33.1C55 42 49 47.4 39.4 49C42.2 39.2 43 26.6 36 15Z" fill={secondary} />
      <Path d="M20.7 31.2C27.6 26.7 37.4 24.7 47.5 26.1" stroke="#FFF" strokeOpacity={0.22} strokeWidth={2.1} strokeLinecap="round" />
      <Path d="M21.6 40.6C29.2 42.9 38.7 42.4 46.9 37.9" stroke="#000" strokeOpacity={0.07} strokeWidth={3.2} strokeLinecap="round" />
      <Circle cx={36.6} cy={32.7} r={4.05} fill={screwOuter} />
      <Circle cx={36.6} cy={32.7} r={2} fill={screwInner} />
    </>
  );
}

function PinchHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M9.5 31.1C9.5 24.7 14.2 20.1 20.8 20.1H24.7C27 20.1 29.1 19.5 31.1 18.2L32.9 17C35.1 15.6 37.7 14.9 40.3 14.9H43.5C50.1 14.9 54.5 19.3 54.5 25.7V36.4C54.5 42.8 50 47.1 43.4 47.1H40.2C37.5 47.1 34.9 46.4 32.7 45L31.2 44C29.2 42.8 27 42.2 24.7 42.2H20.8C14.1 42.2 9.5 37.6 9.5 31.1Z" fill={primary} />
      <Path d="M32.9 17C35.1 15.6 37.7 14.9 40.3 14.9H43.5C50.1 14.9 54.5 19.3 54.5 25.7V36.4C54.5 42.8 50 47.1 43.4 47.1H40.2C37.5 47.1 34.9 46.4 32.7 45L31.7 44.4C34.6 36.6 34.8 25.8 32.9 17Z" fill={secondary} />
      <Path d="M11.6 30.8C14.3 24.6 22.1 22.2 31.8 22.2C41.4 22.2 48.9 24.5 52.2 30.1" stroke="#FFF" strokeOpacity={0.18} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 35.7C15.7 38.5 22.3 39.8 31.9 39.8C41.4 39.8 47.7 38.6 51.4 35.9" stroke="#000" strokeOpacity={0.08} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M25.8 20.8C25.1 24.1 24.8 27.4 24.8 30.8C24.8 34.6 25.1 38 26 41.4" stroke="#000" strokeOpacity={0.05} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M38.3 20.6C39 24 39.3 27.4 39.3 30.9C39.3 34.5 39 37.8 38.2 41" stroke="#000" strokeOpacity={0.05} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={32} cy={31} r={4.05} fill={screwOuter} />
      <Circle cx={32} cy={31} r={2} fill={screwInner} />
    </>
  );
}

function PocketHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M11 35.4C11 23.8 20 15 34.1 15C45.8 15 53.4 21.8 53.4 32.6C53.4 43.8 44.8 50.1 31.5 50.1C18.6 50.1 11 44.8 11 35.4Z" fill={primary} />
      <Path d="M34.1 15C45.8 15 53.4 21.8 53.4 32.6C53.4 42 47.3 48 37.3 49.7C40.2 38.5 41.3 26.3 34.1 15Z" fill={secondary} />
      <Path d="M22.2 30.9C22.2 25.7 26.6 22.1 32.3 22.1C36.8 22.1 39.9 24.9 39.9 29C39.9 34.2 35.8 37.8 30.3 37.8C25.9 37.8 22.2 35 22.2 30.9Z" fill="#000" fillOpacity={0.16} />
      <Path d="M20.6 22.6C27.5 18 38.3 18 45.3 22.5" stroke="#FFF" strokeOpacity={0.2} strokeWidth={2.1} strokeLinecap="round" />
      <Circle cx={35.2} cy={40} r={4.05} fill={screwOuter} />
      <Circle cx={35.2} cy={40} r={2} fill={screwInner} />
    </>
  );
}

function UndercutHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M10 30.6C10 22.2 16.8 16 25.7 16H42.6C49.5 16 54 21.1 54 27.4C54 31.4 52.3 35.5 49.2 39.6C45.3 44.8 39.3 49.4 31.3 49.4C18.8 49.4 10 42.2 10 30.6Z" fill={primary} />
      <Path d="M33 16H42.6C49.5 16 54 21.1 54 27.4C54 31.4 52.3 35.5 49.2 39.6C46.7 43 43.2 46.1 38.9 47.8C41.2 38.1 40.8 26.5 33 16Z" fill={secondary} />
      <Path d="M17.5 29.2C17.5 26.8 19.6 25.2 22.9 25.2H42.1C44.9 25.2 46.6 27.6 45.6 30C43 36.3 37.2 40.8 28.9 40.8C22.2 40.8 17.5 36.8 17.5 29.2Z" fill="#000" fillOpacity={0.15} />
      <Path d="M17.6 25.3H45.3" stroke="#FFF" strokeOpacity={0.18} strokeWidth={2} strokeLinecap="round" />
      <Path d="M19.6 39.9C25 43.8 32.4 44.9 40.2 41.9C43 40.9 45.7 39.1 48 36.8" stroke="#FFF" strokeOpacity={0.15} strokeWidth={2} strokeLinecap="round" />
      <Path d="M20.3 19.2C26 17.3 33.5 17 40.4 17.8" stroke="#000" strokeOpacity={0.05} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={36.4} cy={30.9} r={4.05} fill={screwOuter} />
      <Circle cx={36.4} cy={30.9} r={2} fill={screwInner} />
    </>
  );
}

function JibHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M19.5 35.1C19.5 28.4 24.6 23.6 31.3 23.6H36.6C42.3 23.6 46.3 27.4 46.3 32.6C46.3 39.5 40.7 44.3 33.4 44.3C25.6 44.3 19.5 40.7 19.5 35.1Z" fill={primary} />
      <Path d="M34 23.6H36.6C42.3 23.6 46.3 27.4 46.3 32.6C46.3 38.6 42 43.1 35.8 44.1C37.5 37.5 38.3 30.6 34 23.6Z" fill={secondary} />
      <Path d="M24.1 31.3C27.3 28.9 31.7 27.9 36.3 28.5" stroke="#FFF" strokeOpacity={0.18} strokeWidth={1.9} strokeLinecap="round" />
      <Path d="M24.6 38.6C28 40.3 32.5 40.6 36.8 39.5" stroke="#000" strokeOpacity={0.07} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={33.2} cy={34} r={3.7} fill={screwOuter} />
      <Circle cx={33.2} cy={34} r={1.8} fill={screwInner} />
    </>
  );
}

function SidepullHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M18.2 15.5H39.6C47.8 15.5 53.2 21.1 53.2 29.3V35.2C53.2 43.9 47.4 49.6 38.7 49.6H25.4C16.8 49.6 11 43.8 11 35.3C11 26.1 13.9 19.2 18.2 15.5Z" fill={primary} />
      <Path d="M36.8 15.5H39.6C47.8 15.5 53.2 21.1 53.2 29.3V35.2C53.2 43.9 47.4 49.6 38.7 49.6H33.9C38.1 39.2 39.3 26.4 36.8 15.5Z" fill={secondary} />
      <Path d="M20.4 22.5C17.2 28.1 16.1 36.1 18.8 43.5" stroke="#FFF" strokeOpacity={0.2} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M31.6 22.6C27.4 29.2 26.9 37.9 30.3 45" stroke="#000" strokeOpacity={0.12} strokeWidth={5.2} strokeLinecap="round" />
      <Circle cx={37.7} cy={32.5} r={4.05} fill={screwOuter} />
      <Circle cx={37.7} cy={32.5} r={2} fill={screwInner} />
    </>
  );
}

function GastonHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M10.8 34.7C12.5 25.2 20.3 17.7 31.7 15.9L45.6 13.7C50.9 12.9 55.3 17 54.5 22.3L51.8 40.1C51.1 44.7 47.2 48.1 42.4 48.1H23.7C15.2 48.1 9.4 42.7 10.8 34.7Z" fill={primary} />
      <Path d="M32.8 15.7L45.6 13.7C50.9 12.9 55.3 17 54.5 22.3L51.8 40.1C51.1 44.7 47.2 48.1 42.4 48.1H35.5C39.3 37.9 38.5 25.7 32.8 15.7Z" fill={secondary} />
      <Path d="M17.8 39.7C25.2 36 34.5 30.1 45.7 21.9" stroke="#FFF" strokeOpacity={0.2} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M23.4 24.8C27.7 28.9 30.2 35.3 30.8 43.5" stroke="#000" strokeOpacity={0.1} strokeWidth={4.6} strokeLinecap="round" />
      <Circle cx={38.8} cy={31.2} r={4.05} fill={screwOuter} />
      <Circle cx={38.8} cy={31.2} r={2} fill={screwInner} />
    </>
  );
}

function VolumeHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M8.8 42.2L26.6 12.2C28.5 9 33.2 8.9 35.3 12L55.6 42.1C58 45.7 55.4 50.5 51 50.5H13.6C9.4 50.5 6.7 45.8 8.8 42.2Z" fill={primary} />
      <Path d="M31.9 10.5C33.2 10.6 34.4 11.2 35.3 12L55.6 42.1C58 45.7 55.4 50.5 51 50.5H31.9V10.5Z" fill={secondary} />
      <Path d="M31.9 12.3V50.1" stroke="#000" strokeOpacity={0.11} strokeWidth={2} strokeLinecap="round" />
      <Path d="M15 43.8L31.8 15.9L50.6 43.8" stroke="#FFF" strokeOpacity={0.18} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={32} cy={35.4} r={4.05} fill={screwOuter} />
      <Circle cx={32} cy={35.4} r={2} fill={screwInner} />
    </>
  );
}

function RailHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M8.8 33.1C9.6 26.7 14.9 22.1 21.4 22.1H49.2C53.4 22.1 56 25.6 54.8 29.7L52.9 36.3C51.7 40.5 47.8 43.3 43.5 43.3H14.6C10.8 43.3 8.3 36.8 8.8 33.1Z" fill={primary} />
      <Path d="M33.1 22.1H49.2C53.4 22.1 56 25.6 54.8 29.7L52.9 36.3C51.7 40.5 47.8 43.3 43.5 43.3H31.9C34.1 36.6 34.6 29.5 33.1 22.1Z" fill={secondary} />
      <Path d="M15.5 28.9H49" stroke="#FFF" strokeOpacity={0.22} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M14.1 38C25.2 39 37.6 38.8 50.2 36.9" stroke="#000" strokeOpacity={0.08} strokeWidth={3.2} strokeLinecap="round" />
      <Circle cx={31.8} cy={32.8} r={4.05} fill={screwOuter} />
      <Circle cx={31.8} cy={32.8} r={2} fill={screwInner} />
    </>
  );
}

function CrackHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M11.7 43.2C12.9 27.2 22.5 15 36.4 15H44C50.2 15 54.5 19.5 54.5 25.6C54.5 39.6 44.7 49.6 30.1 49.6H17.5C13.9 49.6 11.4 46.8 11.7 43.2Z" fill={primary} />
      <Path d="M35.1 15H44C50.2 15 54.5 19.5 54.5 25.6C54.5 38.6 46.1 48.1 33.3 49.5C37.8 39.2 38.6 26.2 35.1 15Z" fill={secondary} />
      <Path d="M31.3 16.4C26.8 23.8 28.9 29.4 25.2 35C22.3 39.4 23.6 43.2 20.4 48.2" stroke="#121212" strokeOpacity={0.42} strokeWidth={5.4} strokeLinecap="round" />
      <Path d="M34 17C30.6 24.4 32.8 30.5 29.1 36.2C26.9 39.5 27.7 43.2 24.8 48" stroke="#FFF" strokeOpacity={0.15} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={40.5} cy={32.4} r={4.05} fill={screwOuter} />
      <Circle cx={40.5} cy={32.4} r={2} fill={screwInner} />
    </>
  );
}

function DualtexHoldSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M12.4 35.8C12.4 23.1 21.5 14.6 34.2 14.6H43.8C50.4 14.6 54.8 19.4 54.8 25.8C54.8 40.3 45.2 49.6 30.8 49.6C19.6 49.6 12.4 44.3 12.4 35.8Z" fill={primary} />
      <Path d="M34.3 14.6H43.8C50.4 14.6 54.8 19.4 54.8 25.8C54.8 40.3 45.2 49.6 30.8 49.6C29.7 49.6 28.6 49.6 27.6 49.4L34.3 14.6Z" fill={secondary} />
      <Path d="M34.3 14.6L27.6 49.4" stroke="#121212" strokeOpacity={0.16} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M19.8 25.5C24.6 22.3 30.8 20.9 38.8 21.4" stroke="#FFF" strokeOpacity={0.2} strokeWidth={2} strokeLinecap="round" />
      <Path d="M39.5 26.7C43.1 25.7 46.5 25.8 50 26.8" stroke="#FFF" strokeOpacity={0.13} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={37.2} cy={33.4} r={4.05} fill={screwOuter} />
      <Circle cx={37.2} cy={33.4} r={2} fill={screwInner} />
    </>
  );
}

function SlabFeatureSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M14 56L35 10H50L29 56H14Z" fill={primary} />
      <Path d="M36 10H50L29 56H21C29 42 34.4 25.8 36 10Z" fill={secondary} />
      <Path d="M20 50L38 14" stroke="#FFF" strokeOpacity={0.18} strokeWidth={2.1} strokeLinecap="round" />
      <Path d="M24.5 45.2L30.8 38.2L33 30.1" stroke={climberFill} strokeWidth={4.1} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M31.1 38.5L39 36" stroke={climberFill} strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M29.9 39L24.2 34.1" stroke={climberFill} strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M24.6 45L19.2 51.5" stroke={climberFill} strokeWidth={3.6} strokeLinecap="round" />
      <Path d="M25.1 45.1L30.8 52.1" stroke={climberFill} strokeWidth={3.6} strokeLinecap="round" />
      <Circle cx={34.2} cy={25.6} r={4.1} fill={climberFill} />
      <Circle cx={35.6} cy={24.4} r={1} fill={climberHighlight} fillOpacity={0.45} />
    </>
  );
}

function OverhangFeatureSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M8 16H54L46.4 34.4H13.8L8 16Z" fill={primary} />
      <Path d="M35.4 16H54L46.4 34.4H32.3C35 28.7 36.1 22.6 35.4 16Z" fill={secondary} />
      <Path d="M15 21.7C25.2 20.1 36.8 20.4 49.2 22.4" stroke="#FFF" strokeOpacity={0.2} strokeWidth={2.1} strokeLinecap="round" />
      <Path d="M35.4 33.5L30.1 41L24.5 45.8" stroke={climberFill} strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M30.2 40.7L39 42.7" stroke={climberFill} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M30.4 40.8L27.1 31.8" stroke={climberFill} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M24.5 45.6L19 52.2" stroke={climberFill} strokeWidth={3.6} strokeLinecap="round" />
      <Path d="M24.8 45.6L31.3 51.4" stroke={climberFill} strokeWidth={3.6} strokeLinecap="round" />
      <Circle cx={38.7} cy={30.4} r={4} fill={climberFill} />
      <Circle cx={39.9} cy={29.1} r={1} fill={climberHighlight} fillOpacity={0.45} />
    </>
  );
}

function CaveFeatureSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M9.2 50.5C10.4 30.5 22 13 42 13C51.1 13 56.2 18.3 56.2 25.3C56.2 34.1 48.8 39.7 38.4 39.7H29.8C24.5 39.7 21 43.6 20.3 50.5H9.2Z" fill={primary} />
      <Path d="M42 13C51.1 13 56.2 18.3 56.2 25.3C56.2 34.1 48.8 39.7 38.4 39.7H34.1C39.7 32.5 43.5 23.5 42 13Z" fill={secondary} />
      <Path d="M19.2 46.8C23.2 38.4 30.1 34.8 39.8 35.2" stroke="#000" strokeOpacity={0.12} strokeWidth={4} strokeLinecap="round" />
      <Path d="M18.4 28.4C24.8 19.6 35.8 16.4 47.4 20.1" stroke="#FFF" strokeOpacity={0.18} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M36 35.7L29.6 31L22.5 31.8" stroke={climberFill} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M30 31.3L34 23.8" stroke={climberFill} strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M30.1 31.4L32.8 40.3" stroke={climberFill} strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M22.6 31.8L16.4 27.2" stroke={climberFill} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M22.7 31.8L17.7 39.1" stroke={climberFill} strokeWidth={3.5} strokeLinecap="round" />
      <Circle cx={39.4} cy={38.3} r={4} fill={climberFill} />
      <Circle cx={40.7} cy={37.3} r={1} fill={climberHighlight} fillOpacity={0.45} />
    </>
  );
}

function DynoFeatureSvg({ primary, secondary }: SvgHoldProps) {
  return (
    <>
      <Path d="M13.4 47.2C14.4 35.2 23.6 27.6 36.7 27.6H47.5C51.8 27.6 54.8 30.5 54.8 34.7C54.8 44.9 46.3 52.2 33.7 52.2C21.2 52.2 12.7 48.9 13.4 47.2Z" fill={primary} fillOpacity={0.92} />
      <Path d="M36.7 27.6H47.5C51.8 27.6 54.8 30.5 54.8 34.7C54.8 42.5 49.7 48.7 41.1 51.1C42.5 43.7 42.1 35.2 36.7 27.6Z" fill={secondary} fillOpacity={0.95} />
      <Circle cx={49.2} cy={15.5} r={5.1} fill={secondary} />
      <Circle cx={49.2} cy={15.5} r={2.1} fill={screwOuter} fillOpacity={0.5} />
      <Path d="M12.8 20.6C17.7 15.7 24 13.7 31 14.9" stroke={primary} strokeWidth={3.2} strokeLinecap="round" strokeOpacity={0.55} />
      <Path d="M18.5 26.8C23.2 22.7 29 21.1 35.8 22.4" stroke={primary} strokeWidth={2.5} strokeLinecap="round" strokeOpacity={0.36} />
      <Path d="M29.1 35.2L35.1 28.5L44.6 20.2" stroke={climberFill} strokeWidth={4.1} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M35.2 28.8L27.4 23.9" stroke={climberFill} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M35.2 29L39.7 38.5" stroke={climberFill} strokeWidth={3.5} strokeLinecap="round" />
      <Path d="M29.2 35.1L20.9 38.9" stroke={climberFill} strokeWidth={3.6} strokeLinecap="round" />
      <Path d="M29.2 35.3L25.7 44.1" stroke={climberFill} strokeWidth={3.6} strokeLinecap="round" />
      <Circle cx={26.6} cy={31.9} r={4} fill={climberFill} />
      <Circle cx={27.8} cy={30.7} r={1} fill={climberHighlight} fillOpacity={0.45} />
    </>
  );
}

const holdSvgs = {
  Crimp: CrimpHoldSvg,
  Crack: CrackHoldSvg,
  Dualtex: DualtexHoldSvg,
  Gaston: GastonHoldSvg,
  Jib: JibHoldSvg,
  Jug: JugHoldSvg,
  Pinch: PinchHoldSvg,
  Pocket: PocketHoldSvg,
  Rail: RailHoldSvg,
  Sidepull: SidepullHoldSvg,
  Sloper: SloperHoldSvg,
  Undercling: UndercutHoldSvg,
  Volume: VolumeHoldSvg,
} as const;
