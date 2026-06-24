import { Svg, Path, Circle } from 'react-native-svg';
import { climbColours, holdTypes } from '../features/climbs';

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

function getColourValue(label?: string | null) {
  return climbColours.find((colour) => colour.label === label)?.value ?? defaultColour;
}

function normalizeColours(colours?: string[] | string | null) {
  if (Array.isArray(colours)) {
    return colours;
  }

  return colours?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
}

export function getMainHoldType(holdTypeValues: string[]) {
  return holdTypeValues.find((holdType) => holdTypes.includes(holdType));
}

export function HoldIcon({ colours, holdType, size = 42 }: HoldIconProps) {
  const selectedColours = normalizeColours(colours);
  const primary = getColourValue(selectedColours[0]);
  const secondary = getColourValue(selectedColours[1] ?? selectedColours[0]);
  const Icon = holdSvgs[holdType as keyof typeof holdSvgs] ?? JugHoldSvg;

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

const holdSvgs = {
  Crimp: CrimpHoldSvg,
  Jib: JibHoldSvg,
  Jug: JugHoldSvg,
  Pinch: PinchHoldSvg,
  Pocket: PocketHoldSvg,
  Sloper: SloperHoldSvg,
  Undercut: UndercutHoldSvg,
} as const;
