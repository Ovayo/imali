import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { BorrowerProfile, Loan, UserSettings } from '../types';
import { INITIAL_LOANS } from '../constants';

export const BORROWERS_COLLECTION = 'borrowers';
export const LOANS_COLLECTION = 'loans';
export const SETTINGS_COLLECTION = 'settings';
export const SETTINGS_DOC_ID = 'global_settings';

export const DELETED_LOAN_IDS_KEY = 'imali_deleted_loan_ids';
export const DELETED_BORROWER_IDS_KEY = 'imali_deleted_borrower_ids';

/**
 * Retrieves the set of IDs for loans that have been intentionally deleted by the user.
 */
export const getDeletedLoanIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_LOAN_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

/**
 * Marks a loan ID as permanently deleted to prevent resurrection from storage or cloud snapshots.
 */
export const markLoanAsDeleted = (loanId: string): void => {
  if (!loanId) return;
  try {
    const set = getDeletedLoanIds();
    set.add(loanId);
    localStorage.setItem(DELETED_LOAN_IDS_KEY, JSON.stringify(Array.from(set)));
    purgeLoanFromLocalStorage(loanId);
  } catch (e) {
    console.warn('Error recording deleted loan ID:', e);
  }
};

/**
 * Removes a loan from deletion tombstone in case of manual re-creation or restore.
 */
export const unmarkLoanAsDeleted = (loanId: string): void => {
  if (!loanId) return;
  try {
    const set = getDeletedLoanIds();
    set.delete(loanId);
    localStorage.setItem(DELETED_LOAN_IDS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {
    console.warn('Error unmarking deleted loan ID:', e);
  }
};

/**
 * Retrieves the set of borrower ID numbers that have been permanently deleted.
 */
export const getDeletedBorrowerIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_BORROWER_IDS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch {}
  return new Set();
};

/**
 * Marks a borrower profile as deleted.
 */
export const markBorrowerAsDeleted = (idNumber: string): void => {
  if (!idNumber) return;
  try {
    const set = getDeletedBorrowerIds();
    set.add(idNumber);
    localStorage.setItem(DELETED_BORROWER_IDS_KEY, JSON.stringify(Array.from(set)));
    purgeBorrowerFromLocalStorage(idNumber);
  } catch (e) {
    console.warn('Error recording deleted borrower ID:', e);
  }
};

/**
 * Purges a specific loan from all known current and legacy browser localStorage keys.
 */
export const purgeLoanFromLocalStorage = (loanId: string): void => {
  if (!loanId) return;
  const targetKeys = [
    'imali_loans_v1',
    'imali_loans',
    'loans',
    'loans_data',
    'imali_ledger',
    'imali_commitments',
    'imali_data_loans',
    'imali_backup_loans'
  ];
  targetKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((item: any) => item && item.id !== loanId);
          localStorage.setItem(k, JSON.stringify(filtered));
        }
      }
    } catch {}
  });
};

/**
 * Purges a specific borrower profile from all browser localStorage keys.
 */
export const purgeBorrowerFromLocalStorage = (idNumber: string): void => {
  if (!idNumber) return;
  const targetKeys = [
    'imali_profiles_v1',
    'imali_profiles',
    'imali_borrowers',
    'borrowers',
    'borrower_profiles',
    'imali_clients',
    'imali_data_borrowers'
  ];
  targetKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((item: any) => item && item.idNumber !== idNumber);
          localStorage.setItem(k, JSON.stringify(filtered));
        }
      }
    } catch {}
  });
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

/**
 * Standardized Firestore error handler adhering to Firebase integration specifications.
 * Propagates diagnostic JSON errors on permission-denied events while gracefully
 * logging transient network / offline events so client continues smoothly.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMessage = error instanceof Error ? error.message : String(error);
  if (errMessage.includes('permission-denied') || errMessage.includes('Missing or insufficient permissions')) {
    const errInfo: FirestoreErrorInfo = {
      error: errMessage,
      authInfo: {
        userId: null,
        email: null,
        emailVerified: null,
        isAnonymous: null,
        tenantId: null,
        providerInfo: []
      },
      operationType,
      path
    };
    console.error('Firestore Permission Error:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }
  
  // Non-fatal / offline / transient connectivity warning
  console.warn(`Firestore [${operationType}] on [${path || 'global'}]: offline/deferred:`, errMessage);
}

// Subscribe to real-time borrowers updates from Firestore
export const subscribeToBorrowers = (callback: (borrowers: BorrowerProfile[]) => void) => {
  const path = BORROWERS_COLLECTION;
  try {
    const colRef = collection(db, path);
    return onSnapshot(colRef, (snapshot) => {
      const deletedBorrowerIds = getDeletedBorrowerIds();
      const list: BorrowerProfile[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as BorrowerProfile;
        if (data && data.idNumber) {
          if (deletedBorrowerIds.has(data.idNumber)) {
            // Document was marked deleted by user; ensure purged from Firestore
            deleteDoc(d.ref).catch(() => {});
          } else {
            list.push(data);
          }
        }
      });
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
};

// Subscribe to real-time loans updates from Firestore
export const subscribeToLoans = (callback: (loans: Loan[]) => void) => {
  const path = LOANS_COLLECTION;
  try {
    const colRef = collection(db, path);
    return onSnapshot(colRef, (snapshot) => {
      const deletedLoanIds = getDeletedLoanIds();
      const list: Loan[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Loan;
        if (data && data.id) {
          if (deletedLoanIds.has(data.id)) {
            // Document was marked deleted by user; ensure purged from Firestore
            deleteDoc(d.ref).catch(() => {});
          } else {
            list.push(data);
          }
        }
      });
      // Sort with newest or id descending
      list.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
      callback(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
};

// Subscribe to real-time settings updates
export const subscribeToSettings = (callback: (settings: UserSettings) => void) => {
  const path = `${SETTINGS_COLLECTION}/${SETTINGS_DOC_ID}`;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserSettings);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return () => {};
  }
};

/**
 * Recursively sanitizes any payload for Firestore.
 * Strips all undefined fields so Firestore's setDoc and writeBatch never throw:
 * "Function WriteBatch.set() called with invalid data. Unsupported field value: undefined"
 */
