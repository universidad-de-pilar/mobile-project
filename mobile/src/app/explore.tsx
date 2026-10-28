
import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/edukit/button';
import { Card } from '@/components/ui/edukit/card';
import { Comment } from '@/components/ui/edukit/comment';
import { FeedbackState } from '@/components/ui/edukit/feedback-state';
import { TextField } from '@/components/ui/edukit/text-field';
import {
  EduKitColors,
  EduKitLayout,
  EduKitSpacing,
} from '@/components/ui/edukit/tokens';

export default function ExploreScreen() {
  const [name, setName] = useState('');
  const [showError, setShowError] = useState(false);
  const [feedback, setFeedback] = useState<'loading' | 'empty' | 'error'>('empty');
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>EDUKIT · SISTEMA VISUAL</Text>
        <Text style={styles.title}>Componentes reutilizables</Text>
        <Text style={styles.description}>
          Demostración de los controles y estados compartidos de EduKit.
        </Text>

        <Text style={styles.sectionTitle}>Botones</Text>
        <View style={styles.group}>
          <Button title="Principal" onPress={() => setFeedback('loading')} />
          <Button title="Secundario" variant="secondary" onPress={() => setFeedback('empty')} />
          <Button title="Contorno" variant="outline" onPress={() => setFeedback('error')} />
          <Button title="Peligro" variant="danger" onPress={() => setShowError(true)} />
          <Button title="Cargando..." loading onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>Campo de texto</Text>
        <Card>
          <TextField
            label="Nombre"
            placeholder="Escribí tu nombre"
            value={name}
            onChangeText={(value) => {
              setName(value);
              setShowError(false);
            }}
            error={showError ? 'Este es un mensaje de ejemplo.' : undefined}
          />
          <Button
            title="Validar campo"
            variant="outline"
            onPress={() => setShowError(name.trim().length === 0)}
          />
        </Card>

        <Text style={styles.sectionTitle}>Tarjeta</Text>
        <Card>
          <Text style={styles.cardTitle}>Catálogo EduKit</Text>
          <Text style={styles.body}>
            Una tarjeta reutilizable para presentar información y acciones.
          </Text>
          <Button title="Ver productos" onPress={() => router.push('/') } fullWidth />
        </Card>

        <Text style={styles.sectionTitle}>Comentario</Text>
        <Comment
          author="María"
          date="Hoy"
          message="La interfaz es clara y fácil de usar."
        />

        <Text style={styles.sectionTitle}>Estados de interfaz</Text>
        <View style={styles.group}>
          <Button title="Carga" variant="outline" onPress={() => setFeedback('loading')} />
          <Button title="Vacío" variant="outline" onPress={() => setFeedback('empty')} />
          <Button title="Error" variant="outline" onPress={() => setFeedback('error')} />
        </View>

        <FeedbackState
          type={feedback}
          title={
            feedback === 'loading'
              ? 'Cargando datos'
              : feedback === 'empty'
                ? 'Catálogo vacío'
                : 'No se pudo cargar'
          }
          message={
            feedback === 'loading'
              ? 'Esperá un momento.'
              : feedback === 'empty'
                ? 'Todavía no hay productos para mostrar.'
                : 'Comprobá la conexión e intentá nuevamente.'
          }
          actionLabel={feedback === 'loading' ? undefined : 'Reintentar'}
          onAction={feedback === 'error' ? () => setFeedback('loading') : () => setFeedback('empty')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: EduKitColors.background,
  },
  container: {
    width: '100%',
    maxWidth: EduKitLayout.contentMaxWidth,
    alignSelf: 'center',
    padding: EduKitLayout.screenPadding,
    paddingBottom: EduKitSpacing.xxl,
    gap: EduKitSpacing.md,
  },
  eyebrow: {
    color: EduKitColors.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  title: {
    color: EduKitColors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  description: {
    color: EduKitColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    color: EduKitColors.text,
    fontSize: 19,
    fontWeight: '700',
    marginTop: EduKitSpacing.md,
  },
  group: {
    gap: EduKitSpacing.sm,
  },
  cardTitle: {
    color: EduKitColors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  body: {
    color: EduKitColors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
});
