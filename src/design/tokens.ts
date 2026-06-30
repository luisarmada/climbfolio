export const colors = {
  chalk: '#FAF7F1',
  surface: '#FFFDF8',
  surfaceSoft: '#FBF7EF',
  charcoal: '#1E1E1E',
  muted: '#7A7670',
  stone: '#E5DED4',
  stoneDark: '#D8D0C6',
  mint: '#A8DDBF',
  amber: '#FFD166',
  lavender: '#B999F2',
  coral: '#FF9666',
  sky: '#A8DADC',
  success: '#58AA81',
  track: '#EDE7DF',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  md: 14,
  lg: 18,
  xl: 23,
  xxl: 28,
  pill: 999,
} as const;

export const fonts = {
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  medium: 'Manrope_500Medium',
  regular: 'Manrope_400Regular',
  semiBold: 'Manrope_600SemiBold',
} as const;

export const typography = {
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '800' as const,
    letterSpacing: 0,
  },
  compactTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: '800' as const,
    letterSpacing: 0,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '800' as const,
    letterSpacing: 0,
  },
  h2: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '800' as const,
    letterSpacing: 0,
  },
  stat: {
    fontFamily: fonts.extraBold,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
} as const;

export const shadow = {
  shadowColor: '#352D24',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.06,
  shadowRadius: 28,
  elevation: 2,
} as const;
