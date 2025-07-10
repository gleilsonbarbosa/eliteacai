export interface DeliveryNeighborhood {
  id: string;
  name: string;
  delivery_fee: number;
  delivery_time: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryInfo {
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  neighborhoodId?: string;
  complement?: string;
  paymentMethod: 'money' | 'pix' | 'card';
  changeFor?: number;
  deliveryFee?: number;
  estimatedDeliveryTime?: number;
}