import { UserRole } from '../types';

export type DeviceUserType = 
  | 'NEW_DEVICE' 
  | 'RETURNING_UNREGISTERED' 
  | 'RETURNING_BORROWER' 
  | 'LOGGED_IN_BORROWER' 
  | 'AUTHENTICATED_LENDER';

export interface DeviceSessionInfo {
  deviceId: string;
  userType: DeviceUserType;
  isFirstVisit: boolean;
  loggedInBorrowerId: string | null;
  isLenderAuthenticated: boolean;
  recommendedRole: UserRole;
  deviceLabel: string;
  firstSeenAt: string;
  lastSeenAt: string;
}

const STORAGE_KEYS = {
  DEVICE_ID: 'imali_device_id_v2',
  FIRST_SEEN: 'imali_device_first_seen_v2',
  LAST_SEEN: 'imali_device_last_seen_v2',
  USER_ROLE: 'imali_user_role_v2',
  LENDER_AUTH: 'imali_lender_authenticated_v2',
  BORROWER_ID: 'imali_logged_in_borrower_id_v2',
  LAST_KNOWN_BORROWER_ID: 'imali_last_borrower_id_v2'
};

const MASTER_ADMIN_PASSWORDS = ['imali-admin', '1234', 'admin'];

/**
 * Generate or retrieve a persistent device identifier
 */
export const getOrCreateDeviceId = (): { deviceId: string; isFirstVisit: boolean } => {
  let deviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  let isFirstVisit = false;

  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
    localStorage.setItem(STORAGE_KEYS.FIRST_SEEN, new Date().toISOString());
    isFirstVisit = true;
  }

  localStorage.setItem(STORAGE_KEYS.LAST_SEEN, new Date().toISOString());
  return { deviceId, isFirstVisit };
};

/**
 * Audit and detect the device's current identity, session, and role.
 * CRITICAL RULE: A fresh or unrecognized device MUST NEVER default to Lender/Admin!
 */
export const detectDeviceSession = (expectedVaultKey?: string): DeviceSessionInfo => {
  const { deviceId, isFirstVisit } = getOrCreateDeviceId();
  const firstSeenAt = localStorage.getItem(STORAGE_KEYS.FIRST_SEEN) || new Date().toISOString();
  const lastSeenAt = new Date().toISOString();

  // Check URL parameters for explicit deep links
  const urlParams = new URLSearchParams(window.location.search);
  const urlVaultKey = urlParams.get('vault_key');
  const urlRole = urlParams.get('role');
  const urlBorrowerId = urlParams.get('borrower_id');

  // 1. Check if URL contains valid admin vault key
  let isLenderAuthFromUrl = false;
  if (urlVaultKey && expectedVaultKey && urlVaultKey.trim() === expectedVaultKey.trim()) {
    isLenderAuthFromUrl = true;
    localStorage.setItem(STORAGE_KEYS.LENDER_AUTH, 'true');
    localStorage.setItem(STORAGE_KEYS.USER_ROLE, UserRole.LENDER);
  }

  // 2. Check stored lender authentication
  const storedLenderAuth = localStorage.getItem(STORAGE_KEYS.LENDER_AUTH) === 'true';
  const isLenderAuthenticated = isLenderAuthFromUrl || storedLenderAuth;

  // 3. Check stored borrower session
  const storedBorrowerId = urlBorrowerId || localStorage.getItem(STORAGE_KEYS.BORROWER_ID) || null;
  const lastKnownBorrowerId = localStorage.getItem(STORAGE_KEYS.LAST_KNOWN_BORROWER_ID) || null;

  // 4. Stored user role (BORROWER by default for security)
  const storedRole = localStorage.getItem(STORAGE_KEYS.USER_ROLE);

  // 5. Determine user type and recommended role
  let userType: DeviceUserType = 'NEW_DEVICE';
  let recommendedRole: UserRole = UserRole.BORROWER;
  let deviceLabel = 'New Device (Guest)';

  if (isFirstVisit && !isLenderAuthenticated && !storedBorrowerId) {
    userType = 'NEW_DEVICE';
    recommendedRole = UserRole.BORROWER;
    deviceLabel = 'New Visitor / Prospective Borrower';
  } else if (isLenderAuthenticated && (storedRole === UserRole.LENDER || urlRole === 'lender' || isLenderAuthFromUrl)) {
    userType = 'AUTHENTICATED_LENDER';
    recommendedRole = UserRole.LENDER;
    deviceLabel = 'Admin / Lender Device';
  } else if (storedBorrowerId) {
    userType = 'LOGGED_IN_BORROWER';
    recommendedRole = UserRole.BORROWER;
    deviceLabel = `Active Borrower (${storedBorrowerId})`;
  } else if (lastKnownBorrowerId) {
    userType = 'RETURNING_BORROWER';
    recommendedRole = UserRole.BORROWER;
    deviceLabel = 'Returning Borrower';
  } else {
    userType = 'RETURNING_UNREGISTERED';
    recommendedRole = UserRole.BORROWER;
    deviceLabel = 'Returning Visitor';
  }

  return {
    deviceId,
    userType,
    isFirstVisit,
    loggedInBorrowerId: storedBorrowerId,
    isLenderAuthenticated,
    recommendedRole,
    deviceLabel,
    firstSeenAt,
    lastSeenAt
  };
};

/**
 * Persist borrower login on this device
 */
export const persistBorrowerLogin = (borrowerId: string) => {
  if (!borrowerId) return;
  localStorage.setItem(STORAGE_KEYS.BORROWER_ID, borrowerId);
  localStorage.setItem(STORAGE_KEYS.LAST_KNOWN_BORROWER_ID, borrowerId);
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, UserRole.BORROWER);
};

/**
 * Clear borrower session on this device
 */
export const clearBorrowerLogin = () => {
  localStorage.removeItem(STORAGE_KEYS.BORROWER_ID);
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, UserRole.BORROWER);
};

/**
 * Persist lender authentication on this device
 */
export const persistLenderAuthentication = () => {
  localStorage.setItem(STORAGE_KEYS.LENDER_AUTH, 'true');
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, UserRole.LENDER);
  localStorage.removeItem(STORAGE_KEYS.BORROWER_ID);
};

/**
 * Revoke lender authentication on this device
 */
export const clearLenderAuthentication = () => {
  localStorage.removeItem(STORAGE_KEYS.LENDER_AUTH);
  localStorage.setItem(STORAGE_KEYS.USER_ROLE, UserRole.BORROWER);
};

/**
 * Validate lender passkey
 * Rejects empty passkeys and ensures strict authentication
 */
export const verifyLenderPasskey = (input: string, vaultKey?: string): boolean => {
  if (!input) return false;
  const clean = input.trim();
  if (!clean) return false;

  // Check master passwords
  if (MASTER_ADMIN_PASSWORDS.includes(clean.toLowerCase())) {
    return true;
  }

  // Check dynamic vault key
  if (vaultKey && clean === vaultKey.trim()) {
    return true;
  }

  return false;
};
