import { Loan, BorrowerProfile, UserSettings, RepaymentStatus, PayoutMethod, ApplicationStatus } from '../types';
import { db } from './firebase';
import { collection, doc, writeBatch, getDocs } from 'firebase/firestore';
import { cleanFirestorePayload, getDeletedLoanIds, getDeletedBorrowerIds } from './firestoreSync';

export interface RecoveryScanResult {
  loans: Loan[];
  borrowers: BorrowerProfile[];
  scannedKeys: string[];
  totalFound: number;
}

/**
 * Inspects all local browser storage keys to recover any historical loans or borrowers
 * from past versions, previous sessions, or alternate storage namespaces.
 */
export const scanLocalStorageForData = (): RecoveryScanResult => {
  const recoveredLoans: Loan[] = [];
  const recoveredBorrowers: BorrowerProfile[] = [];
  const scannedKeys: string[] = [];

  if (typeof window === 'undefined' || !window.localStorage) {
    return { loans: [], borrowers: [], scannedKeys: [], totalFound: 0 };
  }

  // Priority known keys from previous versions
  const candidateKeys = [
    'imali_loans_v1',
    'imali_loans',
    'loans',
    'loans_data',
    'imali_ledger',
    'imali_commitments',
    'imali_data_loans',
    'imali_backup_loans',
    'imali_profiles_v1',
    'imali_profiles',
    'imali_borrowers',
    'borrowers',
    'borrower_profiles',
    'imali_clients',
    'imali_data_borrowers',
    'imali_data',
    'imali_backup',
    'imali_state'
  ];

  // Add all existing localStorage keys
  const allKeys = new Set<string>(candidateKeys);
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k) allKeys.add(k);
    }
  } catch (e) {
    console.warn('Could not list all localStorage keys:', e);
  }

  const seenLoanIds = new Set<string>();
  const seenBorrowerIds = new Set<string>();
  const deletedLoanIds = getDeletedLoanIds();
  const deletedBorrowerIds = getDeletedBorrowerIds();

  allKeys.forEach((key) => {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw || raw.length < 5) return;
      scannedKeys.push(key);

      const parsed = JSON.parse(raw);

      // Helper to process a potential loan
      const testAndAddLoan = (item: any) => {
        if (!item || typeof item !== 'object') return;
        const idNumber = item.idNumber || item.saId || item.id_number;
        const borrowerName = item.borrowerName || item.name || item.borrower_name;
        const amount = Number(item.amountLoaned || item.amount || item.principal);

        if (idNumber && borrowerName && !isNaN(amount) && amount > 0) {
          const loanId = item.id || `T0${seenLoanIds.size + 1}`;
          if (!seenLoanIds.has(loanId) && !deletedLoanIds.has(loanId)) {
            seenLoanIds.add(loanId);
            const cleanLoan = cleanFirestorePayload({
              id: loanId,
              borrowerName,
              idNumber: String(idNumber),
              physicalAddress: item.physicalAddress || item.address || 'Address on file',
              borrowerNumber: item.borrowerNumber || item.phone || '0700000000',
              profilePhoto: item.profilePhoto || null,
              email: item.email || null,
              employer: item.employer || null,
              employmentStatus: item.employmentStatus || 'Employed',
              payoutMethod: item.payoutMethod || PayoutMethod.MOBILE,
              bankDetails: item.bankDetails || null,
              amountLoaned: amount,
              interestRate: Number(item.interestRate) || 30,
              penaltyRate: Number(item.penaltyRate) || 5,
              totalRepayment: Number(item.totalRepayment) || Math.round(amount * 1.3),
              startDate: item.startDate || new Date().toISOString().split('T')[0],
              dueDate: item.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
              status: item.status || RepaymentStatus.PENDING,
              applicationStatus: item.applicationStatus || ApplicationStatus.APPROVED,
              history: Array.isArray(item.history) ? item.history : [{
                date: item.startDate || new Date().toISOString().split('T')[0],
                action: 'Disbursed',
                amount: amount
              }]
            });
            recoveredLoans.push(cleanLoan);
          }
        }
      };

      // Helper to process a potential borrower profile
      const testAndAddBorrower = (item: any) => {
        if (!item || typeof item !== 'object') return;
        const idNumber = item.idNumber || item.saId || item.id_number;
        const name = item.name || item.borrowerName || item.borrower_name;

        if (idNumber && name && String(idNumber).length >= 6) {
          const cleanId = String(idNumber);
          if (!seenBorrowerIds.has(cleanId) && !deletedBorrowerIds.has(cleanId)) {
            seenBorrowerIds.add(cleanId);
            const cleanBorrower = cleanFirestorePayload({
              idNumber: cleanId,
              name: String(name),
              phone: item.phone || item.borrowerNumber || '',
              address: item.address || item.physicalAddress || '',
              email: item.email || `${cleanId.slice(0, 5)}@imali.co.za`,
              profilePhoto: item.profilePhoto || null,
              score: typeof item.score === 'number' ? item.score : 600,
              employer: item.employer || null,
              employmentStatus: item.employmentStatus || null,
              payoutMethod: item.payoutMethod || PayoutMethod.MOBILE,
              bankDetails: item.bankDetails || null,
              createdAt: item.createdAt || new Date().toISOString()
            });
            recoveredBorrowers.push(cleanBorrower);
          }
        }
      };

      // Handle arrays
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item.amountLoaned !== undefined || item.principal !== undefined || item.dueDate !== undefined) {
            testAndAddLoan(item);
          } else {
            testAndAddBorrower(item);
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        // Nested object structures e.g. { loans: [...], borrowers: [...] }
        if (Array.isArray(parsed.loans)) parsed.loans.forEach(testAndAddLoan);
        if (Array.isArray(parsed.borrowers)) parsed.borrowers.forEach(testAndAddBorrower);
        if (Array.isArray(parsed.profiles)) parsed.profiles.forEach(testAndAddBorrower);
      }
    } catch {
      // Ignore unparseable keys
    }
  });

  return {
    loans: recoveredLoans,
    borrowers: recoveredBorrowers,
    scannedKeys,
    totalFound: recoveredLoans.length + recoveredBorrowers.length
  };
};

