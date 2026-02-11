
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
  emailReports: boolean;
  emailNewAppAlerts: boolean;
  emailOverdueAlerts: boolean;
  smsStatusUpdates: boolean; // New: SMS for Paid/Overdue/Rejected/Approved
  emailStatusUpdates: boolean; // New: Email for status changes
  darkMode: boolean;
}

export interface LoanTemplate {
  id: string;
  label: string;
  labelXh: string;
  amount: number;
  purpose: string;
  purposeXh: string;
}

export interface Loan {
  id: string;
  borrowerName: string;
  idNumber: string;
  physicalAddress: string;
  borrowerNumber: string; // Primary mobile number
  email?: string; // Optional email address
  alternativeNumber?: string;
  employer?: string;
  employmentStatus?: string; // Added field
  payoutMethod: PayoutMethod;
  bankDetails?: string;
  amountLoaned: number;
  interestRate: number; // Percentage
  penaltyRate: number; // Weekly percentage for overdue
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
