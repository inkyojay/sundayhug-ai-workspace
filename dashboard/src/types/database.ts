// Supabase Database Types
// 자동 생성된 타입이 아니라 수동으로 정의한 타입입니다.
// 추후 supabase gen types로 자동 생성 가능

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// 채널 타입
export type ChannelType = 'coupang' | 'naver' | 'cafe24' | 'own_mall' | 'offline';

// 주문 상태
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'cancelled'
  | 'refund_requested'
  | 'refunded'
  | 'exchange_requested'
  | 'exchanged';

// CS 티켓 상태
export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'resolved'
  | 'closed'
  | 'escalated';

// 티켓 우선순위
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';

// 에이전트 상태
export type AgentStatus = 'active' | 'inactive' | 'maintenance' | 'error';

// 에이전트 카테고리
export type AgentCategory =
  | 'marketing'
  | 'product'
  | 'customer'
  | 'operations'
  | 'analytics'
  | 'system';

export interface Database {
  public: {
    Tables: {
      // 주문
      orders: {
        Row: {
          id: string;
          order_code: string;
          channel: ChannelType;
          status: OrderStatus;
          total_amount: number;
          customer_id: string | null;
          shipping_name: string | null;
          shipping_phone: string | null;
          shipping_address: string | null;
          tracking_number: string | null;
          ordered_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };

      // 고객
      customers: {
        Row: {
          id: string;
          customer_code: string;
          email: string | null;
          phone: string | null;
          name: string | null;
          tier: 'vvip' | 'vip' | 'gold' | 'silver' | 'normal';
          total_orders: number;
          total_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };

      // CS 티켓
      cs_tickets: {
        Row: {
          id: string;
          ticket_code: string;
          customer_id: string | null;
          order_id: string | null;
          ticket_type: string;
          status: TicketStatus;
          priority: TicketPriority;
          subject: string | null;
          ai_category: string | null;
          ai_sentiment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cs_tickets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['cs_tickets']['Insert']>;
      };

      // 상품
      products: {
        Row: {
          id: string;
          product_code: string;
          sku: string;
          name: string;
          category: string | null;
          base_price: number;
          sale_price: number | null;
          is_active: boolean;
          is_soldout: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };

      // 재고
      inventory: {
        Row: {
          id: string;
          product_id: string;
          sku: string;
          total_quantity: number;
          available_quantity: number;
          reserved_quantity: number;
          safety_stock: number;
          reorder_point: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['inventory']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['inventory']['Insert']>;
      };

      // 에이전트
      agents: {
        Row: {
          id: string;
          agent_code: string;
          name: string;
          description: string | null;
          category: AgentCategory;
          parent_agent_id: string | null;
          is_main_agent: boolean;
          capabilities: Json;
          mcp_tools: Json;
          status: AgentStatus;
          version: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['agents']['Insert']>;
      };

      // 스킬
      skills: {
        Row: {
          id: string;
          skill_code: string;
          name: string;
          description: string | null;
          category: string | null;
          input_schema: Json;
          output_schema: Json;
          implementation_type: string;
          implementation_config: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['skills']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['skills']['Insert']>;
      };

      // MCP 서버
      mcp_servers: {
        Row: {
          id: string;
          server_code: string;
          name: string;
          description: string | null;
          server_type: string;
          connection_config: Json;
          available_tools: Json;
          status: string;
          last_health_check: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['mcp_servers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['mcp_servers']['Insert']>;
      };

      // 워크플로우
      workflows: {
        Row: {
          id: string;
          workflow_code: string;
          name: string;
          description: string | null;
          trigger_type: string;
          trigger_config: Json;
          steps: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['workflows']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['workflows']['Insert']>;
      };

      // 승인 요청
      approval_requests: {
        Row: {
          id: string;
          task_id: string | null;
          agent_id: string | null;
          approval_type: string;
          request_data: Json;
          status: 'pending' | 'approved' | 'rejected' | 'expired';
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['approval_requests']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['approval_requests']['Insert']>;
      };
    };
  };
}

// 편의 타입
export type Order = Database['public']['Tables']['orders']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type CSTicket = Database['public']['Tables']['cs_tickets']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type Inventory = Database['public']['Tables']['inventory']['Row'];
export type Agent = Database['public']['Tables']['agents']['Row'];
export type Skill = Database['public']['Tables']['skills']['Row'];
export type McpServer = Database['public']['Tables']['mcp_servers']['Row'];
export type Workflow = Database['public']['Tables']['workflows']['Row'];
export type ApprovalRequest = Database['public']['Tables']['approval_requests']['Row'];
