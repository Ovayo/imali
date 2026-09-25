
import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from './components/Layout';
import CameraCaptureModal from './components/CameraCaptureModal';
import TrustScoreDisplay from './components/TrustScoreDisplay';
import BorrowerDossierModal from './components/BorrowerDossierModal';
import BorrowerSelfProfileView from './components/BorrowerSelfProfileView';
import LoanSimulationTool from './components/LoanSimulationTool';
import EditLoanModal from './components/EditLoanModal';
import DeleteLoanModal from './components/DeleteLoanModal';
import DataRecoveryModal from './components/DataRecoveryModal';
import LoanEmiCalculatorModal from './components/LoanEmiCalculatorModal';
import DeviceOnboardingView from './components/DeviceOnboardingView';
import { 
  detectDeviceSession, 
  persistBorrowerLogin, 
  clearBorrowerLogin, 
  persistLenderAuthentication, 
  clearLenderAuthentication, 
  verifyLenderPasskey,
  DeviceSessionInfo 
} from './services/deviceDetectionService';
import { WhatsAppNotificationModal } from './components/WhatsAppNotificationModal';
import { WhatsAppAutomationHub } from './components/WhatsAppAutomationHub';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Loan, 
  RepaymentStatus, 
  PayoutMethod, 
  Language, 
  UserSettings, 
  UserRole, 
  ApplicationStatus, 
  BorrowerProfile,
  WhatsAppNotification
} from './types';
import { 
  TrendingUp, AlertCircle, CheckCircle2, Plus, Smartphone, ShieldCheck, Bell, Mail, Save, Search, 
  ArrowRight, Wallet, ChevronRight, History, Info, X, Loader2, Eye, MapPin, Fingerprint, 
  Key, UserCircle, ReceiptText, Zap, AlertTriangle, Shield, Users, BarChart3, Send, 
  Thermometer, Wind, Droplets, Calendar, Calculator, Settings, RefreshCw, Trash2, Home, 
  Mail as MailIcon, Clock, LogIn, Star, ShieldAlert, UserPlus, Navigation, Check, 
  Building2, Briefcase, ArrowUpRight, CalendarClock, HelpCircle, MessageCircle, Copy, 
  Link as LinkIcon, ClipboardList, Camera, Sparkles, Filter, ArrowUpDown, UserCheck, FileText, CheckCheck,
  Database, FolderSync, Edit3
} from 'lucide-react';
import { 
  DEFAULT_INTEREST_RATE, 
  DEFAULT_PENALTY_RATE, 
  INITIAL_LOANS, 
  TRANSLATIONS 
} from './constants';
import {
  subscribeToBorrowers,
  subscribeToLoans,
  subscribeToSettings,
  saveBorrowerToFirestore,
  deleteBorrowerFromFirestore,
  saveLoanToFirestore,
  deleteLoanFromFirestore,
  saveSettingsToFirestore,
  seedInitialDataIfEmpty,
  getDeletedLoanIds,
  markLoanAsDeleted,
  getDeletedBorrowerIds,
  markBorrowerAsDeleted,
  purgeLoanFromLocalStorage
} from './services/firestoreSync';
import {
  downloadJSONBackup,
  downloadLoansCSV
} from './services/dataRecoveryService';
import {
  dispatchAutomatedNotification,
  runAutomatedOverdueAudit,
  subscribeToNotifications,
  getLocalNotifications,
  buildOverdueMessage,
  buildApprovalMessage
} from './services/whatsappNotificationService';

const LENDER_PASSWORD = 'imali-admin';

const EMPLOYMENT_STATUSES = [
  'Full-time', 'Part-time', 'Self-employed', 'Contract', 'Unemployed', 'Student', 'Retired'
];

