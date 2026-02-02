
import { Loan, RepaymentStatus, PayoutMethod, Language, ApplicationStatus, LoanTemplate } from './types';

export const DEFAULT_INTEREST_RATE = 30;
export const DEFAULT_PENALTY_RATE = 5;

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

export const INITIAL_LOANS: Loan[] = [
  {
    id: 'T001',
    borrowerName: 'Ms S Nkila',
    idNumber: '9201010001081',
    email: 'snkila@biz.co.za',
    physicalAddress: '12 Buffalo St, East London',
    borrowerNumber: '0660710211',
    payoutMethod: PayoutMethod.MOBILE,
    amountLoaned: 400,
    interestRate: 30,
    penaltyRate: 5,
    totalRepayment: 520,
    startDate: '2025-01-15',
    dueDate: '2025-02-01',
    status: RepaymentStatus.PAID,
    applicationStatus: ApplicationStatus.APPROVED,
    history: [
      { date: '2025-01-15', action: 'Loan Disbursed', amount: 400 },
      { date: '2025-02-01', action: 'Full Repayment Received', amount: 520 }
    ]
  },
  {
    id: 'T002',
    borrowerName: 'Ms A Gwavu',
    idNumber: '8805120002084',
    email: 'agwavu@cloud.com',
    physicalAddress: '45 High St, Qonce',
    borrowerNumber: '0694266153',
    payoutMethod: PayoutMethod.MOBILE,
    amountLoaned: 400,
    interestRate: 30,
    penaltyRate: 5,
    totalRepayment: 520,
    startDate: '2025-02-10',
    dueDate: '2025-02-20',
    status: RepaymentStatus.PAID,
    applicationStatus: ApplicationStatus.APPROVED,
    history: [
      { date: '2025-02-10', action: 'Loan Disbursed', amount: 400 },
      { date: '2025-02-20', action: 'Full Repayment Received', amount: 520 }
    ]
  },
  {
    id: 'T011',
    borrowerName: 'Mr U Zokhela',
    idNumber: '9611200014087',
    email: 'uzokhela@work.za',
    physicalAddress: 'Block C, Mdantsane',
    borrowerNumber: '0730713439',
    payoutMethod: PayoutMethod.MOBILE,
    amountLoaned: 3000,
    interestRate: 60,
    penaltyRate: 5,
    totalRepayment: 4800,
    startDate: '2025-03-01',
    dueDate: '2025-03-15',
    status: RepaymentStatus.OVERDUE,
    applicationStatus: ApplicationStatus.APPROVED,
    history: [
      { date: '2025-03-01', action: 'Loan Disbursed', amount: 3000 }
    ]
  },
  {
    id: 'T014',
    borrowerName: 'Mrs B Mbeki',
    idNumber: '7503145001089',
    email: 'b.mbeki@home.co.za',
    physicalAddress: '78 Phakamisa Ext, Zwelitsha',
    borrowerNumber: '0824419902',
    payoutMethod: PayoutMethod.BANK,
    amountLoaned: 1500,
    interestRate: 30,
    penaltyRate: 5,
    totalRepayment: 1950,
    startDate: '2025-03-05',
    dueDate: '2025-03-25',
    status: RepaymentStatus.PENDING,
    applicationStatus: ApplicationStatus.APPROVED,
    history: [{ date: '2025-03-05', action: 'Loan Disbursed', amount: 1500 }]
  },
  {
    id: 'T015',
    borrowerName: 'Mr J September',
    idNumber: '8209210003082',
    email: 'september.j@mail.za',
    physicalAddress: 'Unit 4, Beacon Bay',
    borrowerNumber: '0715568821',
    payoutMethod: PayoutMethod.MOBILE,
    amountLoaned: 800,
    interestRate: 30,
    penaltyRate: 5,
    totalRepayment: 1040,
    startDate: '2025-02-20',
    dueDate: '2025-03-05',
    status: RepaymentStatus.PAID,
    applicationStatus: ApplicationStatus.APPROVED,
    history: [
      { date: '2025-02-20', action: 'Loan Disbursed', amount: 800 },
      { date: '2025-03-05', action: 'Full Repayment Received', amount: 1040 }
    ]
  },
  {
    id: 'T018',
    borrowerName: 'Ms L Dlamini',
    idNumber: '9405060012081',
    email: 'dlamini.l@fintech.za',
    physicalAddress: '19 Southernwood, Mthatha',
    borrowerNumber: '0632219984',
    payoutMethod: PayoutMethod.BANK,
    amountLoaned: 5000,
    interestRate: 20,
    penaltyRate: 5,
    totalRepayment: 6000,
    startDate: '2025-03-10',
    dueDate: '2025-04-10',
    status: RepaymentStatus.PENDING,
    applicationStatus: ApplicationStatus.APPROVED,
    history: [{ date: '2025-03-10', action: 'Large Business Loan Disbursed', amount: 5000 }]
  }
];
