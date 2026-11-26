import React from 'react';
import { Colors, Fonts } from './theme';

export const StoreIcon: React.FC<{ size: number; bg?: string; fg?: string }> = ({
  size,
  bg = Colors.primary,
  fg = '#fff',
}) => (
  <svg width={size} height={size} viewBox="0 0 64 64">
    <rect width="64" height="64" rx="16" fill={bg} />
    <path d="M14 26 L18 15 H46 L50 26 Z" fill={fg} />
    <rect x="16" y="29" width="32" height="20" rx="2" fill={fg} />
    <rect x="27" y="35" width="10" height="14" rx="1.5" fill={bg} />
  </svg>
);

export const Logo: React.FC<{ size: number; dark?: boolean }> = ({ size, dark }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.28 }}>
    <StoreIcon size={size} bg={dark ? '#fff' : Colors.primary} fg={dark ? Colors.primary : '#fff'} />
    <span
      style={{
        fontFamily: Fonts.title,
        fontWeight: 800,
        fontSize: size * 0.95,
        letterSpacing: -2,
        color: dark ? '#fff' : Colors.ink,
      }}
    >
      Mostrador
    </span>
  </div>
);
