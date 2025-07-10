export interface Customer {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  balance: number;
  password_hash?: string;
  last_login?: string;
  date_of_birth?: string;
  whatsapp_consent?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashbackTransaction {
  id: string;
  customer_id: string;
  amount: number;
  cashback_amount: number;
  type: 'purchase' | 'redemption' | 'adjustment';
  status: 'approved' | 'pending' | 'rejected' | 'used';
  receipt_url?: string;
  store_id?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  expires_at?: string;
  comment?: string;
  attendant_name?: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerBalance {
  customer_id: string;
  name?: string;
  available_balance: number;
  expired_balance: number;
  next_expiration?: string;
}

interface CashbackSettings {
  percentage: number; // Porcentagem de cashback (ex: 0.10 para 10%)
  min_purchase: number; // Valor mínimo para ganhar cashback
  max_cashback_per_purchase: number; // Máximo de cashback por compra
  expiration_days: number; // Dias para expirar (padrão: fim do mês)
}