const generateRandomKey = () => {
  return 'vault-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(Language.EN);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deviceSession, setDeviceSession] = useState<DeviceSessionInfo>(() => {
    return detectDeviceSession();
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const session = detectDeviceSession();
    return session.recommendedRole; // Defaults to BORROWER so new visitors/devices never see admin dashboard!
  }); 
  const [isLenderAuthenticated, setIsLenderAuthenticated] = useState<boolean>(() => {
    const session = detectDeviceSession();
    return session.isLenderAuthenticated; // Requires explicit passkey or admin vault URL
  });
  const [lenderPassInput, setLenderPassInput] = useState('');
  const [lenderAuthError, setLenderAuthError] = useState(false);
  const [loggedInBorrowerId, setLoggedInBorrowerId] = useState<string | null>(() => {
    const session = detectDeviceSession();
    return session.loggedInBorrowerId;
  });
  const [showToast, setShowToast] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RepaymentStatus | 'all'>('all');
  const [borrowerFilter, setBorrowerFilter] = useState<'all' | 'active' | 'debt_free' | 'overdue' | 'high_trust' | 'kyc_pending'>('all');
  const [borrowerSort, setBorrowerSort] = useState<'score_desc' | 'score_asc' | 'borrowed_desc' | 'name_asc'>('score_desc');

  const [loans, setLoans] = useState<Loan[]>(() => {
    const deletedLoanIds = getDeletedLoanIds();
    const filterDeleted = (arr: Loan[]) => arr.filter(l => l && l.id && !deletedLoanIds.has(l.id));

    const primary = localStorage.getItem('imali_loans_v1');
    if (primary) {
      try {
        const parsed = JSON.parse(primary);
        if (Array.isArray(parsed)) return filterDeleted(parsed);
      } catch {}
    }
    const legacyKeys = ['imali_loans', 'loans', 'imali_ledger', 'imali_backup_loans', 'imali_data_loans'];
    for (const k of legacyKeys) {
      const leg = localStorage.getItem(k);
      if (leg) {
        try {
          const parsed = JSON.parse(leg);
          if (Array.isArray(parsed) && parsed.length > 0) return filterDeleted(parsed);
        } catch {}
      }
    }
    // If user deleted all loans, respect that and do not bring back initial loans
    if (deletedLoanIds.size > 0) {
      return [];
    }
    return filterDeleted(INITIAL_LOANS);
  });

  const [extraProfiles, setExtraProfiles] = useState<BorrowerProfile[]>(() => {
    const deletedBorrowerIds = getDeletedBorrowerIds();
    const filterDeleted = (arr: BorrowerProfile[]) => arr.filter(p => p && p.idNumber && !deletedBorrowerIds.has(p.idNumber));

    const primary = localStorage.getItem('imali_profiles_v1');
    if (primary) {
      try {
        const parsed = JSON.parse(primary);
        if (Array.isArray(parsed)) return filterDeleted(parsed);
      } catch {}
    }
    const legacyKeys = ['imali_profiles', 'imali_borrowers', 'borrowers', 'borrower_profiles', 'imali_clients'];
    for (const k of legacyKeys) {
      const leg = localStorage.getItem(k);
      if (leg) {
        try {
          const parsed = JSON.parse(leg);
          if (Array.isArray(parsed) && parsed.length > 0) return filterDeleted(parsed);
        } catch {}
      }
    }
    return [];
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('imali_settings_v1');
    const base = saved ? JSON.parse(saved) : {
      overdueAlerts: true,
      whatsappAutomation: true,
      whatsappAutoOverdue: true,
      whatsappAutoApproval: true,
      whatsappAutoOpen: false,
      emailReports: false,
      emailNewAppAlerts: true,
      emailOverdueAlerts: true,
      smsStatusUpdates: true,
      emailStatusUpdates: false,
      darkMode: false,
    };
    if (!base.adminVaultKey) base.adminVaultKey = generateRandomKey();
    if (base.whatsappAutoOverdue === undefined) base.whatsappAutoOverdue = true;
    if (base.whatsappAutoApproval === undefined) base.whatsappAutoApproval = true;
    if (base.whatsappAutoOpen === undefined) base.whatsappAutoOpen = false;
    return base;
  });

  // Automated WhatsApp Notification Service State
  const [activeWhatsAppNotification, setActiveWhatsAppNotification] = useState<WhatsAppNotification | null>(null);
  const [isWhatsAppHubOpen, setIsWhatsAppHubOpen] = useState(false);
  const [whatsAppNotifications, setWhatsAppNotifications] = useState<WhatsAppNotification[]>(() => getLocalNotifications());

  // Camera Capture Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraTargetId, setCameraTargetId] = useState<string | null>(null);
  const [cameraTargetContext, setCameraTargetContext] = useState<'current_user' | 'borrower' | 'registration' | 'new_loan'>('current_user');

  // Data Recovery Modal State
  const [isDataRecoveryOpen, setIsDataRecoveryOpen] = useState(false);

  // Loan EMI & Penalty Calculator Modal State
  const [isEmiCalculatorModalOpen, setIsEmiCalculatorModalOpen] = useState(false);

  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
  const [borrowerToDelete, setBorrowerToDelete] = useState<{ idNumber: string, name: string } | null>(null);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginId, setLoginId] = useState('');
  const [regForm, setRegForm] = useState({ name: '', id: '', phone: '', address: '', profilePhoto: '' });

  const [newLoanForm, setNewLoanForm] = useState({
    borrowerName: '', idNumber: '', physicalAddress: '', borrowerNumber: '',
    employer: '', employmentStatus: 'Full-time', amountLoaned: 1000,
    dueDate: '', payoutMethod: PayoutMethod.MOBILE, profilePhoto: ''
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedBorrowerId, setSelectedBorrowerId] = useState<string | null>(null);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // Initialize and subscribe to Firestore for real-time cross-device updates
  useEffect(() => {
    // Seed initial demo data in Firestore only if database is brand new and not previously initialized/deleted
    seedInitialDataIfEmpty();

    // 1. Subscribe to Borrower Profiles
    const unsubBorrowers = subscribeToBorrowers((cloudProfiles) => {
      const deletedBorrowerIds = getDeletedBorrowerIds();
      const validProfiles = (cloudProfiles || []).filter(p => p && p.idNumber && !deletedBorrowerIds.has(p.idNumber));
      setExtraProfiles(validProfiles);
      setIsCloudConnected(true);
    });

    // 2. Subscribe to Loans
    const unsubLoans = subscribeToLoans((cloudLoans) => {
      const deletedLoanIds = getDeletedLoanIds();
      const validLoans = (cloudLoans || []).filter(l => l && l.id && !deletedLoanIds.has(l.id));
      setLoans(validLoans);
      setIsCloudConnected(true);
    });

    // 3. Subscribe to Settings
    const unsubSettings = subscribeToSettings((cloudSettings) => {
      if (cloudSettings) {
        setSettings(prev => ({ ...prev, ...cloudSettings }));
      }
    });

    // 4. Subscribe to WhatsApp Notifications
    const unsubNotifs = subscribeToNotifications((cloudNotifs) => {
      if (cloudNotifs) {
        setWhatsAppNotifications(cloudNotifs);
      }
    });

    return () => {
      unsubBorrowers();
      unsubLoans();
      unsubSettings();
      unsubNotifs();
    };
  }, []);

  // Automated Overdue Auditor: Detects loans turning Overdue and triggers automated WhatsApp reminders
  useEffect(() => {
    if (loans.length === 0) return;
    if (settings.whatsappAutomation === false || settings.whatsappAutoOverdue === false) return;

    const result = runAutomatedOverdueAudit(loans, settings);
    if (result.transitionedLoans.length > 0) {
      setLoans(result.updatedLoans);
      result.transitionedLoans.forEach(l => {
        saveLoanToFirestore(l).catch(err => console.warn('Sync overdue status failed:', err));
      });

      if (result.notificationsGenerated.length > 0) {
        setActiveWhatsAppNotification(result.notificationsGenerated[0]);
        setShowToast(`🚨 Automated Alert: ${result.transitionedLoans.length} loan(s) transitioned to Overdue! WhatsApp reminder ready.`);
        setTimeout(() => setShowToast(null), 4500);
      }
    }
  }, [loans, settings.whatsappAutomation, settings.whatsappAutoOverdue]);

  useEffect(() => {
    localStorage.setItem('imali_user_role_v2', userRole);
    setDeviceSession(detectDeviceSession());
  }, [userRole]);

  useEffect(() => {
    if (isLenderAuthenticated) {
      persistLenderAuthentication();
    } else {
      clearLenderAuthentication();
    }
    setDeviceSession(detectDeviceSession());
  }, [isLenderAuthenticated]);

  useEffect(() => {
    if (loggedInBorrowerId) {
      persistBorrowerLogin(loggedInBorrowerId);
    } else {
      clearBorrowerLogin();
    }
    setDeviceSession(detectDeviceSession());
  }, [loggedInBorrowerId]);

  useEffect(() => {
    localStorage.setItem('imali_profiles_v1', JSON.stringify(extraProfiles));
  }, [extraProfiles]);

  useEffect(() => {
    localStorage.setItem('imali_settings_v1', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('imali_loans_v1', JSON.stringify(loans));
  }, [loans]);

  // Fix: Added missing toggleSetting function to handle boolean setting updates
  const toggleSetting = (key: keyof UserSettings) => {
    setSettings(prev => {
      const updated = {
        ...prev,
        [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key]
      };
      saveSettingsToFirestore(updated).catch(err => console.warn('Cloud save settings deferred:', err));
      return updated;
    });
  };

  // Fix: Added missing handleCopyMagicLink function to copy the vault access link to clipboard
  const handleCopyMagicLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?vault_key=${settings.adminVaultKey}`;
    navigator.clipboard.writeText(link);
    setShowToast("Magic link copied to clipboard!");
    setTimeout(() => setShowToast(null), 3000);
  };

  // Fix: Added missing handleRegenerateKey function to generate a new admin vault security key
  const handleRegenerateKey = () => {
    const newKey = generateRandomKey();
    setSettings(prev => {
      const updated = { ...prev, adminVaultKey: newKey };
      saveSettingsToFirestore(updated).catch(err => console.warn('Cloud save settings key deferred:', err));
      return updated;
    });
    setShowToast("Security key regenerated!");
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleSendNotifications = () => {
    setIsSendingNotifications(true);
    setTimeout(() => {
      setIsSendingNotifications(false);
      setShowToast(language === Language.XH ? 'Izaziso zithunyelwe!' : 'Notifications sent!');
      setTimeout(() => setShowToast(null), 3000);
    }, 2000);
  };

  const t = TRANSLATIONS[language];

  useEffect(() => {
    if ("geolocation" in navigator && loggedInBorrowerId) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
            const data = await response.json();
            const city = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county;
            if (city) setDetectedCity(city);
          } catch (err) { console.error(err); }
          setIsLocating(false);
        },
        () => setIsLocating(false),
        { timeout: 10000 }
      );
    }
  }, [loggedInBorrowerId]);

  const calculatePenaltyDetails = (loan: Loan) => {
    if (loan.status !== RepaymentStatus.OVERDUE) return { penalty: 0, weeks: 0 };
    const dueDate = new Date(loan.dueDate);
    const today = new Date();
    const diffTime = Math.max(0, today.getTime() - dueDate.getTime());
    const weeksOverdue = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
    const penaltyAmount = loan.amountLoaned * (loan.penaltyRate / 100) * weeksOverdue;
    return { penalty: Math.round(penaltyAmount), weeks: weeksOverdue };
  };

  const calculateCreditScore = (borrowerLoans: Loan[]) => {
    let score = 600;
    borrowerLoans.forEach(l => {
      if (l.status === RepaymentStatus.PAID) score += 45;
      if (l.status === RepaymentStatus.OVERDUE) score -= 90;
      if (l.status === RepaymentStatus.DEFAULTED) score -= 250;
    });
    return Math.min(850, Math.max(300, score));
  };

  const getScoreRating = (score: number) => {
    if (score >= 750) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', rating: 'A+', icon: Star };
    if (score >= 680) return { label: 'Good', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', rating: 'B', icon: ShieldCheck };
    if (score >= 500) return { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', rating: 'C', icon: Info };
    return { label: 'Risk', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', rating: 'D', icon: ShieldAlert };
  };

  const borrowers = useMemo(() => {
    const map = new Map<string, any>();
    loans.forEach(loan => {
      if (!map.has(loan.idNumber)) {
        map.set(loan.idNumber, { 
          idNumber: loan.idNumber, 
          name: loan.borrowerName, 
          address: loan.physicalAddress,
          phone: loan.borrowerNumber, 
          email: loan.email || loan.idNumber.substring(0, 5) + '@biz.co.za',
          profilePhoto: loan.profilePhoto,
          employer: loan.employer || '',
          employmentStatus: loan.employmentStatus || 'Employed',
          payoutMethod: loan.payoutMethod || PayoutMethod.BANK,
          bankDetails: loan.bankDetails || '',
          loans: [], 
          score: 0,
          kycVerified: false,
        });
      }
      map.get(loan.idNumber)!.loans.push(loan);
      if (loan.profilePhoto && !map.get(loan.idNumber)!.profilePhoto) {
        map.get(loan.idNumber)!.profilePhoto = loan.profilePhoto;
      }
    });
    extraProfiles.forEach(p => { 
      if (!map.has(p.idNumber)) {
        map.set(p.idNumber, { ...p, loans: [], score: 600 });
      } else {
        const existing = map.get(p.idNumber)!;
        Object.assign(existing, p);
      }
    });
    map.forEach(b => {
      b.score = calculateCreditScore(b.loans);
    });
    return Array.from(map.values());
  }, [loans, extraProfiles]);

  // Deep linking and URL navigation parameters handler
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vaultKey = params.get('vault_key');
    const calcParam = params.get('calc') || params.get('tab') === 'calculator';
    const applyParam = params.get('apply') || params.get('tab') === 'apply';
    const roleParam = params.get('role');
    const adminParam = params.get('admin');
    const borrowerParam = params.get('borrower_id');

    if (vaultKey && settings.adminVaultKey && vaultKey.trim() === settings.adminVaultKey.trim()) {
      setIsLenderAuthenticated(true);
      persistLenderAuthentication();
      setUserRole(UserRole.LENDER);
      setLoggedInBorrowerId(null);
      window.history.replaceState({}, document.title, window.location.pathname);
      setShowToast("Private Vault Access Granted — Welcome Ovayo Monti");
      setTimeout(() => setShowToast(null), 3500);
    } else if (roleParam === 'lender' || adminParam === 'true') {
      setUserRole(UserRole.LENDER);
      setIsLenderAuthenticated(false);
    }

    if (borrowerParam && borrowers.length > 0) {
      const cleanParam = borrowerParam.trim();
      const found = borrowers.find(b => b.idNumber === cleanParam);
      if (found) {
        setLoggedInBorrowerId(found.idNumber);
        persistBorrowerLogin(found.idNumber);
        setUserRole(UserRole.BORROWER);
      }
    }

    if (calcParam) {
      setIsEmiCalculatorModalOpen(true);
    }

    if (applyParam) {
      setIsAddModalOpen(true);
    }
  }, [settings.adminVaultKey, borrowers]);

  const selectedBorrower = useMemo(() => {
    if (!selectedBorrowerId) return null;
    return borrowers.find(b => b.idNumber === selectedBorrowerId) || null;
  }, [borrowers, selectedBorrowerId]);

  const filteredAndSortedBorrowers = useMemo(() => {
    let list = borrowers.filter(b => 
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.idNumber.includes(searchTerm) ||
      (b.phone && b.phone.includes(searchTerm)) ||
      (b.address && b.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (borrowerFilter === 'active') {
      list = list.filter(b => b.loans.some((l: Loan) => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE));
    } else if (borrowerFilter === 'debt_free') {
      list = list.filter(b => !b.loans.some((l: Loan) => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE));
    } else if (borrowerFilter === 'overdue') {
      list = list.filter(b => b.loans.some((l: Loan) => l.status === RepaymentStatus.OVERDUE));
    } else if (borrowerFilter === 'high_trust') {
      list = list.filter(b => b.score >= 700);
    } else if (borrowerFilter === 'kyc_pending') {
      list = list.filter(b => !b.kycVerified);
    }

    return list.sort((a, b) => {
      if (borrowerSort === 'score_desc') return b.score - a.score;
      if (borrowerSort === 'score_asc') return a.score - b.score;
      if (borrowerSort === 'name_asc') return a.name.localeCompare(b.name);
      if (borrowerSort === 'borrowed_desc') {
        const aTotal = a.loans.reduce((sum: number, l: Loan) => sum + l.amountLoaned, 0);
        const bTotal = b.loans.reduce((sum: number, l: Loan) => sum + l.amountLoaned, 0);
        return bTotal - aTotal;
      }
      return 0;
    });
  }, [borrowers, searchTerm, borrowerFilter, borrowerSort]);

  const borrowerNetworkStats = useMemo(() => {
    const total = borrowers.length;
    const withActiveDebt = borrowers.filter(b => b.loans.some((l: Loan) => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE)).length;
    const withOverdue = borrowers.filter(b => b.loans.some((l: Loan) => l.status === RepaymentStatus.OVERDUE)).length;
    const cleanRate = total > 0 ? (((total - withOverdue) / total) * 100) : 100;
    const avgScore = total > 0 ? Math.round(borrowers.reduce((acc, b) => acc + b.score, 0) / total) : 600;

    return { total, withActiveDebt, withOverdue, cleanRate, avgScore };
  }, [borrowers]);

  const currentBorrowerAccount = useMemo(() => {
    if (!loggedInBorrowerId) return null;
    return borrowers.find(b => b.idNumber === loggedInBorrowerId) || null;
  }, [borrowers, loggedInBorrowerId]);

  const openCameraCapture = (context: 'current_user' | 'borrower' | 'registration' | 'new_loan', targetId?: string) => {
    setCameraTargetContext(context);
    setCameraTargetId(targetId || (context === 'current_user' ? loggedInBorrowerId : null));
    setIsCameraModalOpen(true);
  };

  const handleCapturedPhoto = (base64Photo?: string) => {
    if (cameraTargetContext === 'registration') {
      setRegForm(prev => ({ ...prev, profilePhoto: base64Photo || '' }));
      setShowToast(base64Photo ? "Profile photo captured!" : "Profile photo removed.");
      setTimeout(() => setShowToast(null), 3000);
      return;
    }

    if (cameraTargetContext === 'new_loan') {
      setNewLoanForm(prev => ({ ...prev, profilePhoto: base64Photo || '' }));
      setShowToast(base64Photo ? "Photo attached to loan application" : "Photo removed");
      setTimeout(() => setShowToast(null), 3000);
      return;
    }

    const targetId = cameraTargetId || loggedInBorrowerId;
    if (!targetId && userRole === UserRole.LENDER) {
      setSettings(prev => {
        const next = { ...prev, lenderPhoto: base64Photo };
        saveSettingsToFirestore(next).catch(err => console.warn('Cloud save settings photo deferred:', err));
        return next;
      });
      setShowToast(base64Photo ? "Lender profile photo saved!" : "Lender profile photo removed.");
      setTimeout(() => setShowToast(null), 3000);
      return;
    }

    if (targetId) {
      setExtraProfiles(prev => {
        const exists = prev.some(p => p.idNumber === targetId);
        let updatedList: BorrowerProfile[];
        if (exists) {
          updatedList = prev.map(p => p.idNumber === targetId ? { ...p, profilePhoto: base64Photo } : p);
        } else {
          const b = borrowers.find(item => item.idNumber === targetId);
          updatedList = [...prev, {
            idNumber: targetId,
            name: b?.name || 'Borrower',
            phone: b?.phone || '',
            address: b?.address || '',
            email: b?.email || '',
            profilePhoto: base64Photo
          }];
        }
        const updatedProfile = updatedList.find(p => p.idNumber === targetId);
        if (updatedProfile) {
          saveBorrowerToFirestore(updatedProfile).catch(err => console.warn('Cloud save photo deferred:', err));
        }
        return updatedList;
      });

      setLoans(prev => {
        const updatedLoans = prev.map(l => {
          if (l.idNumber === targetId) {
            const upd = { ...l, profilePhoto: base64Photo };
            saveLoanToFirestore(upd).catch(err => console.warn('Cloud save loan photo deferred:', err));
            return upd;
          }
          return l;
        });
        return updatedLoans;
      });

      if (selectedLoan && selectedLoan.idNumber === targetId) {
        setSelectedLoan(prev => prev ? { ...prev, profilePhoto: base64Photo } : null);
      }

      setShowToast(base64Photo ? "Profile photo saved to vault!" : "Profile photo removed.");
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  const getCurrentPhotoForContext = (): string | undefined => {
    if (cameraTargetContext === 'registration') return regForm.profilePhoto || undefined;
    if (cameraTargetContext === 'new_loan') return newLoanForm.profilePhoto || undefined;
    if (cameraTargetContext === 'borrower') {
      return borrowers.find(b => b.idNumber === cameraTargetId)?.profilePhoto;
    }
    if (userRole === UserRole.BORROWER) {
      return currentBorrowerAccount?.profilePhoto;
    }
    return settings.lenderPhoto;
  };

  const getCurrentNameForContext = (): string => {
    if (cameraTargetContext === 'registration') return regForm.name || 'New Member';
    if (cameraTargetContext === 'new_loan') return newLoanForm.borrowerName || 'Applicant';
    if (cameraTargetContext === 'borrower') {
      return borrowers.find(b => b.idNumber === cameraTargetId)?.name || 'Borrower';
    }
    if (userRole === UserRole.BORROWER) {
      return currentBorrowerAccount?.name || 'Borrower';
    }
    return 'Lender';
  };

  const handleLenderAuth = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const isValid = verifyLenderPasskey(lenderPassInput, settings.adminVaultKey);
    if (isValid) {
      setIsLenderAuthenticated(true);
      persistLenderAuthentication();
      setUserRole(UserRole.LENDER);
      setLoggedInBorrowerId(null);
      setLenderPassInput('');
      setLenderAuthError(false);
      setShowToast("Admin Vault Unlocked — Welcome Ovayo Monti");
    } else {
      setLenderAuthError(true);
      setShowToast("Invalid master passcode. Please check and retry.");
    }
    setTimeout(() => {
      setShowToast(null);
      setLenderAuthError(false);
    }, 3000);
  };

  const handleToggleRole = () => {
    if (userRole === UserRole.LENDER) {
      // Revoke Admin mode securely
      clearLenderAuthentication();
      setIsLenderAuthenticated(false);
      setUserRole(UserRole.BORROWER);
      setShowToast("Exited Admin Mode");
    } else {
      if (loggedInBorrowerId) {
        // Log out borrower account
        clearBorrowerLogin();
        setLoggedInBorrowerId(null);
        setShowToast("Logged out of borrower account");
      } else {
        // Request lender admin access (requires passcode)
        setUserRole(UserRole.LENDER);
        setIsLenderAuthenticated(false);
      }
    }
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = loginId.trim().replace(/\D/g, '');
    const found = borrowers.find(b => b.idNumber === clean || b.idNumber === loginId.trim());
    if (found) { 
      setLoggedInBorrowerId(found.idNumber); 
      persistBorrowerLogin(found.idNumber);
      setUserRole(UserRole.BORROWER);
      setShowToast(`Wamkelekile, ${found.name}!`); 
    } else { 
      setShowToast("ID not found. Please register as a borrower."); 
    }
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newProfile: BorrowerProfile = { 
      idNumber: regForm.id.trim(), 
      name: regForm.name.trim(), 
      phone: regForm.phone.trim(), 
      address: regForm.address.trim(), 
      email: regForm.id.trim().substring(0, 5) + '@imali.co.za',
      profilePhoto: regForm.profilePhoto || undefined
    };
    setExtraProfiles(prev => [...prev.filter(p => p.idNumber !== newProfile.idNumber), newProfile]);
    setLoggedInBorrowerId(newProfile.idNumber);
    persistBorrowerLogin(newProfile.idNumber);
    setUserRole(UserRole.BORROWER);
    saveBorrowerToFirestore(newProfile).catch(err => console.warn('Cloud save deferred:', err));
    setShowToast("Registration successful! Synced to community cloud.");
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleCreateLoan = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newLoanForm.dueDate) {
      setShowToast("Please select a loan due date.");
      setTimeout(() => setShowToast(null), 3000);
      return;
    }

    const todayStart = new Date().setHours(0, 0, 0, 0);
    const dueTime = new Date(newLoanForm.dueDate).getTime();
    const maxAllowedTime = todayStart + 32 * 86400000;
    if (dueTime > maxAllowedTime) {
      setShowToast("Repayment period is strictly capped up to 1 month (maximum 31 days).");
      setTimeout(() => setShowToast(null), 3500);
      return;
    }

    const interest = Math.round(newLoanForm.amountLoaned * (DEFAULT_INTEREST_RATE / 100));
    const newLoan: Loan = {
      id: `T0${loans.length + 1}`,
      ...newLoanForm,
      profilePhoto: newLoanForm.profilePhoto || undefined,
      interestRate: DEFAULT_INTEREST_RATE,
      penaltyRate: DEFAULT_PENALTY_RATE,
      totalRepayment: newLoanForm.amountLoaned + interest,
      startDate: new Date().toISOString().split('T')[0],
      status: RepaymentStatus.PENDING,
      applicationStatus: ApplicationStatus.SUBMITTED,
      history: [{ date: new Date().toISOString().split('T')[0], action: 'Loan Application Submitted', amount: newLoanForm.amountLoaned }]
    };
    setLoans(prev => [newLoan, ...prev]);
    saveLoanToFirestore(newLoan).catch(err => console.warn('Cloud save loan deferred:', err));

    // Also ensure borrower profile exists in cloud
    const existingBorrower = borrowers.find(b => b.idNumber === newLoan.idNumber);
    if (!existingBorrower) {
      const bProfile: BorrowerProfile = {
        idNumber: newLoan.idNumber,
        name: newLoan.borrowerName,
        phone: newLoan.borrowerNumber,
        address: newLoan.physicalAddress,
        email: `${newLoan.idNumber.substring(0, 5)}@imali.co.za`,
        profilePhoto: newLoan.profilePhoto
      };
      saveBorrowerToFirestore(bProfile).catch(err => console.warn('Cloud save borrower deferred:', err));
    }

    setIsAddModalOpen(false);
    setShowToast("Loan account created and synced to cloud!");
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleUpdateAppStatus = (loanId: string, newStatus: ApplicationStatus) => {
    let approvedLoanTarget: Loan | null = null;
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        const updated = { 
          ...l, 
          applicationStatus: newStatus, 
          history: [...l.history, { date: new Date().toISOString().split('T')[0], action: `Application updated to ${newStatus}` }] 
        };
        if (newStatus === ApplicationStatus.APPROVED) {
          approvedLoanTarget = updated;
        }
        saveLoanToFirestore(updated).catch(err => console.warn('Cloud update status deferred:', err));
        return updated;
      }
      return l;
    }));

    // Automated WhatsApp Trigger when loan application is approved
    if (newStatus === ApplicationStatus.APPROVED && settings.whatsappAutomation !== false && settings.whatsappAutoApproval !== false) {
      const target = approvedLoanTarget || loans.find(l => l.id === loanId);
      if (target) {
        const approvedPayload: Loan = { ...target, applicationStatus: ApplicationStatus.APPROVED };
        dispatchAutomatedNotification(
          approvedPayload,
          'application_approved',
          'Application approved by lender',
          true
        ).then(notif => {
          if (notif) {
            setActiveWhatsAppNotification(notif);
            if (settings.whatsappAutoOpen) {
              window.open(notif.waUrl, '_blank', 'noopener,noreferrer');
            }
          }
        });
      }
    }

    setShowToast(`Status updated to ${newStatus}`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleMarkAsOverdue = (loanId: string) => {
    let overdueLoanTarget: Loan | null = null;
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        const updated: Loan = {
          ...l,
          status: RepaymentStatus.OVERDUE,
          history: [...l.history, { date: new Date().toISOString().split('T')[0], action: 'Marked as Overdue by lender' }]
        };
        overdueLoanTarget = updated;
        saveLoanToFirestore(updated).catch(err => console.warn('Cloud update overdue deferred:', err));
        return updated;
      }
      return l;
    }));

    // Automated WhatsApp Trigger when loan status changes to Overdue
    if (settings.whatsappAutomation !== false && settings.whatsappAutoOverdue !== false) {
      const target = overdueLoanTarget || loans.find(l => l.id === loanId);
      if (target) {
        const overduePayload: Loan = { ...target, status: RepaymentStatus.OVERDUE };
        dispatchAutomatedNotification(
          overduePayload,
          'overdue_reminder',
          'Loan status changed to Overdue',
          true
        ).then(notif => {
          if (notif) {
            setActiveWhatsAppNotification(notif);
            if (settings.whatsappAutoOpen) {
              window.open(notif.waUrl, '_blank', 'noopener,noreferrer');
            }
          }
        });
      }
    }

    setShowToast('Loan status changed to Overdue. Automated WhatsApp reminder triggered!');
    setTimeout(() => setShowToast(null), 3500);
  };

  const handleDeleteLoan = async (loanId: string) => {
    // 1. Immediately remove from local state
    setLoans(prev => prev.filter(l => l.id !== loanId));
    if (selectedLoan && selectedLoan.id === loanId) {
      setSelectedLoan(null);
    }
    setLoanToDelete(null);
    setLoanToEdit(null);

    // 2. Mark as permanently deleted and purge from all local storage keys
    markLoanAsDeleted(loanId);
    purgeLoanFromLocalStorage(loanId);

    // 3. Clear any pending WhatsApp notifications for this loan
    setWhatsAppNotifications(prev => prev.filter(n => n.loanId !== loanId));

    // 4. Delete from Firestore cloud
    try {
      await deleteLoanFromFirestore(loanId);
    } catch (err) {
      console.warn('Cloud delete loan deferred:', err);
    }
    setShowToast(`Loan record ${loanId} permanently deleted.`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleSaveEditedLoan = async (updatedLoan: Loan) => {
    setLoans(prev => prev.map(l => l.id === updatedLoan.id ? updatedLoan : l));
    if (selectedLoan && selectedLoan.id === updatedLoan.id) {
      setSelectedLoan(updatedLoan);
    }
    setLoanToEdit(null);
    try {
      await saveLoanToFirestore(updatedLoan);
    } catch (err) {
      console.warn('Cloud save loan deferred:', err);
    }
    setShowToast(`Loan ${updatedLoan.id} updated successfully!`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleDeleteBorrower = async (idNumber: string) => {
    // 1. Remove borrower and their loans from local state
    setExtraProfiles(prev => prev.filter(p => p.idNumber !== idNumber));
    const borrowerLoans = loans.filter(l => l.idNumber === idNumber);
    setLoans(prev => prev.filter(l => l.idNumber !== idNumber));
    setBorrowerToDelete(null);
    setSelectedBorrowerId(null);

    // 2. Mark borrower and their loans as deleted and purge
    markBorrowerAsDeleted(idNumber);
    purgeBorrowerFromLocalStorage(idNumber);

    borrowerLoans.forEach(l => {
      markLoanAsDeleted(l.id);
      purgeLoanFromLocalStorage(l.id);
      deleteLoanFromFirestore(l.id).catch(() => {});
    });

    try {
      await deleteBorrowerFromFirestore(idNumber);
    } catch (err) {
      console.warn('Cloud delete borrower deferred:', err);
    }
    setShowToast(`Borrower ${idNumber} and associated loans permanently removed.`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleSaveBorrowerProfile = async (updated: BorrowerProfile) => {
    setExtraProfiles(prev => {
      const exists = prev.some(p => p.idNumber === updated.idNumber);
      if (exists) {
        return prev.map(p => p.idNumber === updated.idNumber ? { ...p, ...updated } : p);
      }
      return [...prev, updated];
    });

    setLoans(prev => prev.map(l => {
      if (l.idNumber === updated.idNumber) {
        const loanUpdated = {
          ...l,
          borrowerName: updated.name || l.borrowerName,
          borrowerNumber: updated.phone || l.borrowerNumber,
          physicalAddress: updated.address || l.physicalAddress,
          profilePhoto: updated.profilePhoto !== undefined ? updated.profilePhoto : l.profilePhoto,
          employer: updated.employer || l.employer,
          employmentStatus: updated.employmentStatus || l.employmentStatus,
        };
        saveLoanToFirestore(loanUpdated).catch(err => console.warn('Cloud save loan sync deferred:', err));
        return loanUpdated;
      }
      return l;
    }));

    await saveBorrowerToFirestore(updated);
    setShowToast(`Profile for ${updated.name} updated and synced to cloud!`);
    setTimeout(() => setShowToast(null), 3000);
  };

  const handleIssueLoanForBorrower = (borrowerProfile: BorrowerProfile) => {
    setNewLoanForm({
      borrowerName: borrowerProfile.name,
      idNumber: borrowerProfile.idNumber,
      physicalAddress: borrowerProfile.address || '',
      borrowerNumber: borrowerProfile.phone || '',
      employer: borrowerProfile.employer || '',
      employmentStatus: borrowerProfile.employmentStatus || 'Full-time',
      amountLoaned: 1500,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payoutMethod: borrowerProfile.payoutMethod || PayoutMethod.MOBILE,
      profilePhoto: borrowerProfile.profilePhoto || ''
    });
    setSelectedBorrowerId(null);
    setIsAddModalOpen(true);
  };

  const handleMarkAsPaid = (loanId: string) => {
    setLoans(prev => prev.map(l => {
      if (l.id === loanId) {
        const pen = calculatePenaltyDetails(l).penalty;
        const updated: Loan = { 
          ...l, 
          status: RepaymentStatus.PAID, 
          history: [...l.history, { date: new Date().toISOString().split('T')[0], action: 'Full Repayment Received', amount: l.totalRepayment + pen }] 
        };
        saveLoanToFirestore(updated).catch(err => console.warn('Cloud record payment deferred:', err));
        return updated;
      }
      return l;
    }));
    setShowToast("Payment recorded and synced to cloud!");
    setTimeout(() => setShowToast(null), 3000);
  };

  const getWhatsAppLoanReminderUrl = (loan: Loan) => {
    const raw = loan.borrowerNumber ? loan.borrowerNumber.replace(/[^0-9]/g, '') : '';
    if (!raw) return null;
    const formattedPhone = raw.startsWith('0') ? '27' + raw.slice(1) : raw;
    const penalty = calculatePenaltyDetails(loan).penalty;
    const total = loan.totalRepayment + penalty;
    const msg = encodeURIComponent(
      `Molo ${loan.borrowerName}, this is a payment notification regarding your imali commitment (${loan.id}). Total amount due: R${total.toLocaleString()}${penalty > 0 ? ` (includes R${penalty} overdue penalty)` : ''} by ${loan.dueDate}. Siyabonga!`
    );
    return `https://wa.me/${formattedPhone}?text=${msg}`;
  };

  const filteredAndSortedLoans = useMemo(() => {
    let base = userRole === UserRole.BORROWER ? loans.filter(l => l.idNumber === loggedInBorrowerId) : loans;
    if (statusFilter !== 'all') {
      base = base.filter(l => l.status === statusFilter);
    }
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return [...base].sort((a, b) => new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime());
    }
    return base.filter(l => 
      (l.borrowerName || '').toLowerCase().includes(q) || 
      (l.id || '').toLowerCase().includes(q) ||
      (l.idNumber || '').toLowerCase().includes(q)
    ).sort((a, b) => new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime());
  }, [loans, searchTerm, statusFilter, userRole, loggedInBorrowerId]);

  const stats = useMemo(() => {
    const relevant = userRole === UserRole.LENDER ? loans : loans.filter(l => l.idNumber === loggedInBorrowerId);
    const totalLoaned = relevant.reduce((acc, l) => acc + l.amountLoaned, 0);
    const paidCount = relevant.filter(l => l.status === RepaymentStatus.PAID).length;
    const repaymentRate = relevant.length > 0 ? (paidCount / relevant.length) * 100 : 0;
    const overdueCount = relevant.filter(l => l.status === RepaymentStatus.OVERDUE).length;
    const score = userRole === UserRole.BORROWER ? (currentBorrowerAccount?.score || 600) : new Set(relevant.map(l => l.idNumber)).size;
    const totalProfit = relevant.reduce((acc, l) => acc + (l.totalRepayment - l.amountLoaned) + calculatePenaltyDetails(l).penalty, 0);
    return { totalLoaned, repaymentRate, overdueCount, score, totalProfit };
  }, [loans, userRole, loggedInBorrowerId, currentBorrowerAccount]);

  const chartData = useMemo(() => {
    const monthlyMap = new Map<string, number>();
    const relevant = userRole === UserRole.LENDER ? loans : loans.filter(l => l.idNumber === loggedInBorrowerId);
    relevant.forEach(loan => {
      const label = new Date(loan.startDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      monthlyMap.set(label, (monthlyMap.get(label) || 0) + loan.amountLoaned);
    });
    return Array.from(monthlyMap.entries()).map(([month, amount]) => ({ month, amount })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
  }, [loans, userRole, loggedInBorrowerId]);

  const StatusDot = ({ status, showLabel = false, hasPenalty = false }: { status: RepaymentStatus, showLabel?: boolean, hasPenalty?: boolean }) => {
    const colors = { 
      [RepaymentStatus.PAID]: 'bg-emerald-500', 
      [RepaymentStatus.OVERDUE]: 'bg-rose-500 animate-pulse', 
      [RepaymentStatus.PENDING]: 'bg-amber-500', 
      [RepaymentStatus.DEFAULTED]: 'bg-gray-400' 
    };
    const labels = {
      [RepaymentStatus.PAID]: 'Settled',
      [RepaymentStatus.OVERDUE]: 'Overdue',
      [RepaymentStatus.PENDING]: 'Active',
      [RepaymentStatus.DEFAULTED]: 'Defaulted'
    };
    return (
      <div className="flex items-center gap-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${colors[status]} ring-2 ring-white shadow-sm relative shrink-0`}>
          {hasPenalty && <div className="absolute -top-1 -right-1 w-2 h-2 bg-rose-600 rounded-full border border-white" />}
        </div>
        {showLabel && <span className="text-[10px] font-black uppercase tracking-wider text-gray-600">{labels[status] || status}</span>}
      </div>
    );
  };

  const SettingRow = ({ title, description, icon: Icon, active, onToggle }: any) => (
    <div className="flex items-center justify-between p-5 sm:p-6 bg-white rounded-2xl sm:rounded-[24px] border border-gray-100 shadow-sm hover:border-indigo-100 transition-all">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`p-2.5 sm:p-3 rounded-xl ${active ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-400'}`}><Icon size={20} /></div>
        <div>
          <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h4>
          <p className="text-[11px] text-gray-500 font-medium">{description}</p>
        </div>
      </div>
      <button onClick={onToggle} className={`w-12 h-6 rounded-full p-1 transition-all ${active ? 'bg-indigo-600' : 'bg-gray-200'}`}><div className={`w-4 h-4 rounded-full bg-white transition-all ${active ? 'translate-x-6' : 'translate-x-0'}`} /></button>
    </div>
  );

  const SummaryCard = ({ title, value, icon: Icon, colorClass, action, isUrgent, className = '' }: any) => {
    if (title === 'Trust Score' && typeof value === 'number') {
      return (
        <div className={`bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden h-full flex flex-col justify-between ${className}`}>
          <TrustScoreDisplay score={value} variant="card" showProgressBar={true} />
        </div>
      );
    }
    return (
      <div className={`bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden h-full flex flex-col justify-between ${className}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-1 truncate ${isUrgent ? 'text-rose-600' : 'text-gray-400'}`}>{title}</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight tabular-nums truncate font-heading">{value}</p>
          </div>
          <div className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${colorClass}`}><Icon size={18} /></div>
        </div>
        {action && (
          <button onClick={action} className="mt-3 w-full py-2 bg-gray-50 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-gray-100 border border-gray-100 flex items-center justify-center gap-1.5 active:scale-95 transition-all min-h-[36px]">
            {isSendingNotifications ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />} {t.sendNotifications}
          </button>
        )}
      </div>
    );
  };

  const ApplicationTracker = ({ currentStatus, isAdmin, loanId }: { currentStatus?: ApplicationStatus, isAdmin: boolean, loanId: string }) => {
    const statuses = [ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING, ApplicationStatus.APPROVED, ApplicationStatus.REJECTED];
    const config = (s?: ApplicationStatus) => {
      if (s === ApplicationStatus.SUBMITTED) return { color: 'bg-blue-100 text-blue-700', icon: ClipboardList };
      if (s === ApplicationStatus.REVIEWING) return { color: 'bg-amber-100 text-amber-700', icon: Search };
      if (s === ApplicationStatus.APPROVED) return { color: 'bg-emerald-100 text-emerald-700', icon: ShieldCheck };
      if (s === ApplicationStatus.REJECTED) return { color: 'bg-rose-100 text-rose-700', icon: X };
      return { color: 'bg-gray-100 text-gray-700', icon: Info };
    };
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2"><h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Application lifecycle</h5><div className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${config(currentStatus).color}`}>{currentStatus || 'Pending'}</div></div>
        {isAdmin ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {statuses.map(s => (
              <button key={s} onClick={() => handleUpdateAppStatus(loanId, s)} className={`p-2 rounded-xl border text-[9px] font-black uppercase transition-all ${currentStatus === s ? config(s).color + ' border-transparent' : 'bg-white border-gray-100 text-gray-400'}`}>{s}</button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2">
            {[ApplicationStatus.SUBMITTED, ApplicationStatus.REVIEWING, ApplicationStatus.APPROVED].map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex flex-col items-center gap-1 flex-1 ${currentStatus === ApplicationStatus.REJECTED ? 'opacity-30' : ''}`}><div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${currentStatus === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</div><span className="text-[8px] font-black uppercase text-gray-500">{s}</span></div>
                {i < 2 && <div className="h-0.5 bg-gray-100 flex-1 mb-3" />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {userRole === UserRole.LENDER && !isLenderAuthenticated ? (
        <div className="fixed inset-0 z-[300] bg-gray-950 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl max-w-md w-full text-center border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-900 rounded-3xl flex items-center justify-center text-white mx-auto mb-5 sm:mb-6 shadow-xl">
              <Shield size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase mb-1 font-heading">Admin Vault</h2>
            <p className="text-xs text-gray-500 font-medium mb-6">Enter master passkey to access lender administration.</p>
            
            {lenderAuthError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-bold flex items-center justify-center gap-1.5">
                <AlertCircle size={14} /> Incorrect passkey. Enter PIN (e.g. 1234) or vault key.
              </div>
            )}

            <form onSubmit={handleLenderAuth} className="space-y-4">
              <div>
                <input 
                  type="password" 
                  inputMode="numeric"
                  value={lenderPassInput} 
                  onChange={e => {
                    setLenderPassInput(e.target.value);
                    setLenderAuthError(false);
                  }} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-center font-black text-2xl tracking-[0.3em] focus:ring-2 focus:ring-gray-900 focus:bg-white transition-all font-mono" 
                  placeholder="••••" 
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-2.5">
                <button 
                  type="submit" 
                  className="w-full min-h-[48px] py-3.5 sm:py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2"
                >
                  <Key size={16} /> Unlock Vault
                </button>
              </div>
            </form>

            <button 
              onClick={() => {
                setUserRole(UserRole.BORROWER);
                setIsLenderAuthenticated(false);
                clearLenderAuthentication();
              }} 
              className="mt-6 text-[11px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-wider block mx-auto py-2 transition-colors"
            >
              Return to Borrower Portal
            </button>
          </div>
        </div>
      ) : userRole === UserRole.BORROWER && !loggedInBorrowerId ? (
        <DeviceOnboardingView
          deviceInfo={deviceSession}
          borrowers={borrowers}
          onLogin={(idNumber) => {
            setLoggedInBorrowerId(idNumber);
            persistBorrowerLogin(idNumber);
            setUserRole(UserRole.BORROWER);
            setShowToast("Signed in as borrower.");
            setTimeout(() => setShowToast(null), 3000);
          }}
          onRegister={(data) => {
            const newProfile: BorrowerProfile = { 
              idNumber: data.id.trim(), 
              name: data.name.trim(), 
              phone: data.phone.trim(), 
              address: data.address.trim(), 
              email: data.id.trim().substring(0, 5) + '@imali.co.za',
              profilePhoto: data.profilePhoto || undefined
            };
            setExtraProfiles(prev => [...prev.filter(p => p.idNumber !== newProfile.idNumber), newProfile]);
            setLoggedInBorrowerId(newProfile.idNumber);
            persistBorrowerLogin(newProfile.idNumber);
            setUserRole(UserRole.BORROWER);
            saveBorrowerToFirestore(newProfile).catch(err => console.warn('Cloud save deferred:', err));
            setShowToast("Registration successful! Welcome to imali.");
            setTimeout(() => setShowToast(null), 3000);
          }}
          onOpenCalculator={() => setIsEmiCalculatorModalOpen(true)}
          onOpenApply={() => {
            setNewLoanForm(prev => ({
              ...prev,
              amountLoaned: 1500,
              dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
            }));
            setIsAddModalOpen(true);
          }}
          onOpenLenderAuth={() => {
            setUserRole(UserRole.LENDER);
            setIsLenderAuthenticated(false);
          }}
          onCapturePhoto={() => openCameraCapture('registration')}
          capturedPhoto={regForm.profilePhoto}
        />
      ) : (
        <Layout 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          language={language} 
          setLanguage={setLanguage} 
          userRole={userRole} 
          toggleRole={handleToggleRole} 
          userName={currentBorrowerAccount?.name}
          profilePhoto={userRole === UserRole.BORROWER ? currentBorrowerAccount?.profilePhoto : settings.lenderPhoto}
          onOpenPhotoCapture={() => openCameraCapture('current_user')}
          onOpenDataRecovery={() => setIsDataRecoveryOpen(true)}
          onOpenWhatsAppHub={() => setIsWhatsAppHubOpen(true)}
          onOpenEmiCalculator={() => setIsEmiCalculatorModalOpen(true)}
          whatsAppNotificationsCount={whatsAppNotifications.length}
          isCloudConnected={isCloudConnected}
        >
          {showToast && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3"><CheckCircle2 size={18} className="text-emerald-400" /><span className="text-sm font-bold">{showToast}</span></div>}
          
          <div className="space-y-8 pb-32">
            {/* Historical Data Recovery & WhatsApp Automation Banners */}
            {userRole === UserRole.LENDER && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[2rem] p-4 sm:p-5 text-white shadow-lg border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                      <Database size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">Live Firestore Active</h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {borrowers.length} Borrowers • {loans.length} Loans
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 mt-0.5">
                        Deep-scan your browser storage, sync older records, or restore JSON/CSV backups.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setIsDataRecoveryOpen(true)}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                      <FolderSync size={15} /> Backup & Sync
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 rounded-[2rem] p-4 sm:p-5 text-white shadow-lg border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                      <Smartphone size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black uppercase tracking-wider text-white">WhatsApp Automation Service</h4>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Auto-Triggers On
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-300 mt-0.5">
                        Auto-reminders active for loans turning Overdue and newly Approved applications.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => setIsWhatsAppHubOpen(true)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Smartphone size={15} /> Service Console ({whatsAppNotifications.length})
                    </button>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'dashboard' && (
              <>
                {userRole === UserRole.BORROWER && currentBorrowerAccount && (
                  <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center gap-5 z-10 text-center sm:text-left">
                      <div className="relative group">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-white/20 bg-indigo-800 flex items-center justify-center shadow-2xl">
                          {currentBorrowerAccount.profilePhoto ? (
                            <img src={currentBorrowerAccount.profilePhoto} alt={currentBorrowerAccount.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl font-black">{currentBorrowerAccount.name[0]}</span>
                          )}
                        </div>
                        <button
                          onClick={() => openCameraCapture('current_user')}
                          className="absolute -bottom-1 -right-1 bg-indigo-500 hover:bg-indigo-400 text-white p-2.5 rounded-full shadow-lg transition-transform active:scale-90"
                          title="Take or update photo using camera"
                        >
                          <Camera size={16} />
                        </button>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                          <h2 className="text-2xl font-black uppercase tracking-tight">{currentBorrowerAccount.name}</h2>
                          {currentBorrowerAccount.profilePhoto ? (
                            <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 size={12} /> Photo Verified
                            </span>
                          ) : (
                            <span className="bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                              <AlertCircle size={12} /> Photo Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-indigo-200/80 font-bold mb-3">ID: {currentBorrowerAccount.idNumber} • {currentBorrowerAccount.phone || 'No phone recorded'}</p>
                        <button
                          onClick={() => openCameraCapture('current_user')}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all backdrop-blur-md"
                        >
                          <Camera size={14} />
                          {currentBorrowerAccount.profilePhoto ? 'Update Photo with Camera' : 'Capture Profile Photo (Camera)'}
                        </button>
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-6 z-10 w-full sm:w-auto">
                      <TrustScoreDisplay
                        score={currentBorrowerAccount.score}
                        variant="hero"
                        showProgressBar={true}
                        showMinMax={true}
                        className="w-full sm:w-64"
                      />
                      <div className="hidden sm:block h-16 w-px bg-white/10" />
                      <div className="text-center sm:text-left min-w-[70px]">
                        <p className="text-[10px] uppercase font-black tracking-widest text-indigo-300 mb-1">Total Loans</p>
                        <p className="text-2xl sm:text-3xl font-black text-white">{currentBorrowerAccount.loans.length}</p>
                        <p className="text-[9px] font-bold text-indigo-200/60 mt-0.5">Commitments</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-5">
                  <SummaryCard title="Total Loaned" value={`R ${stats.totalLoaned.toLocaleString()}`} icon={Wallet} colorClass="bg-indigo-50 text-indigo-600" />
                  <SummaryCard title="Repayment Rate" value={`${stats.repaymentRate.toFixed(1)}%`} icon={TrendingUp} colorClass="bg-emerald-50 text-emerald-600" />
                  <SummaryCard title="Overdue Loans" value={stats.overdueCount} icon={AlertCircle} colorClass="bg-rose-50 text-rose-600" isUrgent={stats.overdueCount > 0} action={userRole === UserRole.LENDER && stats.overdueCount > 0 ? handleSendNotifications : null} />
                  <SummaryCard title={userRole === UserRole.LENDER ? 'Network Size' : 'Trust Score'} value={stats.score} icon={userRole === UserRole.LENDER ? Users : Zap} colorClass="bg-indigo-50 text-indigo-600" />
                  {userRole === UserRole.LENDER && (
                    <SummaryCard 
                      className="col-span-2 lg:col-span-1" 
                      title="Projected Revenue" 
                      value={`R ${stats.totalProfit.toLocaleString()}`} 
                      icon={ArrowUpRight} 
                      colorClass="bg-emerald-50 text-emerald-600" 
                    />
                  )}
                </div>

                {/* Simplified Loan Simulation Tool for Borrowers */}
                {userRole === UserRole.BORROWER && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-3xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-500/25">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                          <Calculator size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-black uppercase text-white tracking-wide">
                              Loan EMI Calculator & Penalty Structure
                            </h4>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              5%/wk Cap
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 mt-0.5">
                            Adjust amount and repayment period to see weekly or monthly installments and late fee policies.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEmiCalculatorModalOpen(true)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 shrink-0"
                      >
                        <span>Open EMI Calculator</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>

                    <LoanSimulationTool
                    borrower={currentBorrowerAccount}
                    interestRate={DEFAULT_INTEREST_RATE}
                    onApply={(amount, termWeeks, dueDate) => {
                      if (currentBorrowerAccount) {
                        setNewLoanForm({
                          borrowerName: currentBorrowerAccount.name,
                          idNumber: currentBorrowerAccount.idNumber,
                          physicalAddress: currentBorrowerAccount.address || '',
                          borrowerNumber: currentBorrowerAccount.phone || '',
                          employer: currentBorrowerAccount.employer || '',
                          employmentStatus: currentBorrowerAccount.employmentStatus || 'Full-time',
                          amountLoaned: amount,
                          dueDate: dueDate,
                          payoutMethod: currentBorrowerAccount.payoutMethod || PayoutMethod.MOBILE,
                          profilePhoto: currentBorrowerAccount.profilePhoto || ''
                        });
                      } else {
                        setNewLoanForm(prev => ({
                          ...prev,
                          amountLoaned: amount,
                          dueDate: dueDate
                        }));
                      }
                      setIsAddModalOpen(true);
                    }}
                  />
                  </div>
                )}

                <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[40px] border border-gray-100 shadow-sm h-[280px] sm:h-[350px]">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight font-heading">Disbursement Activity</h3>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Monthly Trend</span>
                  </div>
                  <ResponsiveContainer width="100%" height="80%">
                    <BarChart data={chartData}>
                      <XAxis dataKey="month" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderRadius: '16px', 
                          border: 'none', 
                          color: '#fff',
                          fontWeight: 800,
                          fontSize: '12px'
                        }} 
                      />
                      <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            {activeTab === 'borrowers' && (
              userRole === UserRole.BORROWER ? (
                currentBorrowerAccount ? (
                  <BorrowerSelfProfileView
                    borrower={currentBorrowerAccount}
                    onSaveProfile={handleSaveBorrowerProfile}
                    onOpenPhotoCapture={() => openCameraCapture('current_user')}
                    onApplyForLoan={() => {
                      setNewLoanForm({
                        borrowerName: currentBorrowerAccount.name,
                        idNumber: currentBorrowerAccount.idNumber,
                        physicalAddress: currentBorrowerAccount.address || '',
                        borrowerNumber: currentBorrowerAccount.phone || '',
                        employer: currentBorrowerAccount.employer || '',
                        employmentStatus: currentBorrowerAccount.employmentStatus || 'Full-time',
                        amountLoaned: 1500,
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        payoutMethod: currentBorrowerAccount.payoutMethod || PayoutMethod.MOBILE,
                        profilePhoto: currentBorrowerAccount.profilePhoto || ''
                      });
                      setIsAddModalOpen(true);
                    }}
                  />
                ) : (
                  <div className="bg-white rounded-[32px] border border-gray-100 p-12 text-center max-w-lg mx-auto shadow-sm">
                    <UserCircle size={48} className="mx-auto text-gray-300 mb-3" />
                    <h3 className="text-lg font-black uppercase text-gray-800">Borrower Account Not Found</h3>
                    <p className="text-xs text-gray-400 mt-1">Please sign out and log in with your valid South African ID number.</p>
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {/* Top Header Card */}
                  <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-6 sm:p-8 flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={20} className="text-indigo-600" />
                        <h3 className="text-xl sm:text-2xl font-black uppercase text-gray-900 tracking-tight">Verified Borrower Network</h3>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">Manage member records, review credit health scores, audit KYC, and issue microloans.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                      {/* Search */}
                      <div className="relative flex-1 sm:w-72">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="w-full pl-11 pr-8 py-3 bg-gray-50 border border-transparent focus:border-indigo-200 focus:bg-white rounded-2xl font-medium text-xs transition-all"
                          placeholder="Search name, ID, phone..."
                        />
                        {searchTerm && (
                          <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Sort Dropdown */}
                      <div className="relative flex items-center gap-1.5 bg-gray-50 border border-gray-100 px-3 py-2.5 rounded-2xl text-xs font-bold text-gray-700">
                        <ArrowUpDown size={14} className="text-gray-400" />
                        <select
                          value={borrowerSort}
                          onChange={e => setBorrowerSort(e.target.value as any)}
                          className="bg-transparent border-none text-xs font-black uppercase focus:ring-0 cursor-pointer pr-2"
                        >
                          <option value="score_desc">Highest Trust</option>
                          <option value="score_asc">Lowest Trust</option>
                          <option value="borrowed_desc">Most Borrowed</option>
                          <option value="name_asc">Name (A-Z)</option>
                        </select>
                      </div>

                      {/* Add Member Button */}
                      <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-5 py-3 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-md transition-all active:scale-95"
                      >
                        <Plus size={16} /> New Member
                      </button>
                    </div>
                  </div>

                  {/* Network Statistics Ribbon */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Borrowers</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{borrowerNetworkStats.total}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                        <Users size={20} />
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Active Borrowers</p>
                        <p className="text-2xl font-black text-indigo-600 mt-0.5">{borrowerNetworkStats.withActiveDebt}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                        <Wallet size={20} />
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Clean Standing Rate</p>
                        <p className="text-2xl font-black text-emerald-600 mt-0.5">{borrowerNetworkStats.cleanRate.toFixed(0)}%</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                        <ShieldCheck size={20} />
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Avg Community Score</p>
                        <p className="text-2xl font-black text-purple-600 mt-0.5">{borrowerNetworkStats.avgScore}</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
                        <Star size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    <span className="text-xs font-black uppercase text-gray-400 flex items-center gap-1.5 mr-1 shrink-0">
                      <Filter size={13} /> Filter:
                    </span>
                    {[
                      { id: 'all', label: 'All Borrowers', count: borrowers.length },
                      { id: 'active', label: 'Active Loans', count: borrowers.filter(b => b.loans.some((l: Loan) => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE)).length },
                      { id: 'debt_free', label: 'Debt-Free', count: borrowers.filter(b => !b.loans.some((l: Loan) => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE)).length },
                      { id: 'overdue', label: 'Overdue Risk', count: borrowers.filter(b => b.loans.some((l: Loan) => l.status === RepaymentStatus.OVERDUE)).length },
                      { id: 'high_trust', label: 'Top Tier (700+)', count: borrowers.filter(b => b.score >= 700).length },
                      { id: 'kyc_pending', label: 'KYC Pending', count: borrowers.filter(b => !b.kycVerified).length },
                    ].map(pill => (
                      <button
                        key={pill.id}
                        onClick={() => setBorrowerFilter(pill.id as any)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${
                          borrowerFilter === pill.id
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                        }`}
                      >
                        <span>{pill.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${borrowerFilter === pill.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {pill.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Borrowers Grid */}
                  {filteredAndSortedBorrowers.length === 0 ? (
                    <div className="bg-white rounded-[32px] border border-gray-100 p-12 text-center shadow-sm">
                      <Users size={48} className="mx-auto text-gray-300 mb-3" />
                      <h4 className="text-base font-black uppercase text-gray-800">No Borrowers Found</h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                        {searchTerm ? `No community members matching "${searchTerm}". Try a different name or ID.` : 'No borrowers in this category filter.'}
                      </p>
                      <button
                        onClick={() => { setSearchTerm(''); setBorrowerFilter('all'); }}
                        className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black uppercase hover:bg-indigo-100 transition-colors"
                      >
                        Reset Search & Filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredAndSortedBorrowers.map(borrower => {
                        const scoreInfo = getScoreRating(borrower.score);
                        const activeLoans = borrower.loans.filter((l: Loan) => l.status === RepaymentStatus.PENDING || l.status === RepaymentStatus.OVERDUE);
                        const hasOverdue = borrower.loans.some((l: Loan) => l.status === RepaymentStatus.OVERDUE);
                        const totalBorrowed = borrower.loans.reduce((sum: number, l: Loan) => sum + l.amountLoaned, 0);
                        const activeDebt = activeLoans.reduce((sum: number, l: Loan) => sum + l.totalRepayment, 0);

                        return (
                          <div
                            key={borrower.idNumber}
                            className="bg-white rounded-[32px] border border-gray-100 shadow-sm p-6 flex flex-col justify-between space-y-5 hover:shadow-lg transition-all relative overflow-hidden group"
                          >
                            {/* Card Header with Avatar & KYC */}
                            <div className="flex items-start gap-3.5">
                              <div className="relative group shrink-0">
                                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600 text-xl shadow-inner">
                                  {borrower.profilePhoto ? (
                                    <img src={borrower.profilePhoto} alt={borrower.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{borrower.name[0]}</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => openCameraCapture('borrower', borrower.idNumber)}
                                  className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-full shadow-md transition-transform active:scale-90"
                                  title="Capture/update photo with camera"
                                >
                                  <Camera size={12} />
                                </button>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <h4 className="font-black text-base uppercase text-gray-900 truncate">{borrower.name}</h4>
                                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${scoreInfo.bg} ${scoreInfo.color} border ${scoreInfo.border} shrink-0`}>
                                    {scoreInfo.rating}
                                  </span>
                                </div>

                                <p className="text-[11px] text-gray-400 font-mono font-medium truncate">ID: {borrower.idNumber}</p>
                                <p className="text-[11px] text-gray-600 font-medium truncate mt-0.5">📞 {borrower.phone || 'No phone'}</p>

                                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                  {borrower.kycVerified ? (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                      <CheckCircle2 size={10} /> KYC Verified
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                      <Clock size={10} /> KYC Pending
                                    </span>
                                  )}
                                  {borrower.employmentStatus && (
                                    <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[120px]">
                                      {borrower.employmentStatus}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Trust Score & Progress */}
                            <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 space-y-2">
                              <TrustScoreDisplay score={borrower.score} variant="compact" showProgressBar={true} />
                              
                              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 text-xs">
                                <div>
                                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Active Debt</p>
                                  <p className={`font-black text-xs ${hasOverdue ? 'text-rose-600' : activeDebt > 0 ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                    {activeDebt > 0 ? `R ${activeDebt.toLocaleString()}` : 'Debt-Free'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Lifetime Volume</p>
                                  <p className="font-black text-xs text-gray-800">
                                    R {totalBorrowed.toLocaleString()} ({borrower.loans.length})
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedBorrowerId(borrower.idNumber)}
                                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                                >
                                  <FileText size={14} /> View Dossier
                                </button>
                                <button
                                  onClick={() => handleIssueLoanForBorrower(borrower)}
                                  className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 transition-colors"
                                  title="Create a new loan for this borrower"
                                >
                                  <Plus size={14} /> Issue Loan
                                </button>
                              </div>

                              <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                                <button
                                  onClick={() => openCameraCapture('borrower', borrower.idNumber)}
                                  className="py-1.5 px-2 text-gray-500 hover:text-indigo-600 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-gray-50 transition-colors"
                                >
                                  <Camera size={12} /> Update Photo
                                </button>
                                <button
                                  onClick={() => setBorrowerToDelete({ idNumber: borrower.idNumber, name: borrower.name })}
                                  className="py-1.5 px-2 text-rose-500 hover:text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            )}
            {activeTab === 'loans' && (
              <div className="bg-white rounded-[2rem] sm:rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-8 border-b space-y-4">
                  {/* Top controls: Search & Action */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200/80 rounded-2xl font-medium text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all" 
                        placeholder="Search by name, ID or Txn..." 
                      />
                      {searchTerm && (
                        <button 
                          onClick={() => setSearchTerm('')} 
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {userRole === UserRole.LENDER && (
                      <button 
                        onClick={() => setIsAddModalOpen(true)} 
                        className="bg-gray-900 hover:bg-indigo-600 text-white px-5 sm:px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all min-h-[44px]"
                      >
                        <Plus size={18} /> Issue Commitment
                      </button>
                    )}
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar momentum-scroll pt-1">
                    {[
                      { 
                        id: 'all', 
                        label: 'All Loans', 
                        count: (userRole === UserRole.BORROWER ? loans.filter(l => l.idNumber === loggedInBorrowerId) : loans).length 
                      },
                      { 
                        id: RepaymentStatus.PENDING, 
                        label: 'Active', 
                        count: (userRole === UserRole.BORROWER ? loans.filter(l => l.idNumber === loggedInBorrowerId) : loans).filter(l => l.status === RepaymentStatus.PENDING).length 
                      },
                      { 
                        id: RepaymentStatus.OVERDUE, 
                        label: 'Overdue', 
                        count: (userRole === UserRole.BORROWER ? loans.filter(l => l.idNumber === loggedInBorrowerId) : loans).filter(l => l.status === RepaymentStatus.OVERDUE).length 
                      },
                      { 
                        id: RepaymentStatus.PAID, 
                        label: 'Settled', 
                        count: (userRole === UserRole.BORROWER ? loans.filter(l => l.idNumber === loggedInBorrowerId) : loans).filter(l => l.status === RepaymentStatus.PAID).length 
                      },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusFilter(tab.id as RepaymentStatus | 'all')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 min-h-[38px] active:scale-95 ${
                          statusFilter === tab.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700 font-mono'}`}>
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Card Stack View (< md) */}
                <div className="block md:hidden divide-y divide-gray-100">
                  {filteredAndSortedLoans.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 font-medium text-sm">
                      No commitments matching your search criteria.
                    </div>
                  ) : (
                    filteredAndSortedLoans.map(loan => {
                      const penaltyInfo = calculatePenaltyDetails(loan);
                      const totalDue = loan.totalRepayment + penaltyInfo.penalty;
                      const isOverdue = loan.status === RepaymentStatus.OVERDUE;
                      const isPaid = loan.status === RepaymentStatus.PAID;
                      const waUrl = getWhatsAppLoanReminderUrl(loan);

                      return (
                        <div key={loan.id} className="p-4 space-y-3 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0 overflow-hidden">
                                {loan.profilePhoto ? (
                                  <img src={loan.profilePhoto} alt={loan.borrowerName} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{loan.borrowerName ? loan.borrowerName[0] : 'B'}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-black text-gray-900 text-sm uppercase tracking-tight truncate font-heading">{loan.borrowerName}</h4>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
                                  <span className="bg-indigo-600 text-white font-mono px-1.5 py-0.2 rounded text-[9px] font-black">{loan.id}</span>
                                  <span>•</span>
                                  <span className="truncate font-mono">{loan.idNumber}</span>
                                </div>
                              </div>
                            </div>
                            <div className="shrink-0">
                              <StatusDot status={loan.status} showLabel hasPenalty={penaltyInfo.penalty > 0} />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 bg-gray-50/80 p-3 rounded-2xl text-center">
                            <div>
                              <p className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Principal</p>
                              <p className="text-xs font-black text-gray-900 mt-0.5 tabular-nums">R {loan.amountLoaned.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Total Due</p>
                              <p className={`text-xs font-black mt-0.5 tabular-nums ${isOverdue ? 'text-rose-600' : 'text-indigo-600'}`}>
                                R {totalDue.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase font-black text-gray-400 tracking-wider">Due Date</p>
                              <p className="text-xs font-bold text-gray-700 mt-0.5 truncate">{loan.dueDate}</p>
                            </div>
                          </div>

                          {penaltyInfo.penalty > 0 && (
                            <div className="bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1.5 rounded-xl flex items-center justify-between text-xs font-bold">
                              <span className="flex items-center gap-1"><AlertTriangle size={13} /> {penaltyInfo.weeks} wk(s) overdue</span>
                              <span className="font-black">+R {penaltyInfo.penalty} penalty</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            <button
                              onClick={() => setSelectedLoan(loan)}
                              className="flex-1 min-h-[38px] py-2 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all"
                            >
                              <Eye size={13} /> Details
                            </button>
                            {(userRole === UserRole.LENDER || (userRole === UserRole.BORROWER && (loan.applicationStatus === ApplicationStatus.SUBMITTED || loan.applicationStatus === ApplicationStatus.REVIEWING))) && (
                              <button
                                onClick={() => setLoanToEdit(loan)}
                                className="min-h-[38px] py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all"
                                title="Edit Loan Record"
                              >
                                <Edit3 size={13} /> Edit
                              </button>
                            )}
                            {userRole === UserRole.LENDER && !isPaid && (
                              <button
                                onClick={() => handleMarkAsPaid(loan.id)}
                                className="flex-1 min-h-[38px] py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"
                              >
                                <Check size={13} /> Paid
                              </button>
                            )}
                            {(userRole === UserRole.LENDER || (userRole === UserRole.BORROWER && (loan.applicationStatus === ApplicationStatus.SUBMITTED || loan.applicationStatus === ApplicationStatus.REVIEWING))) && (
                              <button
                                onClick={() => setLoanToDelete(loan)}
                                className="min-h-[38px] p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center active:scale-95 transition-all"
                                title="Delete Loan Record"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                            {userRole === UserRole.LENDER && waUrl && (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-h-[38px] w-9 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 active:scale-95 transition-all shrink-0"
                                title="Send WhatsApp Reminder"
                              >
                                <Smartphone size={14} />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop High-Density Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/60 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b">
                      <tr>
                        <th className="px-8 py-5">TXN ID</th>
                        <th className="px-8 py-5">Borrower</th>
                        <th className="px-8 py-5">Principal</th>
                        <th className="px-8 py-5">Total Due</th>
                        <th className="px-8 py-5">Due Date</th>
                        <th className="px-8 py-5">Status</th>
                        <th className="px-8 py-5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAndSortedLoans.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-8 py-16 text-center text-gray-400 font-medium text-sm">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <ReceiptText size={40} className="text-gray-300" />
                              <p className="font-black text-gray-700 uppercase text-xs tracking-wider">No Commitments Found</p>
                              <p className="text-xs text-gray-400">
                                {searchTerm ? `No loans matching "${searchTerm}".` : 'No commitments found matching your filter.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedLoans.map(loan => {
                          const penalty = calculatePenaltyDetails(loan).penalty;
                          const totalDue = loan.totalRepayment + penalty;
                          const waUrl = getWhatsAppLoanReminderUrl(loan);
                          return (
                            <tr key={loan.id} className="hover:bg-gray-50/50 transition-all">
                              <td className="px-8 py-6">
                                <div className="bg-indigo-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md inline-block font-mono">
                                  {loan.id}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center font-black text-xs text-indigo-700 overflow-hidden">
                                    {loan.profilePhoto ? (
                                      <img src={loan.profilePhoto} alt={loan.borrowerName} className="w-full h-full object-cover" />
                                    ) : (
                                      loan.borrowerName ? loan.borrowerName[0] : 'B'
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-black text-gray-900 text-sm">{loan.borrowerName}</p>
                                    <p className="text-xs text-gray-400 font-mono">ID: {loan.idNumber}</p>
                                  </div>
                                </div>
                              </td>
                            <td className="px-8 py-6 text-sm font-black tabular-nums">R {loan.amountLoaned.toLocaleString()}</td>
                            <td className="px-8 py-6 text-sm font-black tabular-nums text-indigo-600">
                              R {totalDue.toLocaleString()}
                              {penalty > 0 && <span className="text-[10px] text-rose-600 block font-bold">+R {penalty} penalty</span>}
                            </td>
                            <td className="px-8 py-6 text-xs text-gray-500 font-bold">{loan.dueDate}</td>
                            <td className="px-8 py-6">
                              <StatusDot status={loan.status} showLabel hasPenalty={penalty > 0} />
                            </td>
                            <td className="px-8 py-6 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button 
                                  onClick={() => setSelectedLoan(loan)} 
                                  className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-all"
                                  title="View Details"
                                >
                                  <Eye size={17} />
                                </button>
                                {(userRole === UserRole.LENDER || (userRole === UserRole.BORROWER && (loan.applicationStatus === ApplicationStatus.SUBMITTED || loan.applicationStatus === ApplicationStatus.REVIEWING))) && (
                                  <button 
                                    onClick={() => setLoanToEdit(loan)} 
                                    className="p-2 hover:bg-indigo-50 text-indigo-700 rounded-xl transition-all"
                                    title="Edit Loan Record"
                                  >
                                    <Edit3 size={17} />
                                  </button>
                                )}
                                {userRole === UserRole.LENDER && loan.status !== RepaymentStatus.PAID && (
                                  <button
                                    onClick={() => handleMarkAsPaid(loan.id)}
                                    className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                                    title="Record Payment"
                                  >
                                    <Check size={17} />
                                  </button>
                                )}
                                {(userRole === UserRole.LENDER || (userRole === UserRole.BORROWER && (loan.applicationStatus === ApplicationStatus.SUBMITTED || loan.applicationStatus === ApplicationStatus.REVIEWING))) && (
                                  <button
                                    onClick={() => setLoanToDelete(loan)}
                                    className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-all"
                                    title={userRole === UserRole.LENDER ? "Delete Loan Record" : "Withdraw Application"}
                                  >
                                    <Trash2 size={17} />
                                  </button>
                                )}
                                {userRole === UserRole.LENDER && waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                                    title="WhatsApp Reminder"
                                  >
                                    <Smartphone size={17} />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeTab === 'calculator' && (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Banner to launch dedicated Loan EMI & Penalty Calculator Modal */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-indigo-500/20">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                      <Calculator size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black uppercase tracking-wider text-white">Prospective Loan EMI Calculator</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Includes Penalty Rules (5%/wk)
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 mt-0.5">
                        Interactive modal with weekly/monthly EMI breakdown, NCR in duplum cap, and late fee simulator.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEmiCalculatorModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all shrink-0"
                  >
                    <span>Launch EMI Modal</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <LoanSimulationTool
                  borrower={currentBorrowerAccount}
                  interestRate={DEFAULT_INTEREST_RATE}
                  onApply={(amount, termWeeks, dueDate) => {
                    if (currentBorrowerAccount) {
                      setNewLoanForm({
                        borrowerName: currentBorrowerAccount.name,
                        idNumber: currentBorrowerAccount.idNumber,
                        physicalAddress: currentBorrowerAccount.address || '',
                        borrowerNumber: currentBorrowerAccount.phone || '',
                        employer: currentBorrowerAccount.employer || '',
                        employmentStatus: currentBorrowerAccount.employmentStatus || 'Full-time',
                        amountLoaned: amount,
                        dueDate: dueDate,
                        payoutMethod: currentBorrowerAccount.payoutMethod || PayoutMethod.MOBILE,
                        profilePhoto: currentBorrowerAccount.profilePhoto || ''
                      });
                    } else {
                      setNewLoanForm(prev => ({
                        ...prev,
                        amountLoaned: amount,
                        dueDate: dueDate
                      }));
                    }
                    setIsAddModalOpen(true);
                  }}
                />
              </div>
            )}
            {activeTab === 'settings' && (
               <div className="max-w-3xl mx-auto space-y-8">
                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Database size={14} /> Cloud Database & Data Recovery</h3>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black text-gray-900 uppercase">Firestore Cloud Database</h4>
                          <p className="text-xs text-gray-500">Live multi-device database for loans and borrower dossiers.</p>
                        </div>
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${isCloudConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {isCloudConnected ? 'Live Cloud Connected' : 'Reconnecting'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                          <span className="text-[10px] font-black uppercase text-gray-400">Total Borrowers</span>
                          <p className="text-xl font-black text-gray-900">{borrowers.length}</p>
                        </div>
                        <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                          <span className="text-[10px] font-black uppercase text-gray-400">Total Loans</span>
                          <p className="text-xl font-black text-gray-900">{loans.length}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <button 
                          onClick={() => setIsDataRecoveryOpen(true)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
                        >
                          <FolderSync size={16} /> Open Data Recovery & Backup Hub
                        </button>
                        <button 
                          onClick={() => downloadJSONBackup(loans, borrowers, settings)}
                          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                          title="Download complete JSON database backup"
                        >
                          <FileText size={15} /> Export JSON
                        </button>
                        <button 
                          onClick={() => downloadLoansCSV(loans)}
                          className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                          title="Download CSV spreadsheet of loans"
                        >
                          <FileText size={15} /> Export CSV
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Key size={14} /> Security Vault</h3>
                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                      <p className="text-xs font-medium text-gray-500">Share this magic link with trusted admins to bypass the vault key screen.</p>
                      <div className="bg-gray-50 p-4 rounded-xl font-mono text-[10px] text-gray-400 border truncate">{window.location.origin}{window.location.pathname}?vault_key={settings.adminVaultKey}</div>
                      <div className="flex gap-3"><button onClick={handleCopyMagicLink} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2"><Copy size={14} /> Copy Link</button><button onClick={handleRegenerateKey} className="p-3 bg-gray-50 text-gray-400 hover:text-rose-600 rounded-xl transition-all"><RefreshCw size={18} /></button></div>
                    </div>
                  </section>
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <Bell size={14} /> WhatsApp Automation & Notifications
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsWhatsAppHubOpen(true)}
                        className="text-xs font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 uppercase tracking-wider transition-colors"
                      >
                        <Smartphone size={13} /> Open Console
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                      <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Smartphone size={18} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-emerald-950 uppercase">Automated WhatsApp Reminder Service</p>
                            <p className="text-[11px] text-emerald-800 font-medium">Triggers reminders on Overdue status & application approvals.</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsWhatsAppHubOpen(true)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
                        >
                          Service Console ({whatsAppNotifications.length})
                        </button>
                      </div>

                      <div className="space-y-3 pt-1">
                        <SettingRow 
                          title="WhatsApp Automation Master" 
                          description="Enable all automated WhatsApp background triggers" 
                          icon={Smartphone} 
                          active={settings.whatsappAutomation !== false} 
                          onToggle={() => toggleSetting('whatsappAutomation')} 
                        />
                        <SettingRow 
                          title="Auto-Reminders on Overdue" 
                          description="Trigger automated WhatsApp reminder when loan status changes to Overdue" 
                          icon={AlertCircle} 
                          active={settings.whatsappAutoOverdue !== false} 
                          onToggle={() => toggleSetting('whatsappAutoOverdue')} 
                        />
                        <SettingRow 
                          title="Auto-Notice on Application Approval" 
                          description="Trigger automated WhatsApp message with loan details upon approval" 
                          icon={CheckCircle2} 
                          active={settings.whatsappAutoApproval !== false} 
                          onToggle={() => toggleSetting('whatsappAutoApproval')} 
                        />
                        <SettingRow 
                          title="Auto-Launch WhatsApp Tab" 
                          description="Automatically open WhatsApp Web / App upon trigger" 
                          icon={ArrowUpRight} 
                          active={!!settings.whatsappAutoOpen} 
                          onToggle={() => toggleSetting('whatsappAutoOpen')} 
                        />
                      </div>
                    </div>
                  </section>
               </div>
            )}
          </div>
        </Layout>
      )}

      <AnimatePresence>
        {selectedLoan && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div 
              key="loan-detail-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.24, ease: 'easeOut' }} 
              className="fixed inset-0 bg-gray-950/60 backdrop-blur-md" 
              onClick={() => setSelectedLoan(null)} 
            />
            <motion.div 
              key="loan-detail-content"
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 30 }}
              transition={{ 
                type: 'spring', 
                damping: 28, 
                stiffness: 340, 
                mass: 0.85 
              }}
              className="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] mt-auto sm:my-auto"
            >
              {/* Mobile bottom-sheet drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </div>

              <div className="p-5 sm:p-8 border-b flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-indigo-600 text-white px-2.5 py-1 rounded-md text-[10px] font-black font-mono tracking-wider">
                    {selectedLoan.id}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight font-heading">Loan Context</h3>
                </div>
                <button 
                  onClick={() => setSelectedLoan(null)} 
                  className="p-2.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-6">
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-gray-100 overflow-hidden">
                      {selectedLoan.profilePhoto ? (
                        <img src={selectedLoan.profilePhoto} alt={selectedLoan.borrowerName} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle size={40} />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => openCameraCapture('borrower', selectedLoan.idNumber)}
                      className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 text-white p-1.5 rounded-full shadow-md transition-transform active:scale-90"
                      title="Capture or update photo for this borrower"
                    >
                      <Camera size={12} />
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-black uppercase truncate font-heading">{selectedLoan.borrowerName}</p>
                    <p className="text-xs font-bold text-gray-400 truncate">ID: {selectedLoan.idNumber} • {selectedLoan.borrowerNumber}</p>
                  </div>
                </div>

                <ApplicationTracker currentStatus={selectedLoan.applicationStatus} isAdmin={userRole === UserRole.LENDER} loanId={selectedLoan.id} />

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Principal</p>
                    <p className="text-xl font-black mt-1 font-mono">R {selectedLoan.amountLoaned.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Total Due</p>
                    <p className="text-xl font-black mt-1 font-mono">R {(selectedLoan.totalRepayment + calculatePenaltyDetails(selectedLoan).penalty).toLocaleString()}</p>
                  </div>
                </div>

                {(() => {
                  const b = borrowers.find(item => item.idNumber === selectedLoan.idNumber);
                  const bScore = b ? b.score : calculateCreditScore(loans.filter(l => l.idNumber === selectedLoan.idNumber));
                  return (
                    <div className="p-4 sm:p-5 bg-gray-50/80 rounded-2xl border border-gray-100">
                      <TrustScoreDisplay score={bScore} variant="card" showProgressBar={true} />
                    </div>
                  );
                })()}

                {calculatePenaltyDetails(selectedLoan).penalty > 0 && (
                  <div className="p-4 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-center gap-3">
                    <AlertTriangle size={20} className="shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider">Active Penalty Applied</p>
                      <p className="text-xs sm:text-sm font-bold mt-0.5">R {calculatePenaltyDetails(selectedLoan).penalty} for being {calculatePenaltyDetails(selectedLoan).weeks} week(s) late.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 bg-gray-50/70 border-t flex flex-col-reverse sm:flex-row gap-2.5 justify-end flex-wrap">
                <button 
                  onClick={() => setSelectedLoan(null)} 
                  className="w-full sm:w-auto px-5 py-3.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-black text-xs uppercase tracking-wider transition-colors min-h-[44px]"
                >
                  Close
                </button>

                {(userRole === UserRole.LENDER || (userRole === UserRole.BORROWER && (selectedLoan.applicationStatus === ApplicationStatus.SUBMITTED || selectedLoan.applicationStatus === ApplicationStatus.REVIEWING))) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setLoanToEdit(selectedLoan)}
                      className="w-full sm:w-auto px-4 py-3.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Edit3 size={15} /> Edit Record
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanToDelete(selectedLoan)}
                      className="w-full sm:w-auto px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Trash2 size={15} /> Delete Record
                    </button>
                  </>
                )}

                {userRole === UserRole.LENDER && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const isOverdue = selectedLoan.status === RepaymentStatus.OVERDUE || new Date(selectedLoan.dueDate) < new Date();
                        const type = isOverdue ? 'overdue_reminder' : 'application_approved';
                        dispatchAutomatedNotification(selectedLoan, type, `Dispatched from commitment details (${selectedLoan.id})`, true)
                          .then(notif => {
                            if (notif) setActiveWhatsAppNotification(notif);
                          });
                      }}
                      className="w-full sm:w-auto px-4 py-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Smartphone size={15} /> WhatsApp Notice
                    </button>

                    {selectedLoan.status !== RepaymentStatus.OVERDUE && selectedLoan.status !== RepaymentStatus.PAID && (
                      <button
                        type="button"
                        onClick={() => {
                          handleMarkAsOverdue(selectedLoan.id);
                          setSelectedLoan(prev => prev ? { ...prev, status: RepaymentStatus.OVERDUE } : null);
                        }}
                        className="w-full sm:w-auto px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-black text-xs uppercase tracking-wider transition-all min-h-[44px] flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <AlertTriangle size={15} /> Mark Overdue
                      </button>
                    )}
                  </>
                )}

                {userRole === UserRole.LENDER && selectedLoan.status !== RepaymentStatus.PAID && (
                  <button 
                    onClick={() => handleMarkAsPaid(selectedLoan.id)} 
                    className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all min-h-[44px] flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Record Payment
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-0 sm:p-6 overflow-y-auto">
            <motion.div 
              key="add-modal-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.24, ease: 'easeOut' }} 
              className="fixed inset-0 bg-gray-950/60 backdrop-blur-md" 
              onClick={() => setIsAddModalOpen(false)} 
            />
            <motion.form 
              key="add-modal-form"
              initial={{ opacity: 0, scale: 0.94, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 30 }}
              transition={{ 
                type: 'spring', 
                damping: 28, 
                stiffness: 340, 
                mass: 0.85 
              }}
              onSubmit={handleCreateLoan} 
              className="bg-white w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] mt-auto sm:my-auto"
            >
              {/* Mobile bottom-sheet drag handle */}
              <div className="sm:hidden flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </div>

              <div className="p-5 sm:p-8 border-b flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight font-heading">Register Commitment</h3>
                  <p className="text-xs text-gray-500 font-medium">Issue a new microloan or create a borrower profile.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="p-2.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 sm:p-8 overflow-y-auto custom-scrollbar space-y-5">
                {/* Photo Capture Preview */}
                <div className="flex items-center justify-between p-3.5 sm:p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 overflow-hidden flex items-center justify-center text-indigo-600 border shrink-0">
                      {newLoanForm.profilePhoto ? (
                        <img src={newLoanForm.profilePhoto} alt="New borrower photo" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase text-gray-700 font-heading">Borrower Identity Photo</p>
                      <p className="text-[10px] text-gray-400 font-medium">Optional: Capture live verification photo</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCameraCapture('new_loan')}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition-all min-h-[40px]"
                  >
                    <Camera size={14} />
                    {newLoanForm.profilePhoto ? 'Retake' : 'Snap Photo'}
                  </button>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Borrower Full Name *</label>
                      <input 
                        required 
                        placeholder="e.g. Sipho Ndlovu" 
                        className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all min-h-[46px]" 
                        value={newLoanForm.borrowerName} 
                        onChange={e => setNewLoanForm({...newLoanForm, borrowerName: e.target.value})} 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">SA ID Number *</label>
                      <input 
                        required 
                        maxLength={13}
                        inputMode="numeric"
                        placeholder="13-digit ID Number" 
                        className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all min-h-[46px]" 
                        value={newLoanForm.idNumber} 
                        onChange={e => setNewLoanForm({...newLoanForm, idNumber: e.target.value.replace(/\D/g, '')})} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Principal Amount (R) *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddModalOpen(false);
                            setIsEmiCalculatorModalOpen(true);
                          }}
                          className="text-[10px] text-amber-600 hover:text-amber-700 font-black uppercase hover:underline flex items-center gap-1 transition-colors"
                        >
                          <Calculator size={11} /> EMI Calculator & Penalties
                        </button>
                      </div>
                      <input 
                        required 
                        type="number" 
                        min="100" 
                        max="50000" 
                        step="100" 
                        inputMode="numeric"
                        placeholder="e.g. 2500" 
                        className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all min-h-[46px]" 
                        value={newLoanForm.amountLoaned || ''} 
                        onChange={e => setNewLoanForm({...newLoanForm, amountLoaned: Number(e.target.value)})} 
                      />
                      <div className="flex items-center gap-1.5 pt-1">
                        {[1000, 2500, 5000].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setNewLoanForm(prev => ({ ...prev, amountLoaned: amt }))}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                              newLoanForm.amountLoaned === amt 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            R {amt.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Due Date (Max 1 Month) *</label>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
                          <button
                            type="button"
                            onClick={() => {
                              const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
                              setNewLoanForm(prev => ({ ...prev, dueDate: in14 }));
                            }}
                            className="hover:underline"
                          >
                            +14d
                          </button>
                          <span className="text-gray-300">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
                              setNewLoanForm(prev => ({ ...prev, dueDate: in30 }));
                            }}
                            className="hover:underline"
                          >
                            +30d (Max)
                          </button>
                        </div>
                      </div>
                      <input 
                        required 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        max={new Date(Date.now() + 31 * 86400000).toISOString().split('T')[0]}
                        className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all min-h-[46px]" 
                        value={newLoanForm.dueDate} 
                        onChange={e => setNewLoanForm({...newLoanForm, dueDate: e.target.value})} 
                      />
                      <p className="text-[10px] text-gray-400">Repayment term is capped up to 1 month (maximum 31 days).</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Mobile Phone (for WhatsApp Reminders) *</label>
                    <input 
                      required 
                      type="tel" 
                      inputMode="tel"
                      placeholder="e.g. 082 123 4567" 
                      className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl w-full font-bold text-sm font-mono focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all min-h-[46px]" 
                      value={newLoanForm.borrowerNumber} 
                      onChange={e => setNewLoanForm({...newLoanForm, borrowerNumber: e.target.value})} 
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 bg-gray-50/80 border-t flex flex-col-reverse sm:flex-row gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="w-full sm:w-auto px-6 py-3.5 font-black text-xs uppercase text-gray-500 hover:text-gray-800 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all min-h-[44px]"
                >
                  Confirm & Issue
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* Comprehensive Borrower Dossier Modal for Lenders */}
      {selectedBorrower && (
        <BorrowerDossierModal
          borrower={selectedBorrower}
          onClose={() => setSelectedBorrowerId(null)}
          onSaveProfile={handleSaveBorrowerProfile}
          onOpenPhotoCapture={(idNumber) => openCameraCapture('borrower', idNumber)}
          onIssueLoanForBorrower={handleIssueLoanForBorrower}
          onSelectLoan={(loan) => setSelectedLoan(loan)}
          onMarkLoanAsPaid={handleMarkAsPaid}
          onEditLoan={(loan) => setLoanToEdit(loan)}
          onDeleteLoan={(loan) => setLoanToDelete(loan)}
        />
      )}

      {/* Dedicated Loan Edit Modal */}
      <AnimatePresence>
        {loanToEdit && (
          <EditLoanModal
            loan={loanToEdit}
            isOpen={!!loanToEdit}
            onClose={() => setLoanToEdit(null)}
            onSave={handleSaveEditedLoan}
            onDelete={(loan) => {
              setLoanToEdit(null);
              setLoanToDelete(loan);
            }}
          />
        )}
      </AnimatePresence>

      {/* Dedicated Loan Deletion Confirmation Modal */}
      <AnimatePresence>
        {loanToDelete && (
          <DeleteLoanModal
            loan={loanToDelete}
            isOpen={!!loanToDelete}
            onClose={() => setLoanToDelete(null)}
            onConfirm={handleDeleteLoan}
          />
        )}
      </AnimatePresence>

      {/* Borrower Deletion Confirmation Dialog */}
      <AnimatePresence>
        {borrowerToDelete && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              key="delete-borrower-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-gray-950/70 backdrop-blur-sm"
              onClick={() => setBorrowerToDelete(null)}
            />
            <motion.div
              key="delete-borrower-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl relative z-10 border border-rose-100"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 size={28} />
              </div>
              <h3 className="text-xl font-black uppercase text-gray-900">Remove Borrower Profile?</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Are you sure you want to permanently remove <strong className="text-gray-900">{borrowerToDelete.name}</strong> (ID: {borrowerToDelete.idNumber})? This will also remove their associated loan records from Firestore.
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setBorrowerToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-xs uppercase transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteBorrower(borrowerToDelete.idNumber)}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase shadow-md transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={handleCapturedPhoto}
        currentPhoto={getCurrentPhotoForContext()}
        userName={getCurrentNameForContext()}
      />

      {/* Historical Data Recovery & Backup Hub */}
      <DataRecoveryModal
        isOpen={isDataRecoveryOpen}
        onClose={() => setIsDataRecoveryOpen(false)}
        loans={loans || []}
        borrowers={borrowers || []}
        currentLoans={loans || []}
        currentBorrowers={borrowers || []}
        settings={settings}
        isCloudConnected={isCloudConnected}
        onDataRestored={(restoredLoans, restoredBorrowers) => {
          setLoans(prev => {
            const existingIds = new Set(prev.map(l => l.id));
            const newLoans = restoredLoans.filter(l => !existingIds.has(l.id));
            return [...prev, ...newLoans];
          });
          setExtraProfiles(prev => {
            const existingIds = new Set(prev.map(p => p.idNumber));
            const newProfiles = restoredBorrowers.filter(p => !existingIds.has(p.idNumber));
            return [...prev, ...newProfiles];
          });
          setShowToast("Database successfully updated with recovered records!");
          setTimeout(() => setShowToast(null), 4000);
        }}
      />

      {/* Automated WhatsApp Trigger Notification Prompt Modal */}
      <WhatsAppNotificationModal
        notification={activeWhatsAppNotification}
        onClose={() => setActiveWhatsAppNotification(null)}
        onMarkSent={() => {
          setActiveWhatsAppNotification(null);
          setShowToast("WhatsApp reminder acknowledged.");
          setTimeout(() => setShowToast(null), 2500);
        }}
      />

      {/* WhatsApp Automation Hub & Audit Logs */}
      <WhatsAppAutomationHub
        isOpen={isWhatsAppHubOpen}
        onClose={() => setIsWhatsAppHubOpen(false)}
        loans={loans || []}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          setSettings(newSettings);
          saveSettingsToFirestore(newSettings).catch(err => console.warn('WhatsApp settings sync deferred:', err));
        }}
        onLoansUpdated={(updatedLoans) => {
          setLoans(updatedLoans);
          updatedLoans.forEach(l => {
            saveLoanToFirestore(l).catch(err => console.warn('WhatsApp loan sync deferred:', err));
          });
        }}
        notifications={whatsAppNotifications}
        onTriggerNotification={(notif) => {
          setActiveWhatsAppNotification(notif);
        }}
      />

      {/* Prospective Borrower Loan EMI & Penalty Structure Calculator Modal */}
      <AnimatePresence>
        {isEmiCalculatorModalOpen && (
          <LoanEmiCalculatorModal
            isOpen={isEmiCalculatorModalOpen}
            onClose={() => setIsEmiCalculatorModalOpen(false)}
            borrower={currentBorrowerAccount}
            defaultPrincipal={newLoanForm.amountLoaned || 2500}
            defaultWeeks={4}
            interestRate={DEFAULT_INTEREST_RATE}
            penaltyRate={DEFAULT_PENALTY_RATE}
            language={language}
            onApply={(amount, termWeeks, dueDate) => {
              if (currentBorrowerAccount) {
                setNewLoanForm({
                  borrowerName: currentBorrowerAccount.name,
                  idNumber: currentBorrowerAccount.idNumber,
                  physicalAddress: currentBorrowerAccount.address || '',
                  borrowerNumber: currentBorrowerAccount.phone || '',
                  employer: currentBorrowerAccount.employer || '',
                  employmentStatus: currentBorrowerAccount.employmentStatus || 'Full-time',
                  amountLoaned: amount,
                  dueDate: dueDate,
                  payoutMethod: currentBorrowerAccount.payoutMethod || PayoutMethod.MOBILE,
                  profilePhoto: currentBorrowerAccount.profilePhoto || ''
                });
              } else {
                setNewLoanForm(prev => ({
                  ...prev,
                  amountLoaned: amount,
                  dueDate: dueDate
                }));
              }
              setIsAddModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
