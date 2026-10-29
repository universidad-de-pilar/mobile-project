import { useCart } from '@/context/CartContext';

import { useRouter } from 'expo-router';

import { useState } from 'react';

import {

  ActivityIndicator,

  Alert,

  FlatList,

  Platform,

  Pressable,

  SafeAreaView,

  StyleSheet,

  Text,

  TextInput,

  View,

} from 'react-native';



const C = {

  ink: '#1C1917',

  orange: '#EA580C',

  cream: '#FAF7F2',

  whatsapp: '#25D366',

  white: '#FFFFFF',

  muted: '#78716C',

  border: '#E7DED3',

  softOrange: '#FFF0E5',

};



const S = {

  sm: 8,

  md: 16,

  lg: 24,

};



const API_URL =

  process.env.EXPO_PUBLIC_API_URL ||

  (Platform.OS === 'android'

    ? 'http://10.0.2.2:3000'

    : 'http://localhost:3000');



const TENANT_SLUG = process.env.EXPO_PUBLIC_TENANT_SLUG || 'local3';

const STORE_SLUG = process.env.EXPO_PUBLIC_STORE_SLUG || 'centro';



function ActionButton({

  title,

  onPress,

  disabled = false,

  secondary = false,

}: {

  title: string;

  onPress: () => void;

  disabled?: boolean;

  secondary?: boolean;

}) {

return (

  <Pressable

    accessibilityRole="button"

    accessibilityLabel={title}

    disabled={disabled}

    onPress={onPress}

    style={({ pressed }) => [

      styles.button,

      secondary && styles.secondaryButton,

      disabled && styles.disabledButton,

      pressed && !disabled && styles.pressedButton,

    ]}>

    <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>

      {title}

    </Text>

  </Pressable>

);

}



