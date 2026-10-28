
import { Platform } from 'react-native';


export const EduKitColors = {
  primary: '#258A82',
  primaryDark: '#183D3B',
  primarySoft: '#E0F4EF',
  primarySubtle: '#EFF9F6',

  background: '#F5FAF8',
  surface: '#FFFFFF',
  border: '#C9E8E1',

  text: '#183D3B',
  textSecondary: '#536A68',
  textMuted: '#708582',

  success: '#28745F',
  warning: '#A86608',
  error: '#B42318',
  info: '#258A82',

  disabled: '#D8E6E2',
  disabledText: '#708582',
} as const;

export const EduKitSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const EduKitRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const EduKitTypography = {
  small: 12,
  body: 14,
  regular: 16,
  subtitle: 21,
  title: 30,
} as const;

export const EduKitLayout = {
  contentMaxWidth: 760,
  screenPadding: Platform.select({
    web: 24,
    default: 16,
  }) ?? 16,
} as const;