/**
 * Batch saves a list of loans and borrowers to Firestore without overwriting existing cloud data.
 */
export const syncBatchToFirestore = async (
  loans: Loan[],
  borrowers: BorrowerProfile[]
): Promise<{ savedLoans: number; savedBorrowers: number }> => {
  let savedLoans = 0;
  let savedBorrowers = 0;

  try {
    const batch = writeBatch(db);

    (loans || []).forEach((loan) => {
      if (loan && loan.id) {
        const loanRef = doc(db, 'loans', loan.id);
        const cleanLoan = cleanFirestorePayload({
          ...loan,
          updatedAt: new Date().toISOString()
        });
        batch.set(loanRef, cleanLoan, { merge: true });
        savedLoans++;
      }
    });

    (borrowers || []).forEach((borrower) => {
      if (borrower && borrower.idNumber) {
        const borrowerRef = doc(db, 'borrowers', borrower.idNumber);
        const cleanBorrower = cleanFirestorePayload({
          ...borrower,
          updatedAt: new Date().toISOString()
        });
        batch.set(borrowerRef, cleanBorrower, { merge: true });
        savedBorrowers++;
      }
    });

    if (savedLoans > 0 || savedBorrowers > 0) {
      await batch.commit();
    }
  } catch (error) {
    console.warn('Batch sync to Firestore deferred (working offline):', error);
    throw error;
  }

  return { savedLoans, savedBorrowers };
};

/**
 * Exports current database records as a standalone JSON backup file.
 */
