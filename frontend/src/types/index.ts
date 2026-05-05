export type UserRole = 'admin' | 'technician' | 'sales';

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type Category = 'CPU' | 'GPU' | 'RAM' | 'Storage' | 'Mainboard' | 'PSU' | 'Case' | 'Cooling' | 'Monitor' | 'Keyboard' | 'Mouse' | 'Headset' | 'Other';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface InventoryItem {
  id: string;
  sku_code: string;
  name: string;
  category: Category;
  brand: string;
  image_url: string;
  image_urls: string[];
  specs: Record<string, unknown>;
  stock_quantity: number;
  min_stock: number;
  cost_price: number;
  unit_price: number;
  warranty_months: number;
  location: string;
  barcode: string;
  status: StockStatus;
  created_at: string;
  updated_at: string;
}

export interface InventoryCreate {
  sku_code: string;
  name: string;
  category: Category;
  brand?: string;
  image_url?: string;
  specs: Record<string, unknown>;
  stock_quantity: number;
  min_stock?: number;
  cost_price?: number;
  unit_price: number;
  warranty_months?: number;
  location?: string;
  barcode?: string;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export type TicketStatus = 'pending' | 'diagnosing' | 'waiting_parts' | 'completed';
export interface CustomerInfo { name: string; phone: string; }
export interface PartUsed { inventory_id: string; name?: string; quantity: number; price: number; }
export interface MaintenanceTicket {
  id: string; ticket_id: string; customer_info: CustomerInfo; device_info: string; issue_description: string; status: TicketStatus; technician_id?: string; technician_name?: string; parts_used: PartUsed[]; total_cost: number; created_at: string; updated_at: string;
}
export interface TicketListResponse { tickets: MaintenanceTicket[]; total: number; page: number; limit: number; total_pages: number; }

export interface DashboardStats {
  total_parts: number; low_stock_count: number; pending_tickets: number; completed_this_month: number; total_customers: number; total_suppliers: number; active_warranties: number; sales_this_month: number; purchases_this_month: number; total_revenue: number; tickets_over_time: { date: string; count: number }[]; category_distribution: { category: string; count: number }[];
}

// ── Phase 1: Serial Units ──
export type ItemCondition = 'new' | 'demo' | 'rma' | 'used';
export type SerialStatus = 'available' | 'sold' | 'rma' | 'reserved' | 'in_build';

export interface SerialUnit {
  id: string;
  serial_number: string;
  inventory_id: string;
  product_name: string;
  sku_code: string;
  category: string;
  condition: ItemCondition;
  status: SerialStatus;
  purchase_order_id: string;
  warehouse_id: string;
  warehouse_name: string;
  location_code: string;
  sold_to_order_id: string;
  warranty_id: string;
  build_id: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Phase 2: Build PC ──
export type BuildStatus = 'draft' | 'assembled' | 'sold' | 'cancelled';
export type CompatibilityLevel = 'compatible' | 'warning' | 'error';

export interface PCBuildComponent {
  category: string;
  inventory_id: string;
  serial_unit_id?: string;
  product_name?: string;
  sku_code?: string;
  quantity: number;
  unit_price: number;
}

export interface PCBuild {
  id: string;
  build_code: string;
  build_name: string;
  components: PCBuildComponent[];
  total_price: number;
  total_tdp: number;
  recommended_psu: number;
  compatibility_status: CompatibilityLevel;
  compatibility_notes: string[];
  status: BuildStatus;
  assembled_by: string;
  assembled_by_name: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Phase 3: Warehouse ──
export type WarehouseType = 'main' | 'branch' | 'display';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  type: WarehouseType;
  manager_id: string;
  manager_name: string;
  phone: string;
  total_items: number;
  created_at: string;
  updated_at: string;
}

// ── Phase 4: RMA ──
export type RMAStatusType = 'received' | 'sent_to_vendor' | 'vendor_processing' | 'returned_from_vendor' | 'returned_to_customer' | 'replaced' | 'rejected';

export interface RMAEvent {
  timestamp: string;
  status: RMAStatusType;
  note: string;
  performed_by: string;
}

export interface RMATicket {
  id: string;
  rma_code: string;
  warranty_id: string;
  warranty_code: string;
  serial_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  issue_description: string;
  status: RMAStatusType;
  timeline: RMAEvent[];
  vendor_name: string;
  vendor_tracking: string;
  replacement_serial: string;
  estimated_return_date: string | null;
  created_at: string;
  updated_at: string;
}
