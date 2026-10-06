import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'ur';

const translations = {
  en: {
    settings: 'Settings',
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
    priorityReviewLane: 'Priority review lane',
    trustNotice: 'Reports above 90 skip the community queue and go straight to a police officer.',
    thisMonth: '+6 this month',
    approved: 'Approved',
    rejected: 'Rejected',
    accuracy: 'Accuracy',
    highTrust: 'High Trust',
    trustScore: 'Trust score',
    notificationsAlerts: 'Notifications & Alerts',
    backToSettings: 'Back to Settings',
    editProfile: 'Edit Profile',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    emailAddress: 'Email Address',
    saveChanges: 'Save Changes',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    updatePassword: 'Update Password',
    vault: 'Vault',
    wallet: 'Wallet',
    capture: 'Capture',
    safety: 'Safety',
    safetyAndPrivacy: 'Safety and Privacy',
    citizenWallet: 'Citizen Wallet',
    rewardBalance: 'Reward balance',
    withdrawEpay: 'Withdraw to e-Pay',
    dark: 'Dark',
    light: 'Light',
    system: 'System',
    english: 'English',
    urdu: 'اردو (Urdu)',
    vehicleNumberPlate: 'Vehicle plate number',
    optional: 'Optional',
  },
  ur: {
    settings: 'سیٹنگز',
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
    priorityReviewLane: 'ترجیحی جائزہ لین',
    trustNotice: '90 سے زیادہ اسکور والی رپورٹیں کمیونٹی قطار کو چھوڑ کر براہ راست پولیس افسر کو جاتی ہیں۔',
    thisMonth: '+6 اس ماہ',
    approved: 'منظور شدہ',
    rejected: 'مسترد شدہ',
    accuracy: 'درستگی',
    highTrust: 'اعلیٰ اعتماد',
    trustScore: 'اعتماد کا اسکور',
    notificationsAlerts: 'اطلاعات اور الرٹس',
    backToSettings: 'سیٹنگز پر واپس جائیں',
    editProfile: 'پروفائل میں ترمیم کریں',
    fullName: 'مکمل نام',
    phoneNumber: 'فون نمبر',
    emailAddress: 'ای میل ایڈریس',
    saveChanges: 'تبدیلیاں محفوظ کریں',
    currentPassword: 'موجودہ پاس ورڈ',
    newPassword: 'نیا پاس ورڈ',
    confirmNewPassword: 'نئے پاس ورڈ کی تصدیق کریں',
    updatePassword: 'پاس ورڈ تبدیل کریں',
    vault: 'والٹ',
    wallet: 'والیٹ',
    capture: 'کیپچر',
    safety: 'حفاظت',
    safetyAndPrivacy: 'حفاظت اور رازداری',
    citizenWallet: 'شہری والیٹ',
    rewardBalance: 'انعامی رقم',
    withdrawEpay: 'ای پے پر منتقل کریں',
    dark: 'ڈارک',
    light: 'لائٹ',
    system: 'سسٹم',
    english: 'English',
    urdu: 'اردو (Urdu)',
    vehicleNumberPlate: 'گاڑی کی نمبر پلیٹ',
    optional: 'اختیاری',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isUrdu: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (k) => translations.en[k] ?? k,
  isUrdu: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('roadwatch_lang') as Language;
      if (saved && (saved === 'en' || saved === 'ur')) {
        return saved;
      }
    }
    return 'en';
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    if (language === 'ur') {
      document.documentElement.classList.add('font-urdu');
    } else {
      document.documentElement.classList.remove('font-urdu');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('roadwatch_lang', language);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language]?.[key] ?? translations.en[key] ?? key;
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
