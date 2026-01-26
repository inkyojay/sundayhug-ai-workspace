import { supabase } from './supabase';
import type { Inventory, Product } from '../types/database';

// 더미 상품 데이터
export const dummyProducts: Product[] = [
  {
    id: '1',
    product_code: 'PRD-001',
    sku: 'SKU-001',
    name: '프리미엄 유기농 샴푸 500ml',
    category: '헤어케어',
    base_price: 35000,
    sale_price: 28000,
    is_active: true,
    is_soldout: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
  },
  {
    id: '2',
    product_code: 'PRD-002',
    sku: 'SKU-002',
    name: '내추럴 바디로션 300ml',
    category: '바디케어',
    base_price: 28000,
    sale_price: null,
    is_active: true,
    is_soldout: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
  },
  {
    id: '3',
    product_code: 'PRD-003',
    sku: 'SKU-003',
    name: '모이스처 페이셜 크림 50g',
    category: '스킨케어',
    base_price: 48000,
    sale_price: 38400,
    is_active: true,
    is_soldout: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
  },
  {
    id: '4',
    product_code: 'PRD-004',
    sku: 'SKU-004',
    name: '비타민 세럼 30ml',
    category: '스킨케어',
    base_price: 55000,
    sale_price: null,
    is_active: true,
    is_soldout: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
  },
  {
    id: '5',
    product_code: 'PRD-005',
    sku: 'SKU-005',
    name: '허브 핸드크림 50ml',
    category: '핸드케어',
    base_price: 15000,
    sale_price: 12000,
    is_active: true,
    is_soldout: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
  },
  {
    id: '6',
    product_code: 'PRD-006',
    sku: 'SKU-006',
    name: '딥클렌징 폼 150ml',
    category: '스킨케어',
    base_price: 22000,
    sale_price: null,
    is_active: true,
    is_soldout: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
  },
];

// 더미 재고 데이터
export const dummyInventory: (Inventory & { product?: Product })[] = [
  {
    id: '1',
    product_id: '1',
    sku: 'SKU-001',
    total_quantity: 150,
    available_quantity: 120,
    reserved_quantity: 30,
    safety_stock: 50,
    reorder_point: 30,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
    product: dummyProducts[0],
  },
  {
    id: '2',
    product_id: '2',
    sku: 'SKU-002',
    total_quantity: 80,
    available_quantity: 65,
    reserved_quantity: 15,
    safety_stock: 30,
    reorder_point: 25,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
    product: dummyProducts[1],
  },
  {
    id: '3',
    product_id: '3',
    sku: 'SKU-003',
    total_quantity: 25,
    available_quantity: 20,
    reserved_quantity: 5,
    safety_stock: 20,
    reorder_point: 15,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
    product: dummyProducts[2],
  },
  {
    id: '4',
    product_id: '4',
    sku: 'SKU-004',
    total_quantity: 0,
    available_quantity: 0,
    reserved_quantity: 0,
    safety_stock: 30,
    reorder_point: 20,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
    product: dummyProducts[3],
  },
  {
    id: '5',
    product_id: '5',
    sku: 'SKU-005',
    total_quantity: 200,
    available_quantity: 180,
    reserved_quantity: 20,
    safety_stock: 40,
    reorder_point: 30,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
    product: dummyProducts[4],
  },
  {
    id: '6',
    product_id: '6',
    sku: 'SKU-006',
    total_quantity: 15,
    available_quantity: 10,
    reserved_quantity: 5,
    safety_stock: 25,
    reorder_point: 20,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-27T00:00:00Z',
    product: dummyProducts[5],
  },
];

// 재고 서비스 함수들
export const inventoryService = {
  // 재고 목록 조회
  async getInventory(params?: {
    lowStock?: boolean;
    outOfStock?: boolean;
    limit?: number;
    offset?: number;
  }) {
    try {
      let query = supabase.from('inventory').select(`
        *,
        product:products(*)
      `);

      if (params?.outOfStock) {
        query = query.eq('available_quantity', 0);
      } else if (params?.lowStock) {
        query = query.lt('available_quantity', supabase.rpc('safety_stock'));
      }

      if (params?.limit) {
        query = query.limit(params.limit);
      }
      if (params?.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;
      return { data: data || dummyInventory, error: null };
    } catch {
      return { data: dummyInventory, error: null };
    }
  },

  // 재고 상세 조회
  async getInventoryById(id: string) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch {
      const inventory = dummyInventory.find((i) => i.id === id);
      return { data: inventory || null, error: null };
    }
  },

  // 재고 알림 통계
  async getAlertStats() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*');

      if (error) throw error;

      const items = data as Inventory[] | null;
      const outOfStock = items?.filter((i) => i.available_quantity === 0).length || 0;
      const lowStock = items?.filter((i) => i.available_quantity > 0 && i.available_quantity <= i.safety_stock).length || 0;
      const normalStock = items?.filter((i) => i.available_quantity > i.safety_stock).length || 0;

      return {
        data: { outOfStock, lowStock, normalStock, total: items?.length || 0 },
        error: null,
      };
    } catch {
      // 더미 데이터로 통계 계산
      const outOfStock = dummyInventory.filter((i) => i.available_quantity === 0).length;
      const lowStock = dummyInventory.filter((i) => i.available_quantity > 0 && i.available_quantity <= i.safety_stock).length;
      const normalStock = dummyInventory.filter((i) => i.available_quantity > i.safety_stock).length;

      return {
        data: { outOfStock, lowStock, normalStock, total: dummyInventory.length },
        error: null,
      };
    }
  },

  // 재고 수량 업데이트
  async updateQuantity(id: string, quantity: number) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('inventory')
        .update({
          total_quantity: quantity,
          available_quantity: quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

// 재고 상태 판정 함수
export const getInventoryStatus = (inventory: Inventory): 'normal' | 'low' | 'out' => {
  if (inventory.available_quantity === 0) return 'out';
  if (inventory.available_quantity <= inventory.safety_stock) return 'low';
  return 'normal';
};

// 재고 상태 라벨
export const inventoryStatusLabels: Record<string, string> = {
  normal: '정상',
  low: '부족',
  out: '품절',
};

// 재고 상태별 색상
export const inventoryStatusColors: Record<string, 'success' | 'warning' | 'error'> = {
  normal: 'success',
  low: 'warning',
  out: 'error',
};

export default inventoryService;
