import { useEffect, useState, useRef } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  Animated,
  RefreshControl,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import type { DemoMessage } from '../lib/types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MessageCard({ item, isNew }: { item: DemoMessage; isNew: boolean }) {
  const flashAnim = useRef(new Animated.Value(isNew ? 1 : 0)).current;

  useEffect(() => {
    if (isNew) {
      Animated.sequence([
        Animated.timing(flashAnim, { toValue: 1, duration: 0, useNativeDriver: false }),
        Animated.delay(2000),
        Animated.timing(flashAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]).start();
    }
  }, [isNew]);

  const borderColor = flashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#E2E8F0', '#4F46E5'],
  });

  return (
    <Pressable onPress={() => router.push(`/message/${item.id}`)}>
      <Animated.View style={[styles.card, { borderColor }]}>
        <View style={styles.cardHeader}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>HARRIETT</Text>
          </View>
          <Text style={styles.timeAgo}>{timeAgo(item.approved_at ?? item.created_at)}</Text>
        </View>

        <Text style={styles.address}>{item.deal_address}</Text>
        <Text style={styles.agentLine}>To: {item.agent_name}</Text>
        <Text style={styles.preview} numberOfLines={3}>
          {item.message_text}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.tapHint}>Tap to view full message →</Text>
          <View style={styles.approvedBadge}>
            <Text style={styles.approvedText}>Approved</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function EmptyState() {
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyContainer}>
      <Animated.View style={[styles.emptyDot, { opacity: pulseAnim }]} />
      <Text style={styles.emptyTitle}>Waiting for Harriett</Text>
      <Text style={styles.emptySubtitle}>
        When Wilson approves a message on the web dashboard, it appears here in real time.
      </Text>
      <Text style={styles.emptyHint}>harriett-demo.vercel.app</Text>
    </View>
  );
}

export default function FeedScreen() {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  async function loadMessages() {
    const { data } = await supabase
      .from('demo_messages')
      .select('*')
      .eq('status', 'approved')
      .order('approved_at', { ascending: false });
    if (data) setMessages(data);
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadMessages();
    setRefreshing(false);
  }

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel('harriett-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'demo_messages', filter: 'status=eq.approved' },
        (payload) => {
          const msg = payload.new as DemoMessage;
          setMessages((prev) => [msg, ...prev]);
          setNewIds((prev) => new Set([...prev, msg.id]));
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev);
              next.delete(msg.id);
              return next;
            });
          }, 3000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.list}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
      ListEmptyComponent={<EmptyState />}
      ListHeaderComponent={
        messages.length > 0 ? (
          <Text style={styles.listHeader}>{messages.length} message{messages.length !== 1 ? 's' : ''}</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <MessageCard item={item} isNew={newIds.has(item.id)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  emptyList: { flex: 1, justifyContent: 'center', padding: 32 },
  listHeader: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#4F46E5', letterSpacing: 1 },
  timeAgo: { fontSize: 12, color: '#94A3B8' },

  address: { fontSize: 17, fontWeight: '700', color: '#0F172A', marginBottom: 3 },
  agentLine: { fontSize: 13, color: '#64748B', marginBottom: 10 },
  preview: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tapHint: { fontSize: 12, color: '#94A3B8' },
  approvedBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  approvedText: { fontSize: 11, fontWeight: '600', color: '#16A34A' },

  emptyContainer: { alignItems: 'center', paddingHorizontal: 16 },
  emptyDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4F46E5', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 10, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  emptyHint: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
});
