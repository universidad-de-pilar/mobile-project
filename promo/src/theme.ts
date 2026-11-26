import { loadFont as loadJakarta } from '@remotion/google-fonts/PlusJakartaSans';
import { loadFont as loadDmSans } from '@remotion/google-fonts/DMSans';

// Values copied from mobile/src/components/ui/mostrador/tokens.ts
export const Colors = {
  ink: '#1C1917',
  primary: '#EA580C',
  primarySoft: '#FFEDD5',
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  muted: '#78716C',
  border: '#E7E5E4',
  success: '#16A34A',
  successSoft: '#DCFCE7',
} as const;

export const FPS = 30;
export const TRANSITION = 12;

export const Fonts = {
  title: loadJakarta('normal', { weights: ['700', '800'], subsets: ['latin'] }).fontFamily,
  body: loadDmSans('normal', { weights: ['400', '500', '700'], subsets: ['latin'] }).fontFamily,
};
