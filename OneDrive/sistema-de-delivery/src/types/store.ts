export interface StoreHours {
  id: string;
  day_of_week: number; // 0 = Domingo, 1 = Segunda, etc.
  is_open: boolean;
  open_time: string; // HH:MM format
  close_time: string; // HH:MM format
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  phone: string;
  address: string;
  delivery_fee: number;
  min_order_value: number;
  estimated_delivery_time: number; // em minutos
  is_open_now: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreStatus {
  isOpen: boolean;
  message: string;
  nextOpenTime?: string;
  currentDay: string;
}