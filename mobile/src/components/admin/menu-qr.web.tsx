import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/mostrador/button';
import { Colors, Fonts, Radius, Spacing, Typography } from '@/components/ui/mostrador/tokens';

// Nivel Q y zona de silencio de 4 módulos: resiste impresiones gastadas y se lee a distancia.
const OPTIONS = { errorCorrectionLevel: 'Q', margin: 4 } as const;
const PNG_SIZE = 2048;

function fileName(url: string, ext: string) {
  let slug = 'menu';
  try {
    slug = new URL(url).pathname.replace(/\//g, '') || slug;
  } catch {}
  return `qr-${slug}.${ext}`;
}

function download(href: string, name: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

export function MenuQr({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toString(url, { ...OPTIONS, type: 'svg' })
      .then((markup) => active && setSvg(`data:image/svg+xml;utf8,${encodeURIComponent(markup)}`))
      .catch(() => active && setSvg(null));
    return () => {
      active = false;
    };
  }, [url]);

  async function downloadPng() {
    download(await QRCode.toDataURL(url, { ...OPTIONS, width: PNG_SIZE }), fileName(url, 'png'));
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>QR del menú digital</Text>
      {svg ? <Image source={{ uri: svg }} accessibilityLabel={`Código QR hacia ${url}`} style={styles.qr} /> : <View style={styles.qr} />}
      <Text style={styles.helper}>Imprimilo para mesas, mostrador o vidriera. El PNG sirve para redes y el SVG para imprenta.</Text>
      <View style={styles.actions}>
        <Button title="Descargar PNG" variant="secondary" size="sm" onPress={() => void downloadPng()} disabled={!svg} style={styles.action} />
        <Button title="Descargar SVG" variant="secondary" size="sm" onPress={() => svg && download(svg, fileName(url, 'svg'))} disabled={!svg} style={styles.action} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: Spacing.md, padding: Spacing.lg, borderRadius: Radius.lg, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  title: { color: Colors.ink, fontFamily: Fonts.subtitle, fontSize: Typography.regular },
  qr: { alignSelf: 'center', width: 200, height: 200 },
  helper: { color: Colors.muted, fontFamily: Fonts.body, fontSize: Typography.small },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  action: { flex: 1 },
});