export default function CartScreen() {

  const router = useRouter();

  const {

    items,

    updateQuantity,

    removeItem,

    clearCart,

    total,

    itemCount,

  } = useCart();



  const [customerName, setCustomerName] = useState('');

  const [note, setNote] = useState('');

  const [sending, setSending] = useState(false);



  const money = (price: number) =>

    price.toLocaleString('es-AR', {

      style: 'currency',

      currency: 'ARS',

      maximumFractionDigits: 0,

    });



  const submitOrder = async () => {

    if (items.length === 0) {

      Alert.alert('Carrito vacío', 'Agregá productos antes de enviar el pedido.');

      return;

    }



    if (customerName.length > 50 || note.length > 200) {

      Alert.alert( 'Revisá los datos', 'El nombre admite hasta 50 caracteres y la nota hasta 200.', );

      return;

    }



    setSending(true);



    try {



    const response = await fetch(

      `${API_URL}/public/stores/${encodeURIComponent(STORE_SLUG)}/orders`,

    {

    method: 'POST',

    headers: {

      'Content-Type': 'application/json',

      'X-Tenant-Slug': TENANT_SLUG,

    },

    body: JSON.stringify({

      items: items.map((item) => ({

        product_id: item.product.id,

        quantity: item.quantity,

      })),

      ...(customerName.trim()

        ? { customer_name: customerName.trim() }

        : {}),

      ...(note.trim() ? { note: note.trim() } : {}),

       }),

     },

     );



      const result = await response.json().catch(() => ({}));

      if (!response.ok) {

        throw new Error(

          typeof result.message === 'string'

            ? result.message

            : 'No se pudo enviar el pedido.',

        );

      }



      clearCart();



      Alert.alert(

        '¡Pedido confirmado!',

        `Pedido: ${result.id}\nTotal: ${money(result.total)}\n${result.message ?? ''}`,

        [{ text: 'Aceptar', onPress: () => router.replace('/') }],

      );

    } catch (error) {

      Alert.alert(

        'No se pudo enviar',

        error instanceof Error

          ? error.message

          : 'Verificá que el servidor esté funcionando e intentá nuevamente.',

      );

    } finally {

      setSending(false);

    }

  };





  return (

    <SafeAreaView style={styles.screen}>

      <View style={styles.header}>

        <View>

          <Text style={styles.brand}>mostrador.io</Text>

          <Text style={styles.headerSubtitle}>Tu pedido</Text>

        </View>

        <View style={styles.countBadge}>

          <Text style={styles.count}>{itemCount}</Text>

        </View>

      </View>



      {items.length === 0 ? (

        <View style={styles.empty}>

          <Text style={styles.emptyIcon}>🛍️</Text>

          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>

          <Text style={styles.muted}>

            Explorá el catálogo y agregá productos para comenzar.

          </Text>

          <ActionButton

            title="Volver al catálogo"

            onPress={() => router.replace('/')}

          />

        </View>

      ) : (

        <FlatList

          data={items}

          keyExtractor={(item) => String(item.product.id)}

          contentContainerStyle={styles.list}

          ListHeaderComponent={

            <View style={styles.sectionHeading}>

              <Text style={styles.pageTitle}>Mi carrito</Text>

              <Text style={styles.muted}>

                {itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}

              </Text>

            </View>

          }

          renderItem={({ item }) => (

            <View style={styles.card}>

              <Text style={styles.productName}>{item.product.name}</Text>

              <Text style={styles.muted}>

                Comercio: {item.product.bookstore}

              </Text>

              <Text style={styles.price}>

                {money(item.product.price)} por unidad

              </Text>

              <Text style={styles.subtotal}>

                Subtotal: {money(item.product.price * item.quantity)}

              </Text>



              <View style={styles.actions}>

                <Pressable

                  accessibilityRole="button"

                  accessibilityLabel={`Quitar una unidad de ${item.product.name}`}

                  disabled={sending}

                  onPress={() =>

                    item.quantity > 1

                      ? updateQuantity(item.product.id, item.quantity - 1)

                      : removeItem(item.product.id)

                  }

                  style={styles.quantityButton}>

                  <Text style={styles.quantityButtonText}>−</Text>

                </Pressable>



                <Text style={styles.quantity}>{item.quantity}</Text>



                <Pressable

                  accessibilityRole="button"

                  accessibilityLabel={`Agregar una unidad de ${item.product.name}`}

                  disabled={

                    sending ||

                    item.quantity >= Math.min(item.product.stock, 50)

                  }

                  onPress={() =>

                    updateQuantity(item.product.id, item.quantity + 1)

                  }

                  style={[

                    styles.quantityButton,

                    item.quantity >= Math.min(item.product.stock, 50) &&

                      styles.disabledButton,

                  ]}>

                  <Text style={styles.quantityButtonText}>+</Text>

                </Pressable>



                <View style={styles.removeButton}>

                  <ActionButton

                    title="Eliminar"

                    secondary

                    disabled={sending}

                    onPress={() => removeItem(item.product.id)}

                  />

                </View>

              </View>

            </View>

          )}

          ListFooterComponent={

            <View>

              <View style={styles.totalBox}>

                <Text style={styles.totalLabel}>TOTAL DEL PEDIDO</Text>

                <Text style={styles.total}>{money(total)}</Text>

              </View>



              <View style={styles.formCard}>

                <Text style={styles.formTitle}>Datos del pedido</Text>

                <Text style={styles.label}>Nombre del cliente (opcional)</Text>

                <TextInput

                  style={styles.input}

                  value={customerName}

                  onChangeText={setCustomerName}

                  placeholder="Ingresá tu nombre"

                  placeholderTextColor={C.muted}

                  maxLength={50}

                  editable={!sending}

                  accessibilityLabel="Nombre del cliente"

                />



                <Text style={styles.label}>Nota del pedido (opcional)</Text>

                <TextInput

                  style={[styles.input, styles.noteInput]}

                  value={note}

                  onChangeText={setNote}

                  placeholder="Aclaraciones para el pedido"

                  placeholderTextColor={C.muted}

                  multiline

                  maxLength={200}

                  editable={!sending}

                  accessibilityLabel="Nota del pedido"

                />

                <Text style={styles.characterCount}>{note.length}/200</Text>



                <ActionButton

                  title={sending ? 'Enviando pedido...' : 'Confirmar pedido'}

                  disabled={sending}

                  onPress={submitOrder}

                />



                {sending && (

                  <ActivityIndicator

                    style={styles.loader}

                    color={C.orange}

                  />

                )}

              </View>

            </View>

          }

        />

      )}



      <View style={styles.footer}>

        <ActionButton

          title="Seguir comprando"

          secondary

          disabled={sending}

          onPress={() => router.replace('/')}

        />

      </View>

    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  screen: {

    flex: 1,

    backgroundColor: C.cream,

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: S.lg,

    paddingVertical: S.md,

    backgroundColor: C.ink,

  },

  brand: {

    color: C.cream,

    fontSize: 22,

    fontWeight: '800',

    letterSpacing: -0.5,

  },

  headerSubtitle: {

    color: '#D6D3D1',

    fontSize: 13,

    marginTop: 3,

  },

  countBadge: {

    minWidth: 38,

    height: 38,

    paddingHorizontal: S.sm,

    borderRadius: 20,

    backgroundColor: C.orange,

    alignItems: 'center',

    justifyContent: 'center',

  },

  count: {

    color: C.white,

    fontSize: 16,

    fontWeight: '800',

  },

  sectionHeading: {

    marginBottom: S.md,

    gap: 4,

  },

  pageTitle: {

    color: C.ink,

    fontSize: 28,

    fontWeight: '800',

    letterSpacing: -0.6,

  },

  list: {

    padding: S.lg,

    gap: S.md,

    paddingBottom: S.lg,

  },

  card: {

    padding: S.md,

    backgroundColor: C.white,

    borderColor: C.border,

    borderWidth: 1,

    borderRadius: 14,

    gap: S.sm,

  },

  productName: {

    color: C.ink,

    fontSize: 18,

    fontWeight: '800',

  },

  muted: {

    color: C.muted,

    fontSize: 14,

    lineHeight: 20,

  },

  price: {

    color: C.ink,

    marginTop: 4,

  },

  subtotal: {

    color: C.orange,

    fontSize: 16,

    fontWeight: '800',

    marginTop: 3,

  },

  actions: {

    flexDirection: 'row',

    alignItems: 'center',

    flexWrap: 'wrap',

    gap: S.sm,

    marginTop: S.sm,

  },

  quantityButton: {

    width: 38,

    height: 38,

    borderRadius: 10,

    backgroundColor: C.softOrange,

    borderWidth: 1,

    borderColor: '#FED7AA',

    alignItems: 'center',

    justifyContent: 'center',

  },

  quantityButtonText: {

    color: C.orange,

    fontSize: 22,

    fontWeight: '800',

  },

  quantity: {

    minWidth: 24,

    textAlign: 'center',

    color: C.ink,

    fontSize: 17,

    fontWeight: '800',

  },

  removeButton: {

    marginLeft: 'auto',

  },

  totalBox: {

    padding: S.lg,

    backgroundColor: C.ink,

    borderRadius: 14,

    marginTop: S.sm,

    marginBottom: S.md,

  },

  totalLabel: {

    color: '#D6D3D1',

    fontSize: 12,

    fontWeight: '700',

    letterSpacing: 1,

  },

  total: {

    color: C.cream,

    fontSize: 28,

    fontWeight: '800',

    marginTop: 6,

  },

  formCard: {

    padding: S.md,

    backgroundColor: C.white,

    borderColor: C.border,

    borderWidth: 1,

    borderRadius: 14,

    gap: S.sm,

  },

  formTitle: {

    color: C.ink,

    fontSize: 20,

    fontWeight: '800',

    marginBottom: 4,

  },

  label: {

    color: C.ink,

    fontWeight: '700',

    marginTop: 4,

  },

  input: {

    borderWidth: 1,

    borderColor: C.border,

    backgroundColor: C.cream,

    color: C.ink,

    borderRadius: 10,

    padding: 12,

    fontSize: 16,

  },

  noteInput: {

    minHeight: 90,

    textAlignVertical: 'top',

  },

  characterCount: {

    color: C.muted,

    fontSize: 12,

    textAlign: 'right',

  },

  button: {

    minHeight: 46,

    paddingHorizontal: S.md,

    paddingVertical: 12,

    borderRadius: 10,

    backgroundColor: C.orange,

    alignItems: 'center',

    justifyContent: 'center',

  },

  buttonText: {

    color: C.white,

    fontSize: 15,

    fontWeight: '800',

  },

  secondaryButton: {

    backgroundColor: C.cream,

    borderWidth: 1,

    borderColor: C.border,

  },

  secondaryButtonText: {

    color: C.ink,

  },

  disabledButton: {

    opacity: 0.45,

  },

  pressedButton: {

    opacity: 0.75,

  },

  loader: {

    marginTop: S.sm,

  },

  empty: {

    flex: 1,

    justifyContent: 'center',

    alignItems: 'center',

    padding: S.lg,

    gap: S.md,

  },

  emptyIcon: {

    fontSize: 42,

  },

  emptyTitle: {

    color: C.ink,

    fontSize: 22,

    fontWeight: '800',

    textAlign: 'center',

  },

  footer: {

    padding: S.md,

    borderTopWidth: 1,

    borderTopColor: C.border,

    backgroundColor: C.cream,

  },

});
