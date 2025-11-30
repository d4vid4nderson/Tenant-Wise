// Form input types for document generation and CRUD operations

import { PropertyType, TenantStatus, DocumentType } from './database';

// Late Rent Notice Form
export interface LateRentFormData {
  tenantName: string;
  propertyAddress: string;
  unitNumber?: string;
  rentAmount: number;
  lateFee: number;
  totalAmountDue: number;
  rentDueDate: string;
  noticeDate: string;
  daysToComply: number;
  landlordName: string;
  landlordAddress?: string;
  landlordPhone?: string;
  landlordEmail?: string;
  paymentMethods?: string;
}

// Lease Renewal Form
export interface LeaseRenewalFormData {
  tenantName: string;
  propertyAddress: string;
  unitNumber?: string;
  currentLeaseEnd: string;
  newLeaseStart: string;
  newLeaseEnd: string;
  currentRent: number;
  newRent: number;
  rentChangePercentage?: number;
  responseDeadline: string;
  landlordName: string;
  landlordPhone?: string;
  landlordEmail?: string;
  additionalTerms?: string;
}

// Maintenance Response Form
export interface MaintenanceFormData {
  tenantName: string;
  propertyAddress: string;
  unitNumber?: string;
  requestDate: string;
  issueDescription: string;
  issueCategory: 'plumbing' | 'electrical' | 'hvac' | 'appliance' | 'structural' | 'pest' | 'other';
  urgencyLevel: 'emergency' | 'urgent' | 'routine';
  scheduledDate?: string;
  scheduledTime?: string;
  contractorName?: string;
  contractorPhone?: string;
  estimatedCost?: number;
  tenantResponsibility?: boolean;
  accessInstructions?: string;
  landlordName: string;
  landlordPhone?: string;
  landlordEmail?: string;
}

// Move-In/Move-Out Checklist Form
export interface MoveInOutFormData {
  tenantName: string;
  propertyAddress: string;
  unitNumber?: string;
  checklistType: 'move_in' | 'move_out';
  inspectionDate: string;
  rooms: RoomCondition[];
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  meterReadings?: {
    electric?: string;
    gas?: string;
    water?: string;
  };
  keysProvided?: string[];
  tenantSignature?: string;
  landlordSignature?: string;
  photos?: string[];
  additionalNotes?: string;
}

export interface RoomCondition {
  room: string;
  walls: ConditionRating;
  floors: ConditionRating;
  windows: ConditionRating;
  fixtures: ConditionRating;
  notes?: string;
}

export type ConditionRating = 'excellent' | 'good' | 'fair' | 'poor' | 'n/a';

// Security Deposit Return Form
export interface DepositReturnFormData {
  tenantName: string;
  tenantForwardingAddress: string;
  propertyAddress: string;
  unitNumber?: string;
  moveOutDate: string;
  leaseEndDate: string;
  originalDeposit: number;
  deductions: DeductionItem[];
  totalDeductions: number;
  amountReturned: number;
  checkNumber?: string;
  landlordName: string;
  landlordAddress: string;
  landlordPhone?: string;
  landlordEmail?: string;
  noticeDate: string;
}

export interface DeductionItem {
  description: string;
  amount: number;
  category: 'cleaning' | 'repair' | 'replacement' | 'unpaid_rent' | 'other';
}

// Property Form
export interface PropertyFormData {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  unit_count?: number;
  property_type?: PropertyType;
  notes?: string;
}

// Tenant Form
export interface TenantFormData {
  property_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  lease_start?: string;
  lease_end?: string;
  rent_amount?: number;
  security_deposit?: number;
  status?: TenantStatus;
  notes?: string;
}

// Document Generation Request
export interface GenerateDocumentRequest {
  documentType: DocumentType;
  state?: string;
  formData: LateRentFormData | LeaseRenewalFormData | MaintenanceFormData | MoveInOutFormData | DepositReturnFormData;
  propertyId?: string;
  tenantId?: string;
  title?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Search/Filter Types
export interface DocumentFilters {
  documentType?: DocumentType;
  propertyId?: string;
  tenantId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PropertyFilters {
  propertyType?: PropertyType;
  city?: string;
  state?: string;
  search?: string;
}

export interface TenantFilters {
  propertyId?: string;
  status?: TenantStatus;
  search?: string;
}