export const cleanFirestorePayload = <T>(data: T): any => {
  if (data === null || data === undefined) return {};
  try {
    return JSON.parse(JSON.stringify(data));
  } catch {
    return data;
  }
};

// Save or update a borrower profile in Firestore
export const saveBorrowerToFirestore = async (borrower: BorrowerProfile): Promise<void> => {
  if (!borrower || !borrower.idNumber) return;
  const path = `${BORROWERS_COLLECTION}/${borrower.idNumber}`;
  try {
    const docRef = doc(db, BORROWERS_COLLECTION, borrower.idNumber);
    const cleanData = cleanFirestorePayload({
      ...borrower,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Delete a borrower profile in Firestore and local caches
export const deleteBorrowerFromFirestore = async (idNumber: string): Promise<void> => {
  markBorrowerAsDeleted(idNumber);
  purgeBorrowerFromLocalStorage(idNumber);
  const path = `${BORROWERS_COLLECTION}/${idNumber}`;
  try {
    const docRef = doc(db, BORROWERS_COLLECTION, idNumber);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Save or update a loan commitment in Firestore
export const saveLoanToFirestore = async (loan: Loan): Promise<void> => {
  if (!loan || !loan.id) return;
  unmarkLoanAsDeleted(loan.id);
  const path = `${LOANS_COLLECTION}/${loan.id}`;
  try {
    const docRef = doc(db, LOANS_COLLECTION, loan.id);
    const cleanData = cleanFirestorePayload({
      ...loan,
      updatedAt: new Date().toISOString()
    });
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Delete a loan in Firestore and local caches
export const deleteLoanFromFirestore = async (loanId: string): Promise<void> => {
  markLoanAsDeleted(loanId);
  purgeLoanFromLocalStorage(loanId);
  const path = `${LOANS_COLLECTION}/${loanId}`;
  try {
    const docRef = doc(db, LOANS_COLLECTION, loanId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Save settings to Firestore
export const saveSettingsToFirestore = async (settings: UserSettings): Promise<void> => {
  const path = `${SETTINGS_COLLECTION}/${SETTINGS_DOC_ID}`;
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const cleanData = cleanFirestorePayload(settings);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Seed initial loans & borrowers if collection is empty and not previously seeded/deleted
export const seedInitialDataIfEmpty = async (): Promise<void> => {
  try {
    if (localStorage.getItem('imali_seed_completed') === 'true') {
      return;
    }
    // If user has recorded deletions, do not reseed
    if (getDeletedLoanIds().size > 0 || getDeletedBorrowerIds().size > 0) {
      localStorage.setItem('imali_seed_completed', 'true');
      return;
    }
    const loansCol = collection(db, LOANS_COLLECTION);
    const snap = await getDocs(loansCol);
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const loan of INITIAL_LOANS) {
        const loanRef = doc(db, LOANS_COLLECTION, loan.id);
        const cleanLoan = cleanFirestorePayload({
          ...loan,
          createdAt: new Date().toISOString()
        });
        batch.set(loanRef, cleanLoan);

        // Also ensure borrower profile exists
        const borrowerRef = doc(db, BORROWERS_COLLECTION, loan.idNumber);
        const borrowerDoc: BorrowerProfile = {
          idNumber: loan.idNumber,
          name: loan.borrowerName,
          phone: loan.borrowerNumber,
          address: loan.physicalAddress,
          email: `${loan.idNumber.substring(0, 5)}@imali.co.za`
        };
        const cleanBorrower = cleanFirestorePayload({
          ...borrowerDoc,
          createdAt: new Date().toISOString()
        });
        batch.set(borrowerRef, cleanBorrower, { merge: true });
      }
      await batch.commit();
      localStorage.setItem('imali_seed_completed', 'true');
      console.log('Seeded initial loans and borrower profiles to Firestore');
    } else {
      localStorage.setItem('imali_seed_completed', 'true');
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, LOANS_COLLECTION);
  }
};
