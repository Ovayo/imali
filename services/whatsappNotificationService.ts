import { Loan, RepaymentStatus, UserSettings, WhatsAppNotification, WhatsAppNotificationType } from '../types';
import { db } from './firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { cleanFirestorePayload } from './firestoreSync';

const NOTIFICATIONS_COLLECTION = 'whatsapp_notifications';
const LOCAL_STORAGE_KEY = 'imali_whatsapp_notifications_v1';
const SENT_REGISTRY_KEY = 'imali_wa_sent_registry_v1';

/**
 * Format a phone number into international format for WhatsApp (defaults to South Africa +27).
 */
export const formatWhatsAppNumber = (phone?: string): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) {
    return '27' + cleaned.slice(1);
  }
  if (cleaned.startsWith('27')) {
    return cleaned;
  }
  return cleaned;
};

/**
 * Calculate penalty details for an overdue loan.
 */
export const calculateOverduePenalty = (loan: Loan) => {
  const dueDate = new Date(loan.dueDate);
  const today = new Date();
  const diffTime = Math.max(0, today.getTime() - dueDate.getTime());
  const weeksOverdue = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
  const penaltyRate = loan.penaltyRate || 5;
  const penaltyAmount = Math.round(loan.amountLoaned * (penaltyRate / 100) * weeksOverdue);
  return { penalty: penaltyAmount, weeks: weeksOverdue, penaltyRate };
};

/**
 * Generate a culturally respectful, comprehensive WhatsApp message for overdue loans.
 */
export const buildOverdueMessage = (loan: Loan): string => {
  const { penalty, weeks, penaltyRate } = calculateOverduePenalty(loan);
  const totalOutstanding = loan.totalRepayment + penalty;
  const payoutInfo = loan.bankDetails ? `Bank Ref: ${loan.bankDetails}` : `Mobile Payout (${loan.borrowerNumber})`;

  return `🚨 *IMALI MICRO-LENDING: OVERDUE REPAYMENT NOTICE*
*Isaziso sentlawulo edlulelwe lixesha*

Molo *${loan.borrowerName}*,

This is an urgent automated reminder regarding your imali microloan commitment (*${loan.id}*).
Your payment was scheduled for *${loan.dueDate}* and is currently marked as *OVERDUE*.

📋 *Account Summary:*
• Principal Borrowed: R ${loan.amountLoaned.toLocaleString()}
• Base Repayment: R ${loan.totalRepayment.toLocaleString()}
• Overdue Penalty: R ${penalty.toLocaleString()} (${weeks} wk(s) @ ${penaltyRate}%/wk)
• *Total Outstanding: R ${totalOutstanding.toLocaleString()}*
• Payment Reference: ${loan.id} / ${payoutInfo}

⚠️ Prompt settlement is required to protect your Community Trust Score, prevent default escalation, and maintain your borrowing eligibility in the community.

Please reply to this WhatsApp message or contact your lender immediately to confirm payment.

_Siyabonga kakhulu ngokuthembeka kwakho._
_Imali Micro-Lending Community Support_`;
};

/**
 * Generate a congratulatory, clear WhatsApp message for newly approved loan applications.
 */
export const buildApprovalMessage = (loan: Loan): string => {
  const payoutInfo = loan.bankDetails 
    ? `Bank Account (${loan.bankDetails})` 
    : `Mobile Number (${loan.borrowerNumber})`;

  return `🎉 *IMALI MICRO-LENDING: APPLICATION APPROVED!*
*Isicelo sakho semali samkelekile!*

Halala *${loan.borrowerName}*!

We are pleased to inform you that your loan application (*${loan.id}*) has been officially *APPROVED* by your lender.

📋 *Approved Commitment Details:*
• Approved Amount: *R ${loan.amountLoaned.toLocaleString()}*
• Total Due on Repayment: R ${loan.totalRepayment.toLocaleString()}
• Due Date: *${loan.dueDate}*
• Payout Channel: ${loan.payoutMethod || 'Direct Transfer'} - ${payoutInfo}

Funds are currently being released according to your chosen payout channel. You can view your commitment history and repayment schedule anytime on the imali platform.

_Siyakuvuyisana nawe! Thank you for partnering with imali._`;
};

/**
 * Build a standard WhatsApp Click-to-Chat URL.
 */
export const buildWhatsAppUrl = (phone: string, message: string): string => {
  const formattedPhone = formatWhatsAppNumber(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
};

/**
 * Creates a complete WhatsAppNotification item from a loan and notification type.
 */
export const createNotificationItem = (
  loan: Loan,
  type: WhatsAppNotificationType,
  triggerReason: string
): WhatsAppNotification => {
  const message = type === 'overdue_reminder' 
    ? buildOverdueMessage(loan) 
    : buildApprovalMessage(loan);
  
  const waUrl = buildWhatsAppUrl(loan.borrowerNumber, message);

  return {
    id: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId: loan.id,
    borrowerName: loan.borrowerName,
    borrowerNumber: loan.borrowerNumber,
    type,
    triggerReason,
    message,
    waUrl,
    timestamp: new Date().toISOString(),
    status: 'triggered'
  };
};

/**
 * Check if a notification of this type has already been triggered for this loan recently (24-hour deduplication).
 */
export const hasNotificationTriggeredRecently = (loanId: string, type: WhatsAppNotificationType): boolean => {
  try {
    const raw = localStorage.getItem(SENT_REGISTRY_KEY);
    if (!raw) return false;
    const registry: Record<string, number> = JSON.parse(raw);
    const key = `${loanId}_${type}`;
    const lastSent = registry[key];
    if (!lastSent) return false;

    // 24 hours cooldown for automated triggers
    const cooldownMs = 24 * 60 * 60 * 1000;
    return Date.now() - lastSent < cooldownMs;
  } catch {
    return false;
  }
};

/**
 * Record that a notification has been sent/triggered to avoid duplicate triggers.
 */
export const recordNotificationSent = (loanId: string, type: WhatsAppNotificationType): void => {
  try {
    const raw = localStorage.getItem(SENT_REGISTRY_KEY);
    const registry: Record<string, number> = raw ? JSON.parse(raw) : {};
    registry[`${loanId}_${type}`] = Date.now();
    localStorage.setItem(SENT_REGISTRY_KEY, JSON.stringify(registry));
  } catch (err) {
    console.warn('Failed to record notification registry:', err);
  }
};

/**
 * Save a notification record to local storage.
 */
export const saveNotificationLocally = (notification: WhatsAppNotification): WhatsAppNotification[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing: WhatsAppNotification[] = raw ? JSON.parse(raw) : [];
    // Keep newest first, max 100 records
    const updated = [notification, ...existing.filter(n => n.id !== notification.id)].slice(0, 100);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [notification];
  }
};

