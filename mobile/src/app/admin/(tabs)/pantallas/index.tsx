import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListsTab } from '@/components/pantallas/lists-tab';
import { MediaTab } from '@/components/pantallas/media-tab';
import { ScreensTab } from '@/components/pantallas/screens-tab';
import { Chip } from '@/components/ui/mostrador/chip';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { Colors, Layout, Spacing } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';

const TABS = ['pantallas', 'listas', 'medios'] as const;
type Tab = (typeof TABS)[number];
const LABELS: Record<Tab, string> = { pantallas: 'Pantallas', listas: 'Listas', medios: 'Imágenes y videos' };

export default function ScreensHome() {
  const { store, me } = useSession();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(TABS.find((t) => t === params.tab) ?? 'pantallas');
  // Lists and media need content:read; without it only the screens tab exists.
  const tabs = me?.permissions.includes('content:read') ? TABS : TABS.slice(0, 1);

  return (
    <View style={styles.screen}>
      <TopBar title="Pantallas" store={store?.name} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {tabs.length > 1 ? (
          <View style={styles.tabs}>
            {tabs.map((t) => (
              <Chip key={t} label={LABELS[t]} active={tab === t} onPress={() => setTab(t)} />
            ))}
          </View>
        ) : null}
        {tab === 'pantallas' || tabs.length === 1 ? <ScreensTab /> : tab === 'listas' ? <ListsTab /> : <MediaTab />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Layout.screenPadding, gap: Spacing.md },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
