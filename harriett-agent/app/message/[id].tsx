import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../lib/supabase';
import type { DemoMessage } from '../../lib/types';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [message, setMessage] = useState<DemoMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('demo_messages')
        .select('*')
        .eq('id', id)
        .single();
      if (data) {
        setMessage(data);
        navigation.setOptions({ title: data.deal_address });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#4F46E5" />
      </View>
    );
  }

  if (!message) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Message not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.harriettBadge}>
          <Text style={styles.harriettBadgeText}>HARRIETT.</Text>
        </View>
        <Text style={styles.address}>{message.deal_address}</Text>
        <Text style={styles.agentLine}>To: {message.agent_name}</Text>
      </View>

      {/* Approval badge */}
      <View style={styles.approvalRow}>
        <View style={styles.approvalBadge}>
          <Text style={styles.approvalDot}>●</Text>
          <Text style={styles.approvalText}>Approved by Wilson Moore</Text>
        </View>
        {message.approved_at && (
          <Text style={styles.approvalTime}>{formatDate(message.approved_at)}</Text>
        )}
      </View>

      {/* Message body */}
      <View style={styles.messageCard}>
        <Text style={styles.messageLabel}>Message</Text>
        <Text style={styles.messageText}>{message.message_text}</Text>
      </View>

      {/* Audit note */}
      <View style={styles.auditCard}>
        <Text style={styles.auditText}>
          This message was reviewed and approved by the broker before delivery. Harriett logs every action for compliance audit.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16, gap: 12 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  errorText: { fontSize: 15, color: '#94A3B8' },

  headerCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
  },
  harriettBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.3)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  harriettBadgeText: { fontSize: 11, fontWeight: '700', color: '#A5B4FC', letterSpacing: 1.5 },
  address: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  agentLine: { fontSize: 14, color: '#94A3B8' },

  approvalRow: { gap: 4 },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  approvalDot: { fontSize: 8, color: '#16A34A' },
  approvalText: { fontSize: 13, fontWeight: '600', color: '#16A34A' },
  approvalTime: { fontSize: 12, color: '#94A3B8', marginLeft: 2 },

  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  messageLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  messageText: { fontSize: 16, color: '#1E293B', lineHeight: 26 },

  auditCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  auditText: { fontSize: 12, color: '#94A3B8', lineHeight: 18, textAlign: 'center' },
});
