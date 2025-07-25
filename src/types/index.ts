// User Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  isAdmin: boolean;
  subscriptionStatus: 'free' | 'basic' | 'starter' | 'cancelled';
  subscriptionPlan: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  creditsRemaining: number;
  totalCreditsPurchased: number;
  totalCreditsUsed: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

// Image Types
export interface Image {
  id: string;
  userId: string;
  originalFilename: string;
  originalFileSize?: number;
  originalFileType?: string;
  originalUrl?: string;
  processedUrl?: string;
  thumbnailUrl?: string;
  finalUrl?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingError?: string;
  isFavorite: boolean;
  downloadCount: number;
  metadata?: Record<string, unknown>;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Image Operation Types
export interface ImageOperation {
  id: string;
  imageId: string;
  operationType: 'upscale' | 'background_removal' | 'vectorize' | 'generate';
  apiProvider: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorMessage?: string;
  processingTime?: number;
  creditsUsed: number;
  apiCost?: number;
  createdAt: string;
  completedAt?: string;
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  stripePriceId?: string;
  description?: string;
  monthlyPrice?: number;
  creditsPerMonth: number;
  features: Record<string, unknown>;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PayAsYouGoPackage {
  id: string;
  name: string;
  stripePriceId?: string;
  credits: number;
  price: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Credit Transaction Types
export interface CreditTransaction {
  id: string;
  userId: string;
  transactionType: 'purchase' | 'usage' | 'refund' | 'bonus' | 'expiration';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  metadata?: Record<string, unknown>;
  stripePaymentIntentId?: string;
  subscriptionPlanId?: string;
  payAsYouGoPackageId?: string;
  expiresAt?: string;
  createdAt: string;
}

// API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Processing Types
export interface ProcessingJob {
  id: string;
  userId: string;
  imageId: string;
  operations: ImageOperation[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimatedTime?: number;
  createdAt: string;
  updatedAt: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  company?: string;
}

export interface ImageUploadForm {
  file: File;
  description?: string;
  tags?: string[];
}

// UI Types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface Modal {
  id: string;
  isOpen: boolean;
  title?: string;
  content: React.ReactNode;
  onClose?: () => void;
}

// Filter Types
export interface ImageFilter {
  search?: string;
  status?: Image['processingStatus'];
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  isFavorite?: boolean;
}

export interface SortOption {
  field: keyof Image;
  direction: 'asc' | 'desc';
}

// Analytics Types
export interface UserAnalytics {
  userId: string;
  totalImages: number;
  completedImages: number;
  failedImages: number;
  totalCreditsUsed: number;
  averageProcessingTime: number;
  lastActivityAt: string;
}

export interface RevenueAnalytics {
  period: string;
  revenue: number;
  transactions: number;
  averageOrderValue: number;
  conversionRate: number;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

// Webhook Types
export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

// AI Service Types
export interface UpscaleOptions {
  scale: 2 | 4;
  faceEnhance: boolean;
  type: 'photo' | 'artwork';
}

export interface BackgroundRemovalOptions {
  format: 'png' | 'jpg';
  bgColor: 'transparent' | 'white' | 'black' | string;
  scale: 'original' | '2x' | '4x';
}

export interface VectorizationOptions {
  format: 'svg' | 'pdf' | 'ai';
  colors: 'auto' | 'limited' | 'full';
  details: 'low' | 'medium' | 'high';
}

export interface ImageGenerationOptions {
  prompt: string;
  size: '256x256' | '512x512' | '1024x1024';
  quality: 'standard' | 'hd';
  style?: string;
  referenceImage?: string;
}
