export type ProductType = 'crepe' | 'churrasco';

export interface Product {
  id: number;
  name: string;
  type: ProductType;
  price: number;
  ingredients: string[];
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id: number;
  product_name: string;
  product_type: ProductType;
  price: number;
  customizations: string[];
}

export interface Order {
  id: number;
  status: 'pending' | 'ready' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid';
  payment_method?: 'pix' | 'dinheiro' | 'cartao';
  amount_received?: number;
  total_price: number;
  customer_name: string;
  created_at: string;
  items: OrderItem[];
}

export interface FinanceStat {
  total_revenue: number;
  total_orders: number;
  date: string;
}
