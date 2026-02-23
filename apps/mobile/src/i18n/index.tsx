import React, { createContext, useContext, useMemo } from 'react';

type Language = 'it' | 'en';

type I18nContextValue = {
  language: Language;
  locale: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: string | number | Date, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number) => string;
};

const MESSAGES: Record<Language, Record<string, string>> = {
  it: {
    'tab.diagnose': 'Diagnosi',
    'tab.vehicles': 'Veicoli',
    'tab.mechanics': 'Officine',
    'tab.history': 'Storico',
    'tab.profile': 'Profilo',

    'auth.required': 'Email e password sono obbligatorie.',
    'auth.tagline': 'Diagnostica auto con AI',
    'auth.createTitle': 'Crea account',
    'auth.welcomeTitle': 'Bentornato',
    'auth.createSubtitle': 'Unisciti per iniziare a diagnosticare la tua auto',
    'auth.signinSubtitle': 'Accedi per continuare',
    'auth.name': 'Nome',
    'auth.namePlaceholder': 'Il tuo nome',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.wait': 'Attendere…',
    'auth.createCta': 'Crea account',
    'auth.signinCta': 'Accedi',
    'auth.hasAccount': 'Hai già un account? ',
    'auth.noAccount': 'Nessun account? ',
    'auth.signup': 'Registrati',
    'auth.signin': 'Accedi',

    'onboarding.skip': 'Salta',
    'onboarding.next': 'Avanti',
    'onboarding.seePlans': 'Vedi piani',
    'onboarding.welcomeTitle': 'Il tuo esperto\nauto AI',
    'onboarding.welcomeSubtitle': 'Diagnostica qualsiasi problema, trova officine fidate e gestisci i tuoi veicoli in una sola app.',
    'onboarding.diagnosisTitle': 'Diagnosi AI\nin pochi secondi',
    'onboarding.diagnosisSubtitle': 'Descrivi il problema, scatta una foto o registra il rumore. L’AI fa il resto.',
    'onboarding.feature.text': 'Descrizione testuale',
    'onboarding.feature.photo': 'Analisi foto',
    'onboarding.feature.audio': 'Analisi audio',
    'onboarding.mechanicsTitle': 'Supporto esperto\nvicino a te',
    'onboarding.mechanicsSubtitle': 'Trova officine verificate ordinate per distanza. Chiama o apri la mappa in un tap.',
    'onboarding.feature.gps': 'Ricerca GPS',
    'onboarding.feature.distance': 'Distanza e orari',
    'onboarding.feature.call': 'Chiamata rapida',
    'onboarding.garageTitle': 'Il tuo garage\ndigitale',
    'onboarding.garageSubtitle': 'Aggiungi tutti i tuoi veicoli, passa da uno all’altro e mantieni il contesto per l’AI.',
    'onboarding.feature.multiple': 'Multi veicolo',
    'onboarding.feature.fuel': 'Tracciamento carburante',
    'onboarding.feature.select': 'Selezione rapida',

    'pricing.alertTitle': 'Piano Pro — In arrivo',
    'pricing.alertBody': 'Stiamo finalizzando il piano Pro con diagnosi illimitate, analisi foto/audio e molto altro.\n\nPer ora resta su Free: ti avviseremo al lancio.',
    'pricing.alertOk': 'Ho capito',
    'pricing.badge': 'PIANI',
    'pricing.title': 'Scegli il tuo piano',
    'pricing.subtitle': 'Inizia gratis. Passa a Pro quando vuoi più potenza.',
    'pricing.perMonth': '/mese',
    'pricing.freeDaily': '5 diagnosi · ogni giorno',
    'pricing.dailySuffixFree': ' (5/giorno)',
    'pricing.freeCta': 'Continua con Free',
    'pricing.popular': 'PIÙ SCELTO',
    'pricing.trial': 'Prova gratuita 7 giorni · disdici quando vuoi',
    'pricing.dailySuffixPro': ' (illimitate)',
    'pricing.proCta': 'Inizia prova gratuita 7 giorni',
    'pricing.reassurance.noCard': 'Nessuna carta richiesta per Free',
    'pricing.reassurance.cancel': 'Disdici Pro quando vuoi',
    'pricing.reassurance.secure': 'Pagamenti sicuri',
    'pricing.feature.aiText': 'Diagnosi AI testuale',
    'pricing.feature.vehicles': 'Gestione veicoli',
    'pricing.feature.mechanics': 'Ricerca officine',
    'pricing.feature.daily': 'Diagnosi giornaliere',
    'pricing.feature.photo': 'Analisi foto',
    'pricing.feature.audio': 'Analisi audio',
    'pricing.feature.history': 'Storico diagnosi',
    'pricing.feature.priority': 'Priorità AI',
    'pricing.feature.export': 'Export report',

    'paywall.perk.unlimited': 'Diagnosi giornaliere illimitate',
    'paywall.perk.photoAudio': 'Analisi foto e audio',
    'paywall.perk.history': 'Storico diagnosi completo',
    'paywall.perk.priority': 'Risposte AI prioritarie',
    'paywall.perk.export': 'Esporta e condividi report',
    'paywall.titlePdf': 'Report PDF · Pro',
    'paywall.titleQuota': 'Limite giornaliero raggiunto',
    'paywall.subtitlePdf': 'Il report PDF completo da inviare al meccanico\nè disponibile con il piano Pro.',
    'paywall.subtitleQuota': 'Hai usato tutte le {limit} diagnosi gratuite di oggi.\nIl limite si azzera a mezzanotte.',
    'paywall.unlock': 'Sblocca con Pro',
    'paywall.upgrade': 'Passa a Pro · €9.99/mese',
    'paywall.continueNoPdf': 'Continua senza PDF',
    'paywall.backTomorrow': 'Torna domani',

    'history.justNow': 'ora',
    'history.minAgo': '{n}m fa',
    'history.hourAgo': '{n}h fa',
    'history.dayAgo': '{n}g fa',
    'history.unknownVehicle': 'Veicolo sconosciuto',
    'history.unknownIssue': 'Problema non disponibile',
    'history.generating': 'Generazione…',
    'history.title': 'Storico',
    'history.subtitle': 'Diagnosi passate',
    'history.emptyTitle': 'Nessuna diagnosi',
    'history.emptySubtitle': 'Qui vedrai lo storico delle tue diagnosi',

    'profile.errorTitle': 'Errore',
    'profile.errorSave': 'Impossibile salvare il nome.',
    'profile.signoutTitle': 'Disconnetti',
    'profile.signoutBody': 'Vuoi davvero uscire?',
    'profile.cancel': 'Annulla',
    'profile.signout': 'Disconnetti',
    'profile.title': 'Profilo',
    'profile.driver': 'Utente',
    'profile.vehicles': 'Veicoli',
    'profile.verified': 'Verificato',
    'profile.displayName': 'Nome visualizzato',
    'profile.namePlaceholder': 'Il tuo nome',
    'profile.saving': 'Salvataggio…',
    'profile.saveName': 'Salva nome',
    'profile.theme': 'Tema',

    'mechanics.permission': 'Autorizzazione alla posizione necessaria per trovare officine vicine.',
    'mechanics.empty': 'Nessuna officina trovata nel raggio di 10 km. Prova un\'altra zona.',
    'mechanics.overpass': 'Servizio mappe temporaneamente non disponibile. Riprova tra qualche minuto.',
    'mechanics.title': 'Officine vicine',
    'mechanics.subtitleAll': 'Tutte le officine nelle vicinanze',
    'mechanics.lastDiagnosis': 'Ultima diagnosi RepAIr',
    'mechanics.searching': 'Ricerca in corso…',
    'mechanics.search': 'Cerca officine',
    'mechanics.searchOsm': 'Ricerca su OpenStreetMap…',
    'mechanics.found': '{n} officine trovate',
    'mechanics.verifiedCount': '{n} verificate da RepAIro',
    'mechanics.map': 'Mappa',
    'mechanics.call': 'Chiama',
    'mechanics.website': 'Sito',
    'mechanics.requestQuote': 'Richiedi preventivo',
    'mechanics.sendReport': 'Invia report',
    'mechanics.quoteTitle': 'Richiedi preventivo',
    'mechanics.share': 'Condividi',
    'mechanics.email': 'Email',
    'mechanics.cancel': 'Annulla',
    'mechanics.quoteSubject': 'Richiesta preventivo — {name}',
    'mechanics.quoteHello': 'Buongiorno,',
    'mechanics.quoteVehicle': 'Vi contatto riguardo al mio veicolo: {vehicle}.',
    'mechanics.quoteDiagnosis': 'Diagnosi RepAIr: {issue}',
    'mechanics.quoteBody': 'Vorrei richiedere un preventivo per la riparazione. Potreste indicarmi disponibilità e costi indicativi?',
    'mechanics.quoteThanks': 'Grazie mille.',

    'vehicles.required': 'Marca, modello e anno sono obbligatori.',
    'vehicles.title': 'Il mio garage',
    'vehicles.registered': '{n} veicoli registrati',
    'vehicles.addVehicle': 'Aggiungi veicolo',
    'vehicles.make': 'Marca',
    'vehicles.model': 'Modello',
    'vehicles.year': 'Anno',
    'vehicles.km': 'Km',
    'vehicles.adding': 'Aggiunta…',
    'vehicles.addCta': 'Aggiungi veicolo',
    'vehicles.yourVehicles': 'I tuoi veicoli',
    'vehicles.active': 'Attivo',
    'customization.title': 'Personalizzazione',
    'customization.subtitle': 'Preset automotive',

    'common.urgency.low': 'bassa',
    'common.urgency.medium': 'media',
    'common.urgency.high': 'alta',
  },
  en: {
    'tab.diagnose': 'Diagnose',
    'tab.vehicles': 'Vehicles',
    'tab.mechanics': 'Mechanics',
    'tab.history': 'History',
    'tab.profile': 'Profile',

    'auth.required': 'Email and password are required.',
    'auth.tagline': 'AI-powered car diagnostics',
    'auth.createTitle': 'Create account',
    'auth.welcomeTitle': 'Welcome back',
    'auth.createSubtitle': 'Join to start diagnosing your car',
    'auth.signinSubtitle': 'Sign in to continue',
    'auth.name': 'Name',
    'auth.namePlaceholder': 'Your name',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.wait': 'Please wait…',
    'auth.createCta': 'Create account',
    'auth.signinCta': 'Sign in',
    'auth.hasAccount': 'Already have an account? ',
    'auth.noAccount': 'No account? ',
    'auth.signup': 'Sign up',
    'auth.signin': 'Sign in',

    'onboarding.skip': 'Skip',
    'onboarding.next': 'Next',
    'onboarding.seePlans': 'See plans',
    'onboarding.welcomeTitle': 'Your AI\nCar Expert',
    'onboarding.welcomeSubtitle': 'Diagnose any issue, find trusted mechanics, and manage your fleet in one app.',
    'onboarding.diagnosisTitle': 'AI Diagnosis\nin Seconds',
    'onboarding.diagnosisSubtitle': 'Describe the problem, snap a photo, or record the noise. AI does the rest.',
    'onboarding.feature.text': 'Text description',
    'onboarding.feature.photo': 'Photo analysis',
    'onboarding.feature.audio': 'Audio analysis',
    'onboarding.mechanicsTitle': 'Expert Help\nNearby',
    'onboarding.mechanicsSubtitle': 'Find vetted workshops sorted by distance. Call or open map in one tap.',
    'onboarding.feature.gps': 'GPS search',
    'onboarding.feature.distance': 'Distance & hours',
    'onboarding.feature.call': 'One-tap call',
    'onboarding.garageTitle': 'Your Digital\nGarage',
    'onboarding.garageSubtitle': 'Add your vehicles, switch instantly, and keep context for AI.',
    'onboarding.feature.multiple': 'Multiple vehicles',
    'onboarding.feature.fuel': 'Fuel tracking',
    'onboarding.feature.select': 'Quick select',

    'pricing.alertTitle': 'Pro Plan — Coming Soon',
    'pricing.alertBody': 'We are finalizing Pro with unlimited diagnoses, photo/audio analysis, and more.\n\nStay on Free for now, we will notify you at launch.',
    'pricing.alertOk': 'Got it',
    'pricing.badge': 'PRICING',
    'pricing.title': 'Choose your plan',
    'pricing.subtitle': 'Start free. Upgrade when you need more power.',
    'pricing.perMonth': '/month',
    'pricing.freeDaily': '5 diagnoses · every day',
    'pricing.dailySuffixFree': ' (5/day)',
    'pricing.freeCta': 'Continue for Free',
    'pricing.popular': 'MOST POPULAR',
    'pricing.trial': '7-day free trial · cancel anytime',
    'pricing.dailySuffixPro': ' (unlimited)',
    'pricing.proCta': 'Start 7-Day Free Trial',
    'pricing.reassurance.noCard': 'No card required for Free',
    'pricing.reassurance.cancel': 'Cancel Pro anytime',
    'pricing.reassurance.secure': 'Secure payments',
    'pricing.feature.aiText': 'AI text diagnosis',
    'pricing.feature.vehicles': 'Vehicle management',
    'pricing.feature.mechanics': 'Mechanic finder',
    'pricing.feature.daily': 'Daily diagnoses',
    'pricing.feature.photo': 'Photo analysis',
    'pricing.feature.audio': 'Audio analysis',
    'pricing.feature.history': 'Diagnosis history',
    'pricing.feature.priority': 'Priority AI',
    'pricing.feature.export': 'Export reports',

    'paywall.perk.unlimited': 'Unlimited daily diagnoses',
    'paywall.perk.photoAudio': 'Photo and audio analysis',
    'paywall.perk.history': 'Full diagnosis history',
    'paywall.perk.priority': 'Priority AI responses',
    'paywall.perk.export': 'Export and share reports',
    'paywall.titlePdf': 'PDF Report · Pro',
    'paywall.titleQuota': 'Daily limit reached',
    'paywall.subtitlePdf': 'The full PDF report to send to your mechanic\nis available with Pro.',
    'paywall.subtitleQuota': 'You used all {limit} free diagnoses today.\nLimit resets at midnight.',
    'paywall.unlock': 'Unlock with Pro',
    'paywall.upgrade': 'Upgrade to Pro · €9.99/mo',
    'paywall.continueNoPdf': 'Continue without PDF',
    'paywall.backTomorrow': 'Come back tomorrow',

    'history.justNow': 'just now',
    'history.minAgo': '{n}m ago',
    'history.hourAgo': '{n}h ago',
    'history.dayAgo': '{n}d ago',
    'history.unknownVehicle': 'Unknown vehicle',
    'history.unknownIssue': 'Unknown issue',
    'history.generating': 'Generating…',
    'history.title': 'History',
    'history.subtitle': 'Past diagnoses',
    'history.emptyTitle': 'No diagnoses yet',
    'history.emptySubtitle': 'Your diagnosis history will appear here',

    'profile.errorTitle': 'Error',
    'profile.errorSave': 'Could not save your name.',
    'profile.signoutTitle': 'Sign out',
    'profile.signoutBody': 'Are you sure you want to sign out?',
    'profile.cancel': 'Cancel',
    'profile.signout': 'Sign out',
    'profile.title': 'Profile',
    'profile.driver': 'Driver',
    'profile.vehicles': 'Vehicles',
    'profile.verified': 'Verified',
    'profile.displayName': 'Display Name',
    'profile.namePlaceholder': 'Your name',
    'profile.saving': 'Saving…',
    'profile.saveName': 'Save name',
    'profile.theme': 'Theme',

    'mechanics.permission': 'Location permission is required to find nearby workshops.',
    'mechanics.empty': 'No workshops found within 10 km. Try another area.',
    'mechanics.overpass': 'Map service temporarily unavailable. Please try again in a few minutes.',
    'mechanics.title': 'Nearby workshops',
    'mechanics.subtitleAll': 'All workshops near you',
    'mechanics.lastDiagnosis': 'Latest RepAIr diagnosis',
    'mechanics.searching': 'Searching…',
    'mechanics.search': 'Search workshops',
    'mechanics.searchOsm': 'Searching OpenStreetMap…',
    'mechanics.found': '{n} workshops found',
    'mechanics.verifiedCount': '{n} verified by RepAIro',
    'mechanics.map': 'Map',
    'mechanics.call': 'Call',
    'mechanics.website': 'Website',
    'mechanics.requestQuote': 'Request quote',
    'mechanics.sendReport': 'Send report',
    'mechanics.quoteTitle': 'Request quote',
    'mechanics.share': 'Share',
    'mechanics.email': 'Email',
    'mechanics.cancel': 'Cancel',
    'mechanics.quoteSubject': 'Quote request — {name}',
    'mechanics.quoteHello': 'Hello,',
    'mechanics.quoteVehicle': 'I am contacting you about my vehicle: {vehicle}.',
    'mechanics.quoteDiagnosis': 'RepAIr diagnosis: {issue}',
    'mechanics.quoteBody': 'I would like to request a repair quote. Could you share availability and indicative costs?',
    'mechanics.quoteThanks': 'Thank you.',

    'vehicles.required': 'Make, model and year are required.',
    'vehicles.title': 'My garage',
    'vehicles.registered': '{n} registered vehicles',
    'vehicles.addVehicle': 'Add vehicle',
    'vehicles.make': 'Make',
    'vehicles.model': 'Model',
    'vehicles.year': 'Year',
    'vehicles.km': 'Km',
    'vehicles.adding': 'Adding…',
    'vehicles.addCta': 'Add vehicle',
    'vehicles.yourVehicles': 'Your vehicles',
    'vehicles.active': 'Active',
    'customization.title': 'Customization',
    'customization.subtitle': 'Automotive presets',

    'common.urgency.low': 'low',
    'common.urgency.medium': 'medium',
    'common.urgency.high': 'high',
  }
};

function detectDeviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
  } catch {
    return 'en-US';
  }
}

function normalizeLanguage(locale: string): Language {
  const language = locale.toLowerCase().split('-')[0];
  return language === 'it' ? 'it' : 'en';
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''));
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = detectDeviceLocale();
  const language = normalizeLanguage(locale);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, params?: Record<string, string | number>) => {
      const message = MESSAGES[language][key] ?? MESSAGES.en[key] ?? key;
      return interpolate(message, params);
    };

    const formatDate = (date: string | number | Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(locale, options).format(new Date(date));

    const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);

    return { language, locale, t, formatDate, formatNumber };
  }, [language, locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return ctx;
}
