export interface PDVProduct {
  id: string;
  code: string;
  name: string;
  category: 'acai' | 'bebidas' | 'complementos' | 'sobremesas' | 'outros' | 'sorvetes';
  is_weighable: boolean;
  unit_price?: number;
  price_per_gram?: number;
  image_url?: string;
  stock_quantity: number;
  min_stock: number;
  is_active: boolean;
  barcode?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface PDVOperator {
  id: string;
  name: string;
  code: string;
  password_hash: string;
  is_active: boolean;
  permissions: {
    can_discount: boolean;
    can_cancel: boolean;
    can_manage_products: boolean;
    can_view_sales?: boolean;
    can_view_cash_register?: boolean;
    can_view_products?: boolean;
    can_view_orders?: boolean;
    can_view_reports?: boolean;
    can_view_sales_report?: boolean;
    can_view_cash_report?: boolean;
    can_view_operators?: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface PDVSale {
  id: string;
  sale_number: number;
  operator_id: string;
  customer_name?: string;
  customer_phone?: string;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;
  payment_type: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'voucher' | 'misto';
  payment_details?: any;
  change_amount: number;
  notes?: string;
  is_cancelled: boolean;
  cancelled_at?: string;
  cancelled_by?: string;
  cancel_reason?: string;
  created_at: string;
  updated_at: string;
  channel?: string;
  items?: PDVSaleItem[];
}

export interface PDVSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  weight_kg?: number;
  unit_price?: number;
  price_per_gram?: number;
  discount_amount: number;
  subtotal: number;
  created_at: string;
}

export interface PDVCartItem {
  product: PDVProduct;
  quantity: number;
  weight?: number;
  discount: number;
  subtotal: number;
  notes?: string;
}

export interface WeightReading {
  weight: number;
  stable: boolean;
  unit: 'kg' | 'g'; 
  timestamp: Date;
}

export interface ScaleConnection {
  isConnected: boolean;
  port?: string;
  protocol?: string;
  model?: string;
  lastReading?: WeightReading;
  error?: string;
  reconnectAttempts?: number;
}

interface PDVSettings {
  store_name: string;
  store_address: string;
  store_phone: string;
  tax_rate: number;
  receipt_footer: string;
  scale_port: string;
  scale_model: string;
  printer_enabled: boolean;
  scale_enabled: boolean;
  scale_baud_rate: number;
  scale_data_bits: number;
  scale_stop_bits: number;
  scale_parity: string;
  scale_port: string;
  scale_auto_reconnect: boolean;
  scale_stable_timeout: number;
  printer_name: string;
  auto_print_receipt: boolean;
}

export interface PDVCashRegisterEntry {
  id: string;
  register_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  payment_method: string;
  created_at: string;
}

export interface PDVCashRegister {
  id: string;
  opening_amount: number;
  closing_amount: number | null;
  difference: number | null;
  opened_at: string;
  closed_at: string | null;
  operator_id: string | null;
  total_income?: number;
  total_expense?: number;
  expected_balance?: number;
}

export interface PDVCashRegisterSummary {
  opening_amount: number;
  sales_total: number;
  total_income: number; 
  other_income_total?: number;
  total_expense: number;
  expected_balance: number;
  actual_balance: number;
  difference: number;
  sales_count: number;
  delivery_total?: number;
  delivery_count?: number; 
  total_all_sales?: number;
  sales?: Record<string, any>;
}