
export enum RepaymentStatus {
  PENDING = 'Pending',
  PAID = 'Paid',
  OVERDUE = 'Overdue',
  DEFAULTED = 'Defaulted'
}

export enum ApplicationStatus {
  SUBMITTED = 'Submitted',
  REVIEWING = 'Reviewing',
  APPROVED = 'Approved',
  REJECTED = 'Rejected'
}

export enum PayoutMethod {
  MOBILE = 'Mobile Number',
  BANK = 'Bank Account'
}

export enum Language {
  EN = 'en',
  XH = 'xh'
}

export enum UserRole {
  LENDER = 'Lender',
  BORROWER = 'Borrower'
}

export interface LoanHistoryItem {
  date: string;
  action: string;
  amount?: number;
}

export interface UserSettings {
  overdueAlerts: boolean;
  whatsappAutomation: boolean;
  whatsappAutoOverdue?: boolean;
  whatsappAutoApproval?: boolean;
  whatsappAutoOpen?: boolean;
  emailReports: boolean;
  emailNewAppAlerts: boolean;
  emailOverdueAlerts: boolean;
  darkMode: boolean;
  adminVaultKey: string;
  smsStatusUpdates: boolean;
  emailStatusUpdates: boolean;
  lenderPhoto?: string;
}

export interface LoanTemplate {
  id: string;
  label: string;
  labelXh: string;
  amount: number;
  purpose: string;
  purposeXh: string;
}

export interface BorrowerProfile {
  idNumber: string;
  name: string;
  phone: string;
  address: string;
  email: string;
  profilePhoto?: string;
  score?: number;
  employer?: string;
  employmentStatus?: string;
  monthlyIncome?: number;
  alternativeNumber?: string;
  payoutMethod?: PayoutMethod;
  bankDetails?: string;
  notes?: string;
  kycVerified?: boolean;
  kycIdVerified?: boolean;
  kycAddressVerified?: boolean;
  kycFaceVerified?: boolean;
  kycDocumentVerified?: boolean;
  kycIncomeVerified?: boolean;
  kycDocumentType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Loan {
  id: string;
  borrowerName: string;
  idNumber: string;
  physicalAddress: string;
  borrowerNumber: string;
  profilePhoto?: string;
  email?: string;
  alternativeNumber?: string;
  employer?: string;
  employmentStatus?: string;
  payoutMethod: PayoutMethod;
  bankDetails?: string;
  amountLoaned: number;
  interestRate: number;
  penaltyRate: number;
  totalRepayment: number;
  startDate: string;
  dueDate: string;
  status: RepaymentStatus;
  applicationStatus?: ApplicationStatus;
  notes?: string;
  history: LoanHistoryItem[];
}

export interface DashboardStats {
  totalLoaned: number;
  expectedRevenue: number;
  repaymentRate: number;
  activeBorrowers: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type WhatsAppNotificationType = 'overdue_reminder' | 'application_approved';

export interface WhatsAppNotification {
  id: string;
  loanId: string;
  borrowerName: string;
  borrowerNumber: string;
  type: WhatsAppNotificationType;
  triggerReason: string;
  message: string;
  waUrl: string;
  timestamp: string;
  status: 'sent' | 'triggered' | 'dismissed';
}
