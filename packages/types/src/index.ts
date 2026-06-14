import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const RoleSchema = z.enum(['driver', 'operator', 'admin']);
export type Role = z.infer<typeof RoleSchema>;

export const FacilityTypeSchema = z.enum(['garage', 'lot', 'valet']);
export type FacilityType = z.infer<typeof FacilityTypeSchema>;

export const FacilityStatusSchema = z.enum([
  'draft',
  'pending_review',
  'active',
  'paused',
  'rejected',
]);
export type FacilityStatus = z.infer<typeof FacilityStatusSchema>;

export const ReservationStatusSchema = z.enum([
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'no_show',
  'expired',
]);
export type ReservationStatus = z.infer<typeof ReservationStatusSchema>;

export const RateTypeSchema = z.enum(['hourly', 'daily', 'monthly', 'event', 'flat']);
export type RateType = z.infer<typeof RateTypeSchema>;

export const PayoutStatusSchema = z.enum(['pending', 'enabled', 'restricted']);
export type PayoutStatus = z.infer<typeof PayoutStatusSchema>;

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  fullName: z.string().min(2).max(100),
  phone: z.string().optional(),
  role: RoleSchema.optional().default('driver'),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).max(128),
});

// ─── User Schemas ─────────────────────────────────────────────────────────────

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const VehicleSchema = z.object({
  licensePlate: z.string().min(1).max(20),
  state: z.string().min(2).max(50),
  make: z.string().optional(),
  model: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
});
export type CreateVehicleDto = z.infer<typeof VehicleSchema>;

// ─── Facility Schemas ─────────────────────────────────────────────────────────

export const CreateFacilitySchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().optional(),
  type: FacilityTypeSchema,
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  postalCode: z.string().min(4),
  country: z.string().default('US'),
  timezone: z.string().default('America/New_York'),
  totalCapacity: z.number().int().positive(),
  heightClearanceCm: z.number().int().positive().optional(),
  accessInstructions: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type CreateFacilityDto = z.infer<typeof CreateFacilitySchema>;

export const AmenitiesSchema = z.object({
  covered: z.boolean().default(false),
  evCharging: z.boolean().default(false),
  adaAccessible: z.boolean().default(false),
  valet: z.boolean().default(false),
  inOutPrivileges: z.boolean().default(false),
  gated: z.boolean().default(false),
  attended: z.boolean().default(false),
  motorcycle: z.boolean().default(false),
  oversized: z.boolean().default(false),
});
export type AmenitiesDto = z.infer<typeof AmenitiesSchema>;

// ─── Rate Rule Schemas ────────────────────────────────────────────────────────

export const CreateRateRuleSchema = z.object({
  rateType: RateTypeSchema,
  priceCents: z.number().int().positive(),
  minMinutes: z.number().int().positive().optional(),
  maxMinutes: z.number().int().positive().optional(),
  dayOfWeekMask: z.number().int().min(0).max(127).optional(),
  startTime: z.string().optional(), // HH:MM
  endTime: z.string().optional(),   // HH:MM
  validFrom: z.string().optional(), // YYYY-MM-DD
  validTo: z.string().optional(),   // YYYY-MM-DD
  priority: z.number().int().default(0),
});
export type CreateRateRuleDto = z.infer<typeof CreateRateRuleSchema>;

// ─── Search Schemas ───────────────────────────────────────────────────────────

export const SearchParamsSchema = z.object({
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  address: z.string().optional(),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  radius: z.coerce.number().optional().default(2000),
  sort: z.enum(['distance', 'price', 'rating']).optional().default('distance'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
  'filter[ev_charging]': z.coerce.boolean().optional(),
  'filter[covered]': z.coerce.boolean().optional(),
  'filter[ada_accessible]': z.coerce.boolean().optional(),
  'filter[valet]': z.coerce.boolean().optional(),
  'filter[type]': FacilityTypeSchema.optional(),
});
export type SearchParams = z.infer<typeof SearchParamsSchema>;

// ─── Booking Schemas ──────────────────────────────────────────────────────────

export const CreateBookingSchema = z
  .object({
    facilityId: z.string().uuid(),
    start: z.string().datetime({ offset: true }),
    end: z.string().datetime({ offset: true }),
    vehicleId: z.string().uuid().optional(),
    businessProfileId: z.string().uuid().optional(),
    promoCode: z.string().optional(),
  })
  .refine((d) => new Date(d.end) > new Date(d.start), {
    message: 'end must be after start',
    path: ['end'],
  });
export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;

export const CancelBookingSchema = z.object({
  reason: z.string().optional(),
});

// ─── Review Schemas ───────────────────────────────────────────────────────────

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});
export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

// ─── Common ───────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PaginationDto = z.infer<typeof PaginationSchema>;

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; issue: string }>;
    requestId?: string;
  };
}

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Domain Types ─────────────────────────────────────────────────────────────

export interface UserPublic {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  status: string;
  emailVerifiedAt?: string;
  createdAt: string;
}

export interface FacilitySummary {
  facilityId: string;
  name: string;
  type: FacilityType;
  distanceMeters: number;
  walkMinutes: number;
  coordinates: { lat: number; lng: number };
  priceCents: number;
  currency: string;
  available: boolean;
  avgRating?: number;
  reviewCount: number;
  amenities: string[];
  coverPhotoUrl?: string;
}

export interface PriceQuote {
  available: boolean;
  spotsLeft: number;
  quote?: {
    basePriceCents: number;
    serviceFeeCents: number;
    taxCents: number;
    totalCents: number;
    currency: string;
  };
}

export interface BookingPass {
  code: string;
  qrData: string;
  facility: {
    name: string;
    address: string;
    accessInstructions?: string;
  };
  vehicle?: {
    plate: string;
    state: string;
  };
  window: { start: string; end: string };
  directionsUrl?: string;
}
