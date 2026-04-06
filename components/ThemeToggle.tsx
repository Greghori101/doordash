import React from 'react';
import { Pressable, Text } from 'react-native';

import { useAppTheme } from '@/src/theme/theme';

export function ThemeToggle() {
  const { preference, cyclePreference, colors } = useAppTheme();

  return (
    <Pressable
      onPress={cyclePreference}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderCurve: 'continuous',
        backgroundColor: colors.secondary,
      }}
    >
      <Text selectable style={{ fontWeight: '800', color: colors.text }}>
        {preference}
      </Text>
    </Pressable>
  );
}

