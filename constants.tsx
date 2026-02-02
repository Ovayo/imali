
import { Loan, RepaymentStatus, PayoutMethod, Language, ApplicationStatus, LoanTemplate } from './types';

export const DEFAULT_INTEREST_RATE = 30;
export const DEFAULT_PENALTY_RATE = 5;

// Added TRANSLATIONS export to fix "Module has no exported member 'TRANSLATIONS'" error
export const TRANSLATIONS = {
  [Language.EN]: {
    dashboard: 'Dashboard',
    settings: 'Settings',
    updateSuccess: 'Updated successfully'
  },
  [Language.XH]: {
    dashboard: 'IDeshibhodi',
    settings: 'Izicwangciso',
    updateSuccess: 'Ihlaziywe ngempumelelo'
  }
};

export const LOAN_TEMPLATES: LoanTemplate[] = [
  {
    id: 'startup',
    label: 'Business Stock',
    labelXh: 'Isitokhwe Somsebenzi',
    amount: 5000,
    purpose: 'Buying bulk stock for small business resale.',
    purposeXh: 'Ukuthenga isitokhwe somsebenzi omncinci.'
  },
  {
    id: 'transport',
    label: 'Transport / Taxi',
    labelXh: 'Uthutho / Itekisi',
    amount: 1200,
    purpose: 'Monthly commute and taxi fare for work.',
    purposeXh: 'Imali yothutho yenyanga yomsebenzi.'
  },
  {
    id: 'emergency',
    label: 'Emergency / Household',
    labelXh: 'Ingxakeko / Ikhaya',
    amount: 800,
    purpose: 'Urgent household repairs or grocery shortfall.',
    purposeXh: 'Iinkcitho zangaphakathi ezingalindelekanga.'
  },
  {
    id: 'education',
    label: 'School Fees / Stationery',
    labelXh: 'Imfundo / Iincwadi',
    amount: 2500,
    purpose: 'School uniforms, books, or registration fees.',
    purposeXh: 'Iyunifomu yesikolo, iincwadi okanye umrhumo.'
  }
];

export const SA_BANKS = [
  'Standard Bank',
  'First National Bank (FNB)',
  'Absa',
  'Nedbank',
  'Capitec Bank',
  'TymeBank',
  'Discovery Bank',
  'Bank Zero',
  'African Bank',
  'Investec',
  'Bidvest Bank',
  'Sasfin Bank',
  'Grindrod Bank',
  'Postbank',
  'Old Mutual Bank',
  'Mercantile Bank',
  'Al Baraka Bank',
  'HBZ Bank',
  'Access Bank South Africa'
];

export const INITIAL_LOANS: Loan[] = [
  {
    id: 'T001',
    borrowerName: 'Ms S Nkila',
    idNumber: '9201010001081',
    email: 'snkila@example.com',
    physicalAddress: 'East London, South Africa',
    borrowerNumber: '0660710211',
    payoutMethod: PayoutMethod.MOBILE,
    amountLoaned: 400,
    interestRate: 30,
    penaltyRate: 5,
    totalRepayment: 520,
    startDate: '2025-11-15',
    dueDate: '2025-12-01',
    status: RepaymentStatus.PAID,
    applicationStatus: ApplicationStatus.APPROVED,
    notes: '20% for Aretha',
    history: [
      { date: '2025-11-15', action: 'Loan Disbursed', amount: 400 },
      { date: '2025-12-01', action: 'Full Repayment Received', amount: 520 }
    ]
  },
  {
    id: 'T002',
    borrowerName: 'Ms A Gwavu',
    idNumber: '8805120002084',
    email: 'agwavu@example.com',
    physicalAddress: 'Qonce, South Africa',
    borrowerNumber: '0694266153',
    payoutMethod: PayoutMethod.MOBILE,
    amountLoaned: 400,
    interestRate: 30,
    penaltyRate: 5,
    totalRepayment: 520,
    startDate: '2025-11-15',
    dueDate: '2025-11-25',
    status: RepaymentStatus.PAID,
    applicationStatus: ApplicationStatus.APPROVED,
    notes: '20% for Aretha',
    history: [
      { date: '2025-11-15', action: 'Loan Disbursed', amount: 400 },
      { date: '2025-11-25', action: 'Full Repayment Received', amount: 520 }
    ]
  },
  {
    id: 'T011',
    borrowerName: 'U Zokhela',
    idNumber: '9611200014087',
    email: 'uzokhela@example.com',
    physicalAddress: 'Mdantsane, South Africa',
    borrowerNumber: '0730713439',
    payoutMethod: PayoutMethod.MOBILE,
    amountLoaned: 3000,
    interestRate: 60,
    penaltyRate: 5,
    totalRepayment: 4800,
    startDate: '2025-12-01',
    dueDate: '2025-12-20',
    status: RepaymentStatus.OVERDUE,
    applicationStatus: ApplicationStatus.APPROVED,
    notes: '40% for Aretha',
    history: [
      { date: '2025-12-01', action: 'Loan Disbursed', amount: 3000 }
    ]
  }
];
