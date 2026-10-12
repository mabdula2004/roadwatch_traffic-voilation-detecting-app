import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

export type Language = 'en' | 'ur';

const LANG_STORAGE_KEY = '@roadwatch_lang';

export const translations = {
  en: {
    // Tabs & Navigation
    wallet: 'Wallet',
    vault: 'Vault',
    capture: 'Capture',
    safety: 'Safety',
    settings: 'Settings',

    // Settings Screen
    account: 'Account',
    profile: 'Profile',
    namePhoneEmail: 'Name, phone, email',
    changePassword: 'Change password',
    updateSecurityCredentials: 'Update your security credentials',
    preferences: 'Preferences',
    language: 'Language',
    theme: 'Theme',
    supportLegal: 'Support & Legal',
    helpFaq: 'Help / FAQ',
    termsPrivacy: 'Terms & Privacy Policy',
    appVersion: 'App version',
    logout: 'Logout',
    deleteAccount: 'Delete account',
    reporterTrust: 'Reporter trust',
    reporterTrustTitle: 'Reporter trust',
    trustScoreDesc: 'Score from your reporter profile. Reports are awaiting real review.',
    priorityReviewLane: 'Priority review lane',
    trustNotice: 'Reports above 90 skip the community queue and go straight to a police officer.',
    thisMonth: '+6 this month',
    approved: 'Approved',
    rejected: 'Rejected',
    accuracy: 'Accuracy',
    highTrust: 'High Trust',
    trustScore: 'Trust score',
    currentScore: 'Current score',
    notificationsAlerts: 'Notifications & Alerts',
    noNotifications: 'No notifications available yet.',
    backToSettings: 'Back to Settings',
    dark: 'Dark',
    light: 'Light',
    system: 'System',
    english: 'English',
    urdu: 'اردو (Urdu)',
    noPlateRegistered: 'No Plate Registered',
    cancel: 'Cancel',
    ok: 'OK',

    // Profile Settings
    editProfile: 'Edit Profile',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    emailAddress: 'Email Address',
    registeredPlate: 'Registered Vehicle Plate',
    asPrintedOnCnic: 'As printed on CNIC',
    cnic: 'CNIC (Identity Card)',
    cnicLockedBadge: '1 Account per CNIC · Locked',
    cnicLockedHelp: 'National Identity Number cannot be changed once registered.',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    nameRequired: 'Name Required',
    nameValidationMsg: 'Please provide a valid full name (at least 3 characters).',
    profileUpdated: 'Profile Updated',
    profileSavedSuccess: 'Your profile details have been saved successfully.',
    saveFailed: 'Save failed',

    // Change Password
    securityBannerTitle: 'Update Account Credentials',
    securityBannerSub: 'Set a strong password of at least 6 characters to secure your citizen reporter account.',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    currentPassword: 'Current Password',
    updatePassword: 'Update Password',
    passwordPlaceholder: 'At least 6 characters',
    passwordShortTitle: 'Password Too Short',
    passwordShortMsg: 'Password must be at least 6 characters long.',
    passwordMismatchTitle: 'Password Mismatch',
    passwordMismatchMsg: 'New password and confirm password do not match.',
    passwordUpdatedTitle: 'Password Updated',
    passwordUpdatedSuccess: 'Your account password has been updated successfully.',
    updateFailed: 'Update Failed',

    // Citizen Wallet
    citizenWallet: 'Citizen Wallet',
    walletSubtitle: 'Reward balance & citations for your account',
    rewardBalance: 'REWARD & CITIZEN BALANCE',
    epayLinked: 'e-Pay linked',
    activeAccount: 'Active Account',
    pendingClearance: 'pending clearance',
    loadingWallet: 'Loading wallet…',
    quickRecharge: 'QUICK TEST RECHARGE (ADD FUNDS):',
    withdrawUnavailable: 'Withdrawal unavailable',
    citations: 'Citations',
    unavailable: 'Unavailable',
    noCitations: 'No pending citations found for this plate.',
    transactionHistory: 'Transaction History',
    allTransactions: 'All',
    rewards: 'Rewards',
    penalties: 'Penalties',
    recharges: 'Top-Ups',
    noTransactions: 'No transactions recorded yet.',
    incidentLocation: 'Location',
    incidentTime: 'Date & Time',
    violationReason: 'Fine Reason',
    falseReportPenalty: 'False Report Submission Penalty',
    linkedCase: 'Linked Case',
    citationsSummary: 'Active Violations & Fines',

    // Evidence Vault
    evidenceVault: 'Evidence Vault',
    pending: 'Pending',
    sealed: 'Sealed',
    onDevice: 'On device',
    pendingUpload: 'Pending upload',
    sealedEvidence: 'Sealed evidence',
    noPendingUploads: 'No clips waiting for upload.',
    noSealedRecords: 'No sealed evidence records yet.',
    capturedAt: 'Captured',
    status: 'Status',
    sealedHash: 'SHA-256 Verified',
    underHumanReview: 'Under Human Review',
    rewardPrizeWon: '+PKR 200 Prize Won',
    falseReportFine: '-PKR 50 Fine Penalty',
    wardenAuditQueue: 'Officer Review (PKR 100 Paid)',
    acceptedExplanation: 'Violation verified by AI. Reward credited to citizen wallet.',
    rejectedExplanation: 'AI rejected violation claim. Penalty fine charged for invalid report.',
    underReviewExplanation: 'Traffic warden is auditing 6 video frames and vehicle evidence.',
    penaltyCitations: 'Penalty Citations',
    paidFromWallet: 'Paid from Wallet',
    disputedInReview: 'Disputed / In Review',
    officerConfirmedBadge: 'Confirmed by Officer',
    officerRejectedBadge: 'Rejected by Officer',
    officerConfirmedBanner: '+PKR 300 Won (PKR 100 Fee Refund + PKR 200 Reward)',
    officerRejectedBanner: 'PKR 100 Fee Forfeited (No Violation Found)',
    officerActionTitle: 'Traffic Warden Audit (Verdict Action)',
    officerActionDesc: 'As reviewing warden, audit video frames and select legal decision:',
    confirmViolationBtn: 'Confirm Violation (+PKR 300)',
    rejectViolationBtn: 'Reject Claim (Fee Lost)',
    officerConfirmAlertTitle: 'Violation Legally Confirmed!',
    officerConfirmAlertMsg: 'Traffic warden confirmed violation. PKR 100 review fee refunded + PKR 200 prize credited to your wallet (+PKR 300 total).',
    officerRejectAlertTitle: 'Review Rejected by Officer',
    officerRejectAlertMsg: 'Traffic warden reviewed footage and concluded no violation occurred. The PKR 100 review fee is forfeited.',
    evidentiaryDossier: 'Official Evidentiary Dossier',
    viewFullDossier: 'Tap to inspect full report & 3 frames',
    threeFramesInspected: '3 Evidentiary Video Keyframes',
    tapToZoomFrame: 'Tap frame to zoom HD',
    evidentiaryThresholds: 'EVIDENTIARY THRESHOLDS',
    vehicleTelemetry: 'VEHICLE & INCIDENT TELEMETRY',
    aiLegalReasoning: 'AI EVIDENTIARY REASONING & NOTES',
    financialBreakdown: 'CITIZEN FINANCIAL IMPACT',
    closeDossier: 'Close Report',
    underWardenNotice: 'Under official Traffic Warden audit. Certified officer is reviewing video frames.',
    manageVault: 'Select & Clean',
    cancelManage: 'Done',
    deleteSelected: 'Delete Selected',
    selectAllEligible: 'Select All (Eligible)',
    deleteConfirmTitle: 'Delete Reports?',
    deleteConfirmMsg: 'Are you sure you want to remove selected reports from your vault? This will clean up your screen.',
    deleteSingleConfirm: 'Are you sure you want to delete this report from your vault?',
    protectedUnderReview: 'Cannot delete: Under Warden Review',
    protectedPendingUpload: 'Cannot delete: Pending upload',
    reportsDeletedSuccess: 'Selected reports removed from vault.',
    deleteDossierBtn: 'Delete Report from Vault',

    // Safety & SOS
    safetyAndPrivacy: 'Safety & Privacy',
    safetySub: 'Emergency help and what RoadWatch shares about you.',
    emergencySos: 'EMERGENCY SOS',
    emergencySosSub: 'Send profile & live GPS to Rescue 1122',
    police15: 'Police 15',
    rescue1122: 'Rescue 1122',
    privacyShields: 'PRIVACY SHIELDS',
    autoBlurFaces: 'Auto-blur faces',
    autoBlurActive: 'Automated privacy facial blur is active for clips.',
    autoBlurDisabled: 'Disabled. Facial privacy blur is off.',
    publicPlateSearch: 'Public plate search',
    publicPlateSub: 'Government registry is not connected yet.',
    dialerUnavailable: 'Phone call is not available on this device.',
    emergencySosAlertTitle: 'EMERGENCY SOS',

    // Live Capture
    frameGuide: 'FRAME GUIDE',
    readyToRecord: 'READY TO RECORD (5s – 30s)',
    recordingStatus: 'RECORDING',
    min5sRequired: 'MIN 5s REQUIRED',
    tapToStop: 'TAP TO STOP (MAX 30s)',
    gettingGps: 'GETTING GPS',
    tapToAllowCamera: 'TAP BELOW TO ALLOW CAMERA',
    gpsOnCapture: 'GPS on capture',
    gpsPending: 'GPS pending',
    permissionsRequired: 'Permissions required',
    cameraMicPermissionMsg: 'Please allow camera and microphone access.',
    clipTooShortTitle: 'Clip Too Short',
    clipTooShortMsg: 'Traffic violation clips must be at least 5 seconds long to establish evidentiary proof.',

    // Report Review & Outcome
    reviewReport: 'Review Report',
    evidentiaryAnalysis: 'AI Evidentiary Analysis',
    evidenceDetails: 'Evidence Details',
    manualReviewPrompt: 'Try Manual Officer Review',
    manualReviewFee: 'Review Fee: PKR 100',
    insufficientBalance: 'Insufficient Balance',
    payAndSubmit: 'Pay PKR 100 & Submit',
    rechargeWallet: 'Recharge Wallet',
    submittedToOfficer: 'Submitted for Officer Review',
    recordAnother: 'Record Another Clip',
    goToVault: 'View in Vault',
    goToWallet: 'Open Citizen Wallet',

    // Plate Search
    checkPlateBeforeBuy: 'Check a plate before you buy',
    plateSearchSubtitle: 'Official plate records are not connected yet. This screen cannot confirm clearance.',
    backToSafety: 'Back to Safety',
    registryPending: 'REGISTRY PENDING',
    searchButton: 'Search Registry',
    platePlaceholder: 'e.g. LEB-24-9182',
    vehicleNumberPlate: 'Vehicle plate number',
    optional: 'Optional',
  },
  ur: {
    // Tabs & Navigation
    wallet: 'والیٹ',
    vault: 'والٹ',
    capture: 'کیپچر',
    safety: 'حفاظت',
    settings: 'سیٹنگز',

    // Settings Screen
    account: 'اکاؤنٹ',
    profile: 'پروفائل',
    namePhoneEmail: 'نام، فون نمبر، ای میل',
    changePassword: 'پاس ورڈ تبدیل کریں',
    updateSecurityCredentials: 'اپنی سیکیورٹی تفصیلات تبدیل کریں',
    preferences: 'ترجیحات',
    language: 'زبان',
    theme: 'تھیم',
    supportLegal: 'معاونت اور قانونی',
    helpFaq: 'مدد / عمومی سوالات',
    termsPrivacy: 'شرائط اور رازداری کی پالیسی',
    appVersion: 'ایپ ورژن',
    logout: 'لاگ آؤٹ',
    deleteAccount: 'اکاؤنٹ حذف کریں',
    reporterTrust: 'رپورٹر کا اعتماد',
    reporterTrustTitle: 'رپورٹر کا اعتماد',
    trustScoreDesc: 'آپ کے رپورٹر پروفائل کا اسکور۔ رپورٹیں جائزے کی منتظر ہیں۔',
    priorityReviewLane: 'ترجیحی جائزہ لین',
    trustNotice: '90 سے زیادہ اسکور والی رپورٹیں کمیونٹی قطار کو چھوڑ کر براہ راست پولیس افسر کو جاتی ہیں۔',
    thisMonth: '+6 اس ماہ',
    approved: 'منظور شدہ',
    rejected: 'مسترد شدہ',
    accuracy: 'درستگی',
    highTrust: 'اعلیٰ اعتماد',
    trustScore: 'اعتماد کا اسکور',
    currentScore: 'موجودہ اسکور',
    notificationsAlerts: 'اطلاعات اور الرٹس',
    noNotifications: 'فی الحال کوئی اطلاع موجود نہیں ہے۔',
    backToSettings: 'سیٹنگز پر واپس جائیں',
    dark: 'ڈارک',
    light: 'لائٹ',
    system: 'سسٹم',
    english: 'English',
    urdu: 'اردو (Urdu)',
    noPlateRegistered: 'کوئی پلیٹ درج نہیں',
    cancel: 'منسوخ کریں',
    ok: 'ٹھیک ہے',

    // Profile Settings
    editProfile: 'پروفائل میں ترمیم کریں',
    fullName: 'مکمل نام',
    phoneNumber: 'فون نمبر',
    emailAddress: 'ای میل ایڈریس',
    registeredPlate: 'رجسٹرڈ گاڑی کی نمبر پلیٹ',
    asPrintedOnCnic: 'شناختی کارڈ کے مطابق',
    cnic: 'شناختی کارڈ نمبر',
    cnicLockedBadge: 'ایک شناختی کارڈ پر ایک اکاؤنٹ · مقفل',
    cnicLockedHelp: 'رجسٹریشن کے بعد شناختی کارڈ نمبر تبدیل نہیں کیا جا سکتا۔',
    saveChanges: 'تبدیلیاں محفوظ کریں',
    saving: 'محفوظ ہو رہا ہے...',
    nameRequired: 'نام درج کرنا لازمی ہے',
    nameValidationMsg: 'برائے مہربانی درست مکمل نام (کم از کم 3 حروف) درج کریں۔',
    profileUpdated: 'پروفائل اپ ڈیٹ ہو گئی',
    profileSavedSuccess: 'آپ کے پروفائل کی تفصیلات کامیابی سے محفوظ ہو گئی ہیں۔',
    saveFailed: 'محفوظ نہ ہو سکا',

    // Change Password
    securityBannerTitle: 'اکاؤنٹ کی تفصیلات اپ ڈیٹ کریں',
    securityBannerSub: 'اپنے رپورٹر اکاؤنٹ کو محفوظ رکھنے کے لیے کم از کم 6 ہندسوں کا مضبوط پاس ورڈ منتخب کریں۔',
    newPassword: 'نیا پاس ورڈ',
    confirmNewPassword: 'نئے پاس ورڈ کی تصدیق کریں',
    currentPassword: 'موجودہ پاس ورڈ',
    updatePassword: 'پاس ورڈ تبدیل کریں',
    passwordPlaceholder: 'کم از کم 6 ہندسے',
    passwordShortTitle: 'پاس ورڈ بہت چھوٹا ہے',
    passwordShortMsg: 'پاس ورڈ کم از کم 6 ہندسوں پر مشتمل ہونا چاہیے۔',
    passwordMismatchTitle: 'پاس ورڈ غیر مطابقت',
    passwordMismatchMsg: 'نیا پاس ورڈ اور تصدیقی پاس ورڈ ایک جیسے نہیں ہیں۔',
    passwordUpdatedTitle: 'پاس ورڈ تبدیل ہو گیا',
    passwordUpdatedSuccess: 'آپ کا پاس ورڈ کامیابی سے تبدیل ہو گیا ہے۔',
    updateFailed: 'تبدیلی ناکام',

    // Citizen Wallet
    citizenWallet: 'شہری والیٹ',
    walletSubtitle: 'انعامی رقم اور چالان کی تفصیلات',
    rewardBalance: 'انعامی اور شہری رقم',
    epayLinked: 'ای پے منسلک ہے',
    activeAccount: 'ایکٹو اکاؤنٹ',
    pendingClearance: 'منظوری کے منتظر',
    loadingWallet: 'والیٹ لوڈ ہو رہا ہے…',
    quickRecharge: 'فوری ریچارج (رقم شامل کریں):',
    withdrawUnavailable: 'رقم نکلوانا دستیاب نہیں',
    citations: 'چالان کی تفصیلات',
    unavailable: 'دستیاب نہیں',
    noCitations: 'اس نمبر پلیٹ پر کوئی زیر التواء چالان موجود نہیں ہے۔',
    transactionHistory: 'لین دین کی ہسٹری',
    allTransactions: 'تمام',
    rewards: 'انعامات',
    penalties: 'جرمانے',
    recharges: 'ریچارج',
    noTransactions: 'ابھی تک کوئی لین دین درج نہیں ہے۔',
    incidentLocation: 'مقام',
    incidentTime: 'تاریخ اور وقت',
    violationReason: 'جرمانے کی وجہ',
    falseReportPenalty: 'غلط رپورٹنگ پر چالان / جرمانہ',
    linkedCase: 'منسلک کیس',
    citationsSummary: 'عائد کردہ چالان و جرمانے',

    // Evidence Vault
    evidenceVault: 'شواہد والٹ',
    pending: 'زیر التواء',
    sealed: 'محفوظ شدہ',
    onDevice: 'ڈیوائس پر',
    pendingUpload: 'اپلوڈ کے منتظر',
    sealedEvidence: 'سیلڈ شواہد',
    noPendingUploads: 'اپلوڈ کے لیے کوئی ویڈیو زیر التواء نہیں ہے۔',
    noSealedRecords: 'ابھی تک کوئی محفوظ شدہ ثبوت موجود نہیں ہے۔',
    capturedAt: 'ریکارڈنگ وقت',
    status: 'حیثیت',
    sealedHash: 'SHA-256 تصدیق شدہ',
    underHumanReview: 'انسانی جائزے کے تحت',
    rewardPrizeWon: '+200 روپے انعام شامل',
    falseReportFine: '-50 روپے جرمانہ عائد',
    wardenAuditQueue: 'افسر آڈٹ (100 روپے ادا شدہ)',
    acceptedExplanation: 'مصنوعی ذہانت نے خلاف ورزی کی تصدیق کر دی۔ انعامی رقم والیٹ میں شامل کر دی گئی۔',
    rejectedExplanation: 'مصنوعی ذہانت نے خلاف ورزی مسترد کر دی۔ غلط اطلاع پر جرمانہ عائد کیا گیا۔',
    underReviewExplanation: 'ٹریفک وارڈن 6 ویڈیو فریمز اور گاڑی کے شواہد کا معائنہ کر رہا ہے۔',
    penaltyCitations: 'عائد کردہ جرمانے',
    paidFromWallet: 'والیٹ سے ادا شدہ',
    disputedInReview: 'زیر تفتیش / مینوئل ریویو',
    officerConfirmedBadge: 'افسر کی تصدیق شدہ',
    officerRejectedBadge: 'افسر نے مسترد کر دیا',
    officerConfirmedBanner: '+300 روپے وصول (100 فیس واپسی + 200 انعام)',
    officerRejectedBanner: '100 روپے فیس ضبط (کوئی خلاف ورزی نہیں ملی)',
    officerActionTitle: 'ٹریفک وارڈن کا فیصلہ (آڈٹ کارروائی)',
    officerActionDesc: 'بطور تفتیشی افسر، ویڈیو فریمز کا جائزہ لے کر فیصلہ منتخب کریں:',
    confirmViolationBtn: 'خلاف ورزی درست (+300 روپے)',
    rejectViolationBtn: 'مسترد کریں (فیس ضبط)',
    officerConfirmAlertTitle: 'خلاف ورزی کی قانونی تصدیق!',
    officerConfirmAlertMsg: 'ٹریفک وارڈن نے خلاف ورزی کی تصدیق کر دی۔ 100 روپے فیس واپس اور 200 روپے انعام (کل 300 روپے) آپ کے والیٹ میں منتقل کر دیے گئے۔',
    officerRejectAlertTitle: 'افسر کا فیصلہ: درخواست مسترد',
    officerRejectAlertMsg: 'ٹریفک وارڈن نے ویڈیو معائنہ کر کے فیصلہ دیا کہ کوئی خلاف ورزی نہیں ہوئی۔ 100 روپے مینوئل ریویو فیس ضبط کر لی گئی ہے۔',
    evidentiaryDossier: 'سرکاری ثبوتی رپورٹ / مثل',
    viewFullDossier: 'مکمل رپورٹ اور 3 فریمز دیکھیں',
    threeFramesInspected: '3 ثبوتی ویڈیو فریمز (معائنہ شدہ)',
    tapToZoomFrame: 'فریم بڑا دیکھنے کے لیے کلک کریں',
    evidentiaryThresholds: 'ثبوتی معیارات (POC PRD)',
    vehicleTelemetry: 'گاڑی اور واقعہ کی معلومات',
    aiLegalReasoning: 'مصنوعی ذہانت کے ثبوتی نوٹس و وجوہات',
    financialBreakdown: 'شہری مالیاتی تفصیل',
    closeDossier: 'رپورٹ بند کریں',
    underWardenNotice: 'ٹریفک وارڈن کے زیرِ جائزہ۔ افسر ویڈیو فریمز اور شواہد کی تصدیق کر رہا ہے۔',
    manageVault: 'منتخب اور صفائی کریں',
    cancelManage: 'مکمل',
    deleteSelected: 'منتخب ڈیلیٹ کریں',
    selectAllEligible: 'تمام مکمل شدہ منتخب کریں',
    deleteConfirmTitle: 'رپورٹس ڈیلیٹ کریں؟',
    deleteConfirmMsg: 'کیا آپ منتخب کردہ رپورٹس کو والٹ سے ختم کرنا چاہتے ہیں؟ اس سے اسکرین صاف ہو جائے گی۔',
    deleteSingleConfirm: 'کیا آپ اس رپورٹ کو والٹ سے ختم کرنا چاہتے ہیں؟',
    protectedUnderReview: 'ڈیلیٹ نہیں کر سکتے: وارڈن کے زیرِ جائزہ ہے',
    protectedPendingUpload: 'ڈیلیٹ نہیں کر سکتے: اپلوڈ کے منتظر ہے',
    reportsDeletedSuccess: 'منتخب رپورٹس والٹ سے ختم کر دی گئیں۔',
    deleteDossierBtn: 'رپورٹ والٹ سے ڈیلیٹ کریں',

    // Safety & SOS
    safetyAndPrivacy: 'حفاظت اور رازداری',
    safetySub: 'ہنگامی مدد اور رازداری سے متعلق ترتیبات۔',
    emergencySos: 'ہنگامی SOS',
    emergencySosSub: 'ریسکیو 1122 کو اپنی لوکیشن اور تفصیلات بھیجیں',
    police15: 'پولیس 15',
    rescue1122: 'ریسکیو 1122',
    privacyShields: 'رازداری کے شیلڈز',
    autoBlurFaces: 'خودکار چہرے دھندلا کریں',
    autoBlurActive: 'ویڈیوز کے لیے چہرے خودکار دھندلا کرنے کی سہولت فعال ہے۔',
    autoBlurDisabled: 'غیر فعال۔ چہرے دھندلا نہیں کیے جائیں گے۔',
    publicPlateSearch: 'گاڑی کی نمبر پلیٹ تلاش کریں',
    publicPlateSub: 'سرکاری ایکسائز رجسٹری فی الحال منسلک نہیں ہے۔',
    dialerUnavailable: 'اس ڈیوائس پر فون کال دستیاب نہیں ہے۔',
    emergencySosAlertTitle: 'ہنگامی SOS',

    // Live Capture
    frameGuide: 'فریم گائیڈ',
    readyToRecord: 'ریکارڈنگ کے لیے تیار (5 تا 30 سیکنڈ)',
    recordingStatus: 'ریکارڈنگ جاری',
    min5sRequired: 'کم از کم 5 سیکنڈ ضروری ہے',
    tapToStop: 'روکنے کے لیے دبائیں (زیادہ سے زیادہ 30 سیکنڈ)',
    gettingGps: 'جی پی ایس لوکیشن حاصل ہو رہی ہے',
    tapToAllowCamera: 'کیمرہ کھولنے کے لیے نیچے کلک کریں',
    gpsOnCapture: 'جی پی ایس کیپچر کے وقت',
    gpsPending: 'جی پی ایس زیر التواء',
    permissionsRequired: 'اجازت درکار ہے',
    cameraMicPermissionMsg: 'کیمرہ اور مائیکروفون کی اجازت دیں۔',
    clipTooShortTitle: 'ویڈیو بہت مختصر ہے',
    clipTooShortMsg: 'ٹریفک خلاف ورزی کے ثبوت کے لیے ویڈیو کم از کم 5 سیکنڈ لمبی ہونی چاہیے۔',

    // Report Review & Outcome
    reviewReport: 'رپورٹ کا جائزہ لیں',
    evidentiaryAnalysis: 'مصنوعی ذہانت (AI) تجزیہ',
    evidenceDetails: 'شواہد کی تفصیلات',
    manualReviewPrompt: 'افسر سے مینوئل ریویو کروائیں',
    manualReviewFee: 'ریویو فیس: 100 روپے',
    insufficientBalance: 'ناکافی بیلنس',
    payAndSubmit: '100 روپے ادا کر کے جمع کرائیں',
    rechargeWallet: 'والیٹ ریچارج کریں',
    submittedToOfficer: 'افسر کے جائزے کے لیے جمع کر دی گئی',
    recordAnother: 'ایک اور ویڈیو ریکارڈ کریں',
    goToVault: 'والٹ میں دیکھیں',
    goToWallet: 'شہری والیٹ کھولیں',

    // Plate Search
    checkPlateBeforeBuy: 'خریدنے سے پہلے نمبر پلیٹ چیک کریں',
    plateSearchSubtitle: 'سرکاری ایکسائز رجسٹری فی الحال منسلک نہیں ہے۔ یہ اسکرین کلیرنس کی تصدیق نہیں کر سکتی۔',
    backToSafety: 'حفاظت کے صفحے پر واپس جائیں',
    registryPending: 'رجسٹری زیر التواء',
    searchButton: 'رجسٹری میں تلاش کریں',
    platePlaceholder: 'مثال: LEB-24-9182',
    vehicleNumberPlate: 'گاڑی کی نمبر پلیٹ',
    optional: 'اختیاری',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string) => string;
  isUrdu: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (k) => (translations.en as Record<string, string>)[k] ?? k,
  isUrdu: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let alive = true;
    async function initLanguage() {
      try {
        // 1. Try local AsyncStorage first
        const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
        if (alive && saved && (saved === 'en' || saved === 'ur')) {
          setLanguageState(saved as Language);
          return;
        }

        // 2. Try Supabase user profile preference
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user) {
          const { data } = await supabase
            .from('reporter_profiles')
            .select('language')
            .eq('reporter_id', auth.user.id)
            .maybeSingle();

          if (alive && data?.language && (data.language === 'en' || data.language === 'ur')) {
            setLanguageState(data.language as Language);
            await AsyncStorage.setItem(LANG_STORAGE_KEY, data.language).catch(() => {});
          }
        }
      } catch {
        // fallback to default 'en'
      }
    }

    void initLanguage();
    return () => {
      alive = false;
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    void AsyncStorage.setItem(LANG_STORAGE_KEY, lang).catch(() => {});
    // Sync with remote supabase if user is authenticated
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user) {
          await supabase
            .from('reporter_profiles')
            .update({ language: lang })
            .eq('reporter_id', auth.user.id);
        }
      } catch {}
    })();
  };

  const t = (key: TranslationKey | string): string => {
    const dict = translations[language] as Record<string, string> | undefined;
    const fallbackDict = translations.en as Record<string, string>;
    return dict?.[key] ?? fallbackDict[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isUrdu: language === 'ur' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