/**
 * Get stored notifications from local storage.
 */
export const getLocalNotifications = (): WhatsAppNotification[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Save notification to Firestore.
 */
export const saveNotificationToFirestore = async (notification: WhatsAppNotification): Promise<void> => {
  try {
    const docRef = doc(db, NOTIFICATIONS_COLLECTION, notification.id);
    const cleanData = cleanFirestorePayload(notification);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Firestore notification save failed (working offline):', err);
  }
};

/**
 * Subscribe to real-time notification records from Firestore.
 */
export const subscribeToNotifications = (callback: (notifications: WhatsAppNotification[]) => void) => {
  try {
    const colRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const list: WhatsAppNotification[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as WhatsAppNotification);
      });
      callback(list);
    }, (error) => {
      console.warn('Firestore notification subscription fallback to local:', error);
      callback(getLocalNotifications());
    });
  } catch (err) {
    console.warn('Subscription error:', err);
    callback(getLocalNotifications());
    return () => {};
  }
};

/**
 * Dispatches an automated WhatsApp notification:
 * - Creates the notification record
 * - Persists to local storage & Firestore
 * - Records in deduplication registry
 * - Returns the notification object for UI alert / prompt
 */
export const dispatchAutomatedNotification = async (
  loan: Loan,
  type: WhatsAppNotificationType,
  reason: string,
  force: boolean = false
): Promise<WhatsAppNotification | null> => {
  if (!force && hasNotificationTriggeredRecently(loan.id, type)) {
    console.log(`Notification for loan ${loan.id} (${type}) skipped due to 24h deduplication.`);
    return null;
  }

  const notification = createNotificationItem(loan, type, reason);
  
  // Persist locally
  saveNotificationLocally(notification);
  recordNotificationSent(loan.id, type);

  // Persist to Firestore asynchronously
  saveNotificationToFirestore(notification).catch(err => console.warn('Cloud notification sync error:', err));

  return notification;
};

/**
 * Automated Overdue Auditor:
 * Evaluates loans to identify which ones are past due and need to transition to OVERDUE status,
 * and generates corresponding automated WhatsApp notifications if automation is enabled.
 */
export interface AuditOverdueResult {
  updatedLoans: Loan[];
  transitionedLoans: Loan[];
  notificationsGenerated: WhatsAppNotification[];
}

export const runAutomatedOverdueAudit = (
  loans: Loan[],
  settings: UserSettings
): AuditOverdueResult => {
  const today = new Date();
  // Set to start of today for date comparison
  today.setHours(0, 0, 0, 0);

  const updatedLoans: Loan[] = [];
  const transitionedLoans: Loan[] = [];
  const notificationsGenerated: WhatsAppNotification[] = [];

  const isAutomationActive = settings.whatsappAutomation !== false && settings.whatsappAutoOverdue !== false;

  loans.forEach((loan) => {
    // Only pending loans can transition automatically to Overdue based on due date
    if (loan.status === RepaymentStatus.PENDING && loan.dueDate) {
      const dueDate = new Date(loan.dueDate);
      dueDate.setHours(23, 59, 59, 999);

      if (today.getTime() > dueDate.getTime()) {
        // Loan is past due date! Transition to OVERDUE
        const transitionedLoan: Loan = {
          ...loan,
          status: RepaymentStatus.OVERDUE,
          history: [
            ...(loan.history || []),
            {
              date: new Date().toISOString().split('T')[0],
              action: 'Automated Status Update: Marked as Overdue (Due date passed)'
            }
          ]
        };

        updatedLoans.push(transitionedLoan);
        transitionedLoans.push(transitionedLoan);

        // Generate automated WhatsApp notification if automation is enabled
        if (isAutomationActive && !hasNotificationTriggeredRecently(loan.id, 'overdue_reminder')) {
          const notification = createNotificationItem(
            transitionedLoan,
            'overdue_reminder',
            `Automated daily audit: Commitment passed due date (${loan.dueDate})`
          );
          saveNotificationLocally(notification);
          recordNotificationSent(loan.id, 'overdue_reminder');
          saveNotificationToFirestore(notification).catch(e => console.warn(e));
          notificationsGenerated.push(notification);
        }
      } else {
        updatedLoans.push(loan);
      }
    } else {
      updatedLoans.push(loan);
    }
  });

  return {
    updatedLoans,
    transitionedLoans,
    notificationsGenerated
  };
};
