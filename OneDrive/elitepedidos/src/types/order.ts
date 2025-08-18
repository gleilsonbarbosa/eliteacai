export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_neighborhood: string;
  customer_complement?: string;
  payment_method: 'money' | 'pix' | 'card';
  change_for?: number;
  neighborhood_id?: string;
  delivery_fee?: number;
  estimated_delivery_minutes?: number;
  items: OrderItem[];
  total_price: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  estimated_delivery?: string;
  channel?: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string;
  selected_size?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  observations?: string;
  complements: OrderComplement[];
}

interface OrderComplement {
  name: string;
  price: number;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled';

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_type: 'customer' | 'attendant';
  sender_name: string;
  message: string;
  created_at: string;
  read_by_customer: boolean;
  read_by_attendant: boolean;
}

interface OrderNotification {
  id: string;
  order_id: string;
  type: 'new_order' | 'new_message' | 'status_update';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}