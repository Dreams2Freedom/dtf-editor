// Admin System Type Definitions

export interface AdminRole {
  id: string;
  name: 'super_admin' | 'admin' | 'support' | 'analytics';
  permissions: AdminPermissions;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface AdminPermissions {
  users?: {
    view?: boolean;
    edit?: boolean;
    delete?: boolean;
    impersonate?: boolean;
  };
  financial?: {
    view?: boolean;
    refund?: boolean;
    addCredits?: boolean;
  };
  system?: {
    settings?: boolean;
    maintenance?: boolean;
    apiKeys?: boolean;
  };
  analytics?: {
    view?: boolean;
    export?: boolean;
  };
  support?: {
    view?: boolean;
    respond?: boolean;
    assign?: boolean;
  };
  admin?: {
    manage?: boolean;
  };
}

export interface AdminUser {
  id: string;
  user_id: string;
  role_id: string;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  ip_whitelist: string[];
  last_login_at?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface AdminUserWithRole extends AdminUser {
  role_name: string;
  role_permissions: AdminPermissions;
  user_email: string;
  user_full_name?: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  user_id?: string;
  assigned_admin_id?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  subject: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  first_response_at?: string;
  sla_deadline?: string;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'admin' | 'system';
  sender_id?: string;
  message: string;
  attachments: any[];
  is_internal: boolean;
  created_at: string;
}

// Admin Session Type
export interface AdminSession {
  user: AdminUserWithRole;
  token: string;
  expires_at: string;
  requires_2fa?: boolean;
}

// Admin Action Types for Audit Logging
export type AdminAction = 
  | 'user.view'
  | 'user.edit'
  | 'user.delete'
  | 'user.suspend'
  | 'user.activate'
  | 'user.impersonate'
  | 'user.add_credits'
  | 'user.remove_credits'
  | 'transaction.view'
  | 'transaction.refund'
  | 'coupon.create'
  | 'coupon.edit'
  | 'coupon.delete'
  | 'system.settings_update'
  | 'admin.login'
  | 'admin.logout'
  | 'admin.2fa_enable'
  | 'admin.2fa_disable'
  | 'support.ticket_view'
  | 'support.ticket_respond'
  | 'support.ticket_assign'
  | 'support.ticket_close';

// Helper type for permission checking
export type PermissionPath = string[];

// Admin API Response Types
export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AdminLoginResponse {
  session: AdminSession;
  requires_2fa: boolean;
}

export interface Admin2FAVerifyRequest {
  code: string;
  session_token: string;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'suspended' | 'all';
  plan?: string;
  sort_by?: 'created_at' | 'email' | 'credits_remaining';
  sort_order?: 'asc' | 'desc';
}

export interface AdminUserListResponse {
  users: Array<{
    id: string;
    email: string;
    full_name?: string;
    plan: string;
    credits_remaining: number;
    status: 'active' | 'suspended';
    created_at: string;
    last_sign_in_at?: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

export interface AdminCreditAdjustment {
  user_id: string;
  amount: number; // positive or negative
  reason: string;
}

export interface AdminTransactionListParams {
  page?: number;
  limit?: number;
  user_id?: string;
  type?: 'payment' | 'refund' | 'credit_purchase';
  status?: 'succeeded' | 'failed' | 'pending';
  date_from?: string;
  date_to?: string;
}

export interface AdminDashboardStats {
  users: {
    total: number;
    active_today: number;
    active_week: number;
    new_today: number;
    new_week: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    today: number;
    week: number;
    month: number;
  };
  processing: {
    images_today: number;
    images_week: number;
    success_rate: number;
    avg_processing_time: number;
  };
  support: {
    open_tickets: number;
    avg_response_time: number;
    satisfaction_score: number;
  };
}