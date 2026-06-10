export interface DemoMessage {
  id: string;
  deal_address: string;
  agent_name: string;
  message_text: string;
  status: 'pending' | 'approved';
  created_at: string;
  approved_at: string | null;
}
