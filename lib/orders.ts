import { hashGetAll, hashSet } from "@/lib/storage";

export type OrderItem = {
  id: string;
  name: string;
  cat: string;
  price: number;
  qty: number;
  image?: string;
};

export type OrderStatus =
  | "new"
  | "awaiting-payment"
  | "paid"
  | "shipped"
  | "cancelled";

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  paymentMode: "manual" | "direct";
  paymentMethod: string;
  paymentOther?: string;
  paymentReference?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    notes?: string;
  };
  items: OrderItem[];
  subtotal: number;
  discountCode?: string;
  discount?: number;
  total: number;
};

const HASH = "orders";

export async function readOrders(): Promise<Order[]> {
  const map = await hashGetAll<Order>(HASH);
  return Object.values(map).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addOrder(order: Order): Promise<void> {
  await hashSet(HASH, order.id, order);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<boolean> {
  const map = await hashGetAll<Order>(HASH);
  const order = map[id];
  if (!order) return false;
  order.status = status;
  await hashSet(HASH, id, order);
  return true;
}

export function newOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `WR-${stamp}${rand}`;
}
