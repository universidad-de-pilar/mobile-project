import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { OrderCard } from '@/components/order-card';
import { Button } from '@/components/ui/mostrador/button';
import { Chip } from '@/components/ui/mostrador/chip';
import { FeedbackState } from '@/components/ui/mostrador/feedback-state';
import { TopBar } from '@/components/ui/mostrador/top-bar';
import { Colors, Layout, Spacing } from '@/components/ui/mostrador/tokens';
import { useSession } from '@/context/SessionContext';
import { getOrder, listOrders, updateOrderStatus, type Order, type OrderQuery, type OrderSummary } from '@/lib/admin-api';
import { orderErrorMessage, todayRange } from '@/lib/admin-order-rules';
import { createSubmitLock } from '@/lib/submit-lock';

type Filter = 'hoy' | 'generadas' | 'todas';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'generadas', label: 'Generadas' },
  { key: 'todas', label: 'Todas' },
];

type Result = { key: string; orders?: OrderSummary[]; page: number; total: number };

function queryFor(filter: Filter, page: number): OrderQuery {
  if (filter === 'hoy') return { ...todayRange(new Date()), page };
  return { page, ...(filter === 'generadas' ? { status: 'generada' as const } : {}) };
}

export default function OrdersTab() {
  const { store, me } = useSession();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const [filter, setFilter] = useState<Filter>('hoy');
  const [result, setResult] = useState<Result | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Order | 'failed'>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const lock = useRef(createSubmitLock()).current;

  // Loading is derived from the key; refocusing (coming back from another tab) refetches.
  const key = `${store?.store_id}:${filter}:${attempt}:${focused}`;

  useEffect(() => {
    if (!store || !focused) return;
    let active = true;
    listOrders(store.store_id, queryFor(filter, 1))
      .then((r) => active && setResult({ key, orders: r.data, page: 1, total: r.meta.total }))
      .catch(() => active && setResult({ key, page: 1, total: 0 }));
    return () => {
      active = false;
    };
  }, [store, focused, filter, key]);

  // ponytail: polling every 15 s while focused, push updates if order volume makes this costly
  useEffect(() => {
    if (!store || !focused) return;
    const timer = setInterval(() => {
      listOrders(store.store_id, queryFor(filter, 1))
        .then((r) =>
          setResult((current) =>
            current?.key === key && current.page === 1
              ? { key, orders: r.data, page: 1, total: r.meta.total }
              : current,
          ),
        )
        .catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [store, focused, filter, key]);

  const loaded = result?.key === key ? result : null;
  const orders = loaded?.orders;

  // Re-reads page 1 keeping what is on screen; a failure is retried by the next focus or pull.
  async function refetch() {
    if (!store) return;
    try {
      const r = await listOrders(store.store_id, queryFor(filter, 1));
      setResult({ key, orders: r.data, page: 1, total: r.meta.total });
    } catch {
      // see above
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  async function loadMore() {
    if (!store || !orders || !loaded || loadingMore) return;
    setLoadingMore(true);
    setRowError(null);
    try {
      const r = await listOrders(store.store_id, queryFor(filter, loaded.page + 1));
      setResult({ key, orders: [...orders, ...r.data], page: loaded.page + 1, total: r.meta.total });
    } catch {
      setRowError({ id: 'more', message: 'No se pudieron cargar más órdenes.' });
    } finally {
      setLoadingMore(false);
    }
  }

  function toggle(id: string) {
    setConfirmingId(null);
    setRowError(null);
    if (expandedId === id) return setExpandedId(null);
    setExpandedId(id);
    if (details[id] && details[id] !== 'failed') return;
    getOrder(id)
      .then((o) => setDetails((d) => ({ ...d, [id]: o })))
      .catch(() => setDetails((d) => ({ ...d, [id]: 'failed' })));
  }

  async function changeStatus(id: string, to: Order['status']) {
    if (!lock.acquire()) return;
    setSendingId(id);
    setRowError(null);
    try {
      const updated = await updateOrderStatus(id, to);
      setDetails((d) => ({ ...d, [id]: updated }));
    } catch (e) {
      setRowError({ id, message: orderErrorMessage(e) });
    } finally {
      setConfirmingId(null);
      await refetch();
      lock.release();
      setSendingId(null);
    }
  }

  const canUpdate = Boolean(me?.permissions.includes('orders:update'));

  let body;
  if (!loaded) {
    body = <FeedbackState type="loading" title="Cargando órdenes..." message="Un momento." />;
  } else if (!orders) {
    body = (
      <FeedbackState
        type="error"
        title="No pudimos cargar las órdenes"
        message="Revisá la conexión e intentá nuevamente."
        actionLabel="Reintentar"
        onAction={() => setAttempt((a) => a + 1)}
      />
    );
  } else if (orders.length === 0) {
    body = <FeedbackState type="empty" title="Aún no hay órdenes" message="Cuando lleguen pedidos los vas a ver acá." />;
  } else {
    body = (
      <View style={styles.list}>
        {orders.map((o) => {
          const d = details[o.order_id];
          return (
            <OrderCard
              key={o.order_id}
              order={o}
              expanded={expandedId === o.order_id}
              detail={d && d !== 'failed' ? d : undefined}
              detailFailed={d === 'failed'}
              confirmingCancel={confirmingId === o.order_id}
              sending={sendingId === o.order_id}
              error={rowError?.id === o.order_id ? rowError.message : null}
              canUpdate={canUpdate}
              onToggle={() => toggle(o.order_id)}
              onAction={(to) => void changeStatus(o.order_id, to)}
              onConfirmCancel={(c) => setConfirmingId(c ? o.order_id : null)}
            />
          );
        })}
        {orders.length < (loaded?.total ?? 0) ? (
          <Button title="Ver más" variant="ghost" onPress={() => void loadMore()} loading={loadingMore} fullWidth />
        ) : null}
        {rowError?.id === 'more' ? <FeedbackState type="error" title={rowError.message} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar title="Órdenes" store={store?.name} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => {
                setFilter(f.key);
                setExpandedId(null);
              }}
            />
          ))}
        </ScrollView>
        {body}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Layout.screenPadding, gap: Spacing.section, width: '100%', maxWidth: Layout.contentMaxWidth },
  chips: { gap: Spacing.sm },
  list: { gap: Spacing.md },
});
