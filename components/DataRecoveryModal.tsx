import * as React from 'react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, RefreshCw, Upload, Download, FileText, CheckCircle2, 
  AlertTriangle, X, ShieldCheck, HardDrive, Clock, Search, ArrowRight,
  Plus, Check, Sparkles, FolderSync, Info
} from 'lucide-react';
import { Loan, BorrowerProfile, UserSettings } from '../types';
import { 
  scanLocalStorageForData, 
  syncBatchToFirestore, 
  downloadJSONBackup, 
  downloadLoansCSV, 
  parseBackupFileContent,
  RecoveryScanResult 
} from '../services/dataRecoveryService';

interface DataRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  loans?: Loan[];
  currentLoans?: Loan[];
  borrowers?: BorrowerProfile[];
  currentBorrowers?: BorrowerProfile[];
  settings?: UserSettings;
  onDataRestored: (newLoans: Loan[], newBorrowers: BorrowerProfile[]) => void;
  isCloudConnected?: boolean;
}

const DataRecoveryModal: React.FC<DataRecoveryModalProps> = ({
  isOpen,
  onClose,
  loans: propLoans,
  currentLoans,
  borrowers: propBorrowers,
  currentBorrowers,
  settings,
  onDataRestored,
  isCloudConnected = false
}) => {
  const loans = propLoans || currentLoans || [];
  const borrowers = propBorrowers || currentBorrowers || [];
  const [activeTab, setActiveTab] = useState<'scan' | 'import' | 'export' | 'history'>('scan');
  const [scanResult, setScanResult] = useState<RecoveryScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stagedImport, setStagedImport] = useState<{ loans: Loan[]; borrowers: BorrowerProfile[] } | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Quick past loan logger state
  const [pastForm, setPastForm] = useState({
    borrowerName: '',
    idNumber: '',
    phone: '',
    amountLoaned: 1500,
    startDate: '2025-10-01',
    dueDate: '2025-11-01',
    isSettled: true
  });

  const handleRunScan = () => {
    setIsScanning(true);
    setErrorMessage(null);
    setSyncSuccessMsg(null);

    setTimeout(() => {
      try {
        const result = scanLocalStorageForData();
        setScanResult(result);
      } catch (err: any) {
        setErrorMessage(`Scan failed: ${err.message || 'Unknown error'}`);
      } finally {
        setIsScanning(false);
      }
    }, 400);
  };

  const handleRestoreScannedData = async () => {
    if (!scanResult || scanResult.totalFound === 0) return;
    setIsSyncing(true);
    setErrorMessage(null);

    try {
      await syncBatchToFirestore(scanResult.loans, scanResult.borrowers);
      onDataRestored(scanResult.loans, scanResult.borrowers);
      setSyncSuccessMsg(`Successfully restored ${scanResult.loans.length} loans and ${scanResult.borrowers.length} borrowers to your cloud database!`);
    } catch (err: any) {
      setErrorMessage(`Failed to save to cloud: ${err.message || 'Check database permissions'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setSyncSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseBackupFileContent(text);
        if (parsed.loans.length === 0 && parsed.borrowers.length === 0) {
          setErrorMessage('No valid loan or borrower records were found in this file.');
        } else {
          setStagedImport(parsed);
        }
      } catch (err: any) {
        setErrorMessage(`Error parsing file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!stagedImport) return;
    setIsSyncing(true);
    setErrorMessage(null);

    try {
      await syncBatchToFirestore(stagedImport.loans, stagedImport.borrowers);
      onDataRestored(stagedImport.loans, stagedImport.borrowers);
      setSyncSuccessMsg(`Import successful: ${stagedImport.loans.length} loans and ${stagedImport.borrowers.length} borrower profiles synced to Firestore.`);
      setStagedImport(null);
    } catch (err: any) {
      setErrorMessage(`Import failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSavePastLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastForm.borrowerName || !pastForm.idNumber) return;

    setIsSyncing(true);
    setErrorMessage(null);

    try {
      const interest = Math.round(pastForm.amountLoaned * 0.3);
      const totalRepayment = pastForm.amountLoaned + interest;
      const loanId = `T0${loans.length + 101}`;

      const historicalLoan: Loan = {
        id: loanId,
        borrowerName: pastForm.borrowerName,
        idNumber: pastForm.idNumber,
        borrowerNumber: pastForm.phone || '0700000000',
        physicalAddress: 'Eastern Cape, South Africa',
        amountLoaned: Number(pastForm.amountLoaned),
        interestRate: 30,
        penaltyRate: 5,
        totalRepayment,
        startDate: pastForm.startDate,
        dueDate: pastForm.dueDate,
        status: pastForm.isSettled ? ('Paid' as any) : ('Overdue' as any),
        payoutMethod: 'Mobile Number' as any,
        applicationStatus: 'Approved' as any,
        history: [
          { date: pastForm.startDate, action: 'Disbursed', amount: pastForm.amountLoaned },
          ...(pastForm.isSettled ? [{ date: pastForm.dueDate, action: 'Full Repayment Received', amount: totalRepayment }] : [])
        ]
      };

      const borrowerProfile: BorrowerProfile = {
        idNumber: pastForm.idNumber,
        name: pastForm.borrowerName,
        phone: pastForm.phone,
        address: 'Eastern Cape, South Africa',
        email: `${pastForm.idNumber.slice(0, 5)}@imali.co.za`,
        score: pastForm.isSettled ? 740 : 580
      };

      await syncBatchToFirestore([historicalLoan], [borrowerProfile]);
      onDataRestored([historicalLoan], [borrowerProfile]);

      setSyncSuccessMsg(`Saved historical loan for ${pastForm.borrowerName} (${loanId}) to cloud!`);
      setPastForm({
        borrowerName: '',
        idNumber: '',
        phone: '',
        amountLoaned: 1500,
        startDate: '2025-10-01',
        dueDate: '2025-11-01',
        isSettled: true
      });
    } catch (err: any) {
      setErrorMessage(`Could not save record: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-gray-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="bg-white w-full max-w-2xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden my-auto flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 sm:p-7 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 xhosa-pattern pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Database size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black uppercase tracking-tight">Database & Data Recovery</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isCloudConnected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                  {isCloudConnected ? 'Cloud Active' : 'Connecting'}
                </span>
              </div>
              <p className="text-xs text-gray-400 font-medium">Restore past records, recover storage & manage cloud backups</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors relative z-10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Database Status Strip */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-gray-600">
            <span className="font-bold flex items-center gap-1.5">
              <HardDrive size={14} className="text-indigo-600" />
              Current Database: <strong className="text-gray-900 font-black">{(borrowers || []).length} Borrowers</strong> • <strong className="text-gray-900 font-black">{(loans || []).length} Loans</strong>
            </span>
          </div>
          <div className="text-[11px] font-mono text-gray-400">
            Firestore: ai-studio-imali
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-3 bg-white gap-2">
          <button 
            onClick={() => setActiveTab('scan')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'scan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Search size={14} /> Scan Browser Storage
          </button>
          <button 
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'import' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Upload size={14} /> Import Backup
          </button>
          <button 
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'export' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Download size={14} /> Export Backup
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 px-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            <Plus size={14} /> Log Past Loan
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {syncSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{syncSuccessMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold animate-in fade-in">
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: SCAN BROWSER STORAGE */}
          {activeTab === 'scan' && (
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 space-y-2">
                <div className="flex items-center gap-2 font-black text-indigo-900 uppercase tracking-tight">
                  <Sparkles size={15} className="text-indigo-600" />
                  Why might previous data seem missing?
                </div>
                <p className="leading-relaxed text-indigo-800">
                  Previous versions of imali stored data in your browser's <strong className="text-indigo-950 font-bold">localStorage</strong>. Because browser storage is sandboxed per domain URL (and web containers change domains across updates or cache clears), older records may remain inside browser keys.
                </p>
                <p className="leading-relaxed text-indigo-800">
                  Tap below to deep-scan all browser keys (<code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-900">imali_loans</code>, <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-900">loans</code>, <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-900">imali_profiles</code>, etc.) and permanently migrate them to your persistent Firestore cloud database!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleRunScan}
                  disabled={isScanning}
                  className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isScanning ? 'animate-spin' : ''} />
                  {isScanning ? 'Scanning Browser Storage...' : 'Scan Storage for Past Records'}
                </button>
              </div>

              {scanResult && (
                <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700">Scan Results</span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${scanResult.totalFound > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                      {scanResult.totalFound} Records Discovered
                    </span>
                  </div>

                  {scanResult.totalFound > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-600">
                        Discovered <strong>{scanResult.loans.length} loans</strong> and <strong>{scanResult.borrowers.length} borrower profiles</strong> in storage keys: {scanResult.scannedKeys.join(', ')}.
                      </p>

                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {scanResult.loans.map((l) => (
                          <div key={l.id} className="p-2.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <strong className="text-gray-900 font-bold">{l.borrowerName}</strong> ({l.idNumber})
                              <p className="text-[10px] text-gray-400">Amount: R{l.amountLoaned.toLocaleString()} • Start: {l.startDate} • Due: {l.dueDate}</p>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg">{l.status}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleRestoreScannedData}
                        disabled={isSyncing}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <FolderSync size={16} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing to Cloud...' : 'Restore & Sync All Discovered Records to Cloud'}
                      </button>
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-2">
                      <p className="text-xs text-gray-500 font-medium">
                        No residual un-synced records found in this browser origin ({window.location.origin}).
                      </p>
                      <p className="text-[11px] text-gray-400">
                        If you have a previous file export (.json or .csv), switch to the <strong className="text-indigo-600">Import Backup</strong> tab or log your past loans in the <strong className="text-indigo-600">Log Past Loan</strong> tab.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT BACKUP */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600 space-y-1.5">
                <p className="font-bold text-gray-900">Upload JSON Backup or CSV Loan Ledger</p>
                <p>
                  Restore your borrowers and past loans from an exported imali JSON backup or CSV ledger file. Existing records will be updated and new records will be added safely without duplicates.
                </p>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer bg-gray-50 hover:bg-indigo-50/30 transition-all"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".json,.csv" 
                  className="hidden" 
                />
                <Upload size={32} className="mx-auto text-indigo-600 mb-2" />
                <p className="text-xs font-black uppercase tracking-wider text-gray-700 mb-1">
                  {fileName ? fileName : 'Choose or Drag JSON / CSV file'}
                </p>
                <p className="text-[11px] text-gray-400">Supports .json backup archives and .csv tables</p>
              </div>

              {stagedImport && (
                <div className="p-4 border border-indigo-200 bg-indigo-50/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900">
                      Parsed: <strong>{stagedImport.loans.length} Loans</strong> and <strong>{stagedImport.borrowers.length} Borrowers</strong>
                    </span>
                  </div>

                  <button
                    onClick={handleConfirmImport}
                    disabled={isSyncing}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Check size={16} />
                    {isSyncing ? 'Importing & Syncing to Cloud...' : 'Confirm & Save Records to Cloud'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPORT BACKUP */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-600 space-y-1.5">
                <p className="font-bold text-gray-900">Export Your Complete Community Ledger</p>
                <p>
                  Download a complete, offline-safe snapshot of all borrower dossiers, loan statuses, payment histories, and penalty records.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => downloadJSONBackup(loans, borrowers, settings)}
                  className="p-5 border border-gray-200 hover:border-indigo-500 rounded-2xl bg-white hover:bg-indigo-50/20 text-left transition-all shadow-sm group"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <Download size={20} />
                  </div>
                  <h4 className="text-xs font-black uppercase text-gray-900 mb-1">Full JSON Backup</h4>
                  <p className="text-[11px] text-gray-500">Complete raw dataset with full histories, KYC status, and settings.</p>
                </button>

                <button
                  onClick={() => downloadLoansCSV(loans)}
                  className="p-5 border border-gray-200 hover:border-emerald-500 rounded-2xl bg-white hover:bg-emerald-50/20 text-left transition-all shadow-sm group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                    <FileText size={20} />
                  </div>
                  <h4 className="text-xs font-black uppercase text-gray-900 mb-1">Loans CSV Spreadsheet</h4>
                  <p className="text-[11px] text-gray-500">Opens directly in Excel or Google Sheets for accounting and audits.</p>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: QUICK LOG PAST LOAN */}
          {activeTab === 'history' && (
            <form onSubmit={handleSavePastLoan} className="space-y-3.5 text-left">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Log an agreement from months ago that was previously recorded on paper or lost. It will immediately calculate interest, penalties, and update borrower trust scores.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Borrower Legal Name</label>
                  <input
                    required
                    value={pastForm.borrowerName}
                    onChange={(e) => setPastForm({ ...pastForm, borrowerName: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    placeholder="e.g. Sipho Ndlovu"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">SA ID Number</label>
                  <input
                    required
                    value={pastForm.idNumber}
                    inputMode="numeric"
                    onChange={(e) => setPastForm({ ...pastForm, idNumber: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                    placeholder="13-digit ID"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Principal (ZAR)</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={pastForm.amountLoaned}
                    onChange={(e) => setPastForm({ ...pastForm, amountLoaned: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Original Start Date</label>
                  <input
                    type="date"
                    required
                    value={pastForm.startDate}
                    onChange={(e) => setPastForm({ ...pastForm, startDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Original Due Date</label>
                  <input
                    type="date"
                    required
                    value={pastForm.dueDate}
                    onChange={(e) => setPastForm({ ...pastForm, dueDate: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 font-bold text-xs focus:bg-white focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <input
                  type="checkbox"
                  id="pastSettled"
                  checked={pastForm.isSettled}
                  onChange={(e) => setPastForm({ ...pastForm, isSettled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="pastSettled" className="text-xs font-bold text-gray-700 cursor-pointer">
                  This historical loan was fully paid / settled by the borrower
                </label>
              </div>

              <button
                type="submit"
                disabled={isSyncing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                <Plus size={16} />
                {isSyncing ? 'Saving to Cloud...' : 'Record Past Loan to Cloud'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DataRecoveryModal;