export const downloadJSONBackup = (
  loans: Loan[],
  borrowers: BorrowerProfile[],
  settings?: UserSettings
) => {
  const exportPayload = {
    appName: 'imali',
    exportDate: new Date().toISOString(),
    metadata: {
      totalLoans: loans.length,
      totalBorrowers: borrowers.length,
      totalCapitalDisbursed: loans.reduce((acc, l) => acc + (l.amountLoaned || 0), 0)
    },
    loans,
    borrowers,
    settings: settings || {}
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `imali-database-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Exports current loans as a structured CSV ledger.
 */
export const downloadLoansCSV = (loans: Loan[]) => {
  const headers = [
    'Loan ID',
    'Borrower Name',
    'ID Number',
    'Phone',
    'Principal (ZAR)',
    'Interest Rate (%)',
    'Total Due (ZAR)',
    'Start Date',
    'Due Date',
    'Status',
    'Application Status',
    'Payout Method',
    'Address'
  ];

  const rows = loans.map((l) => [
    `"${l.id}"`,
    `"${(l.borrowerName || '').replace(/"/g, '""')}"`,
    `"${l.idNumber}"`,
    `"${l.borrowerNumber || ''}"`,
    l.amountLoaned,
    l.interestRate,
    l.totalRepayment,
    `"${l.startDate}"`,
    `"${l.dueDate}"`,
    `"${l.status}"`,
    `"${l.applicationStatus || ''}"`,
    `"${l.payoutMethod || ''}"`,
    `"${(l.physicalAddress || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `imali-loans-ledger-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Parses user-uploaded JSON or CSV content to restore loans and borrowers.
 */
export const parseBackupFileContent = (
  fileContent: string
): { loans: Loan[]; borrowers: BorrowerProfile[] } => {
  const clean = fileContent.trim();
  const result: { loans: Loan[]; borrowers: BorrowerProfile[] } = { loans: [], borrowers: [] };

  // Try JSON first
  if (clean.startsWith('{') || clean.startsWith('[')) {
    try {
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (item.amountLoaned !== undefined || item.dueDate !== undefined) {
            result.loans.push(item as Loan);
          } else if (item.idNumber && item.name) {
            result.borrowers.push(item as BorrowerProfile);
          }
        });
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.loans)) {
          result.loans.push(...(parsed.loans as Loan[]));
        }
        if (Array.isArray(parsed.borrowers)) {
          result.borrowers.push(...(parsed.borrowers as BorrowerProfile[]));
        }
      }
      return result;
    } catch (e) {
      console.error('JSON parsing failed, trying CSV parsing', e);
    }
  }

  // Parse CSV format
  const lines = clean.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length > 1) {
    // Header check
    const headerLine = lines[0].toLowerCase();
    if (headerLine.includes('loan') || headerLine.includes('borrower') || headerLine.includes('principal')) {
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 5) {
          const loanId = cols[0] || `T0${i}`;
          const borrowerName = cols[1] || 'Borrower';
          const idNumber = cols[2] || `900000000000${i}`;
          const phone = cols[3] || '0700000000';
          const amountLoaned = Number(cols[4]) || 1000;
          const interestRate = Number(cols[5]) || 30;
          const totalRepayment = Number(cols[6]) || Math.round(amountLoaned * 1.3);
          const startDate = cols[7] || new Date().toISOString().split('T')[0];
          const dueDate = cols[8] || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
          const status = (cols[9] as RepaymentStatus) || RepaymentStatus.PENDING;

          result.loans.push({
            id: loanId,
            borrowerName,
            idNumber,
            borrowerNumber: phone,
            physicalAddress: cols[12] || 'South Africa',
            amountLoaned,
            interestRate,
            penaltyRate: 5,
            totalRepayment,
            startDate,
            dueDate,
            status,
            payoutMethod: PayoutMethod.MOBILE,
            applicationStatus: ApplicationStatus.APPROVED,
            history: [{ date: startDate, action: 'Imported Record', amount: amountLoaned }]
          });

          result.borrowers.push({
            idNumber,
            name: borrowerName,
            phone,
            address: cols[12] || 'South Africa',
            email: `${idNumber.slice(0, 5)}@imali.co.za`
          });
        }
      }
    }
  }

  return result;
};
