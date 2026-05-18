import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './lib/supabase';
import { 
  MessageSquare, ShieldAlert, FileText, LayoutDashboard,
  Search, Bell, User, Send, Cpu, UserCheck, 
  Moon, Sun, Download, HelpCircle, AlertCircle,
  FolderOpen, Copy, Check, Play
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import Layout from './components/Layout';

const translations = {
  fr: {
    sidebar: {
      dashboard: "Tableau de bord",
      messages: "Messages",
      claims: "Sinistres",
      quotes: "Devis",
      files: "Fichiers",
      help: "Aide",
      settings: "Paramètres",
      newPolicy: "Nouveau dossier",
      advisorPortal: "Portail Conseiller"
    },
    stats: {
      totalQuotes: "Total Devis",
      pendingQuotes: "En attente",
      inProgressQuotes: "En cours",
      sentQuotes: "Envoyés",
      acceptedQuotes: "Acceptés",
      rejectedQuotes: "Refusés",
      totalClaims: "Total Sinistres",
      newClaims: "Nouveaux",
      processingClaims: "En cours",
      resolvedClaims: "Clôturés"
    },
    buttons: {
      export: "Exporter",
      exportAll: "Exporter tout",
      exportExcel: "Exporter (Excel)",
      exportReport: "Exporter Rapport",
      aiAnalyst: "Vue Analyste AI",
      save: "Sauvegarder",
      print: "Imprimer",
      printCertificate: "Imprimer attestation",
      copy: "Copier",
      copied: "Copié !",
      back: "Retour",
      backToQuotes: "← Retour aux devis",
      backToClaims: "← Retour aux sinistres",
      backToClients: "Retour aux clients",
      viewConversation: "Voir la conversation",
      close: "Fermer"
    },
    status: {
      pending: "En attente",
      in_progress: "En cours",
      processing: "En cours",
      sent: "Envoyé",
      accepted: "Accepté",
      converted: "Accepté",
      resolved: "Résolu",
      rejected: "Refusé",
      cancelled: "Annulé"
    },
    columns: {
      client: "Client",
      type: "Type d'assurance",
      status: "Statut",
      date: "Date",
      actions: "Actions",
      reference: "Référence",
      occurrence: "Occurrence",
      description: "Description courte",
      details: "Détails"
    },
    dashboard: {
      welcome: "Bienvenue, voici un aperçu de vos performances aujourd'hui.",
      aiMessages: "Messages IA ce mois",
      active: "Actif",
      pendingQuotes: "Devis en cours",
      pendingClaims: "Sinistres en cours",
      urgentConv: "Conversations urgentes",
      recentActivity: "Activité Récente des Clients",
      messagesActivity: "Activité des Messages (7 Derniers Jours)",
      aiCount: "Messages IA",
      userCount: "Utilisateur",
      urgentBadge: "URGENT (>30m)",
      aiBadge: "Mode IA",
      advisorBadge: "Mode Conseiller",
      noRecentActivity: "Aucune activité récente à afficher.",
      statsSummary: "Résumé des Statistiques du Mois",
      analystTitle: "Analyse des Performances Mensuelles",
      analystIntro: "Voici les analyses automatiques générées par l'IA d'Assuria pour ce mois-ci :",
      analystBullet1: "📈 **Taux de Conversion des Devis** : Les demandes de devis sont converties à hauteur de 68% ce mois-ci, soit une hausse de 5% grâce aux réponses instantanées de l'IA.",
      analystBullet2: "⏱️ **Temps Moyen de Traitement des Sinistres** : Réduit à 4,2 heures par dossier grâce à la collecte automatique des pièces justificatives sur WhatsApp.",
      analystBullet3: "🤖 **Autonomie de l'IA** : L'assistant virtuel AssurIA a géré de manière autonome 84% des premiers contacts sans intervention d'un conseiller humain."
    },
    files: {
      title: "Gestion des Fichiers Clients",
      subtitle: "Consultez et inspectez les pièces justificatives envoyées par vos assurés.",
      noClients: "Aucun client avec fichiers",
      totalFiles: "fichiers envoyés",
      filesShared: "Fichiers partagés",
      personalInfo: "Informations Personnelles",
      fullName: "Nom complet",
      birthDate: "Date de naissance",
      cin: "Numéro CIN",
      address: "Adresse de résidence",
      notProvided: "Non renseigné",
      insuredAssets: "Biens Assurés",
      vehicle: "Véhicule",
      brand: "Marque",
      model: "Modèle",
      year: "Année",
      plate: "Plaque d'immatriculation",
      vin: "Code VIN",
      noAssets: "Aucun bien répertorié dans ce profil.",
      additionalData: "Données Complémentaires",
      allMedias: "Pièces jointes et Médias",
      tabImages: "Images & Photos",
      tabAudios: "Messages Vocaux",
      tabDocs: "Documents PDF / Word",
      noImages: "Aucune image envoyée par ce client.",
      noAudios: "Aucun message vocal enregistré.",
      noDocs: "Aucun document partagé.",
      ocrAi: "Transcription / Analyse AI :",
      audioCopy: "Copier la transcription",
      docSummary: "Résumé de l'IA :"
    },
    settingsTab: {
      title: "Paramètres Globaux",
      subtitle: "Configurez le prompt système de l'IA et la langue du tableau de bord.",
      aiPromptLabel: "Prompt Système d'AssurIA",
      aiPromptDesc: "Ce prompt définit le comportement, le ton et les règles de l'IA d'Assuria sur WhatsApp.",
      languageSection: "Langue du Tableau de Bord",
      languageDesc: "Sélectionnez votre langue de préférence pour l'interface.",
      agentSectionTitle: "Agent IA",
      agentNameLabel: "Nom de votre assistant IA",
      agentNameDesc: "Ce nom sera utilisé par l'IA pour se présenter aux clients sur WhatsApp",
      agentNamePlaceholder: "Ex: AssurIA, Assistant Imtiaz, Bot Wafaassur...",
      welcomeMsgLabel: "Message d'accueil (premier contact avec un nouveau client)",
      welcomeMsgDesc: "Ce message est envoyé automatiquement lors du tout premier échange avec un nouveau client",
      welcomeMsgPlaceholder: "Ex: Bonjour ! Je suis AssurIA, l'assistant de votre cabinet...",
      commStyleLabel: "Style de communication",
      numberedOptions: "Proposer les options en liste numérotée",
      formal: "Vouvoiement (ton formel)",
      informal: "Tutoiement (ton informel et chaleureux)",
      autoLanguage: "Détecter automatiquement la langue du client",
      onlyFr: "Répondre uniquement en français",
      onlyAr: "Répondre uniquement en arabe",
      customInstructionsLabel: "Instructions personnalisées pour votre agent IA",
      customInstructionsDesc: "Ces instructions personnalisent le comportement de votre agent. Les règles techniques de gestion des dossiers sont gérées automatiquement par le système et ne peuvent pas être modifiées ici.",
      customInstructionsPlaceholder: "Écrivez ici toutes les instructions spécifiques que vous souhaitez donner à votre agent. Par exemple : Toujours terminer chaque message par nos coordonnées. Ne jamais mentionner les tarifs. Toujours proposer un rappel téléphonique si le client hésite...",
      saveButton: "Sauvegarder",
      saveSuccess: "Paramètres de l'agent IA mis à jour.",
      saveError: "Erreur lors de la mise à jour des paramètres."
    },
    helpTab: {
      title: "Centre d'Aide",
      faqTitle: "Foire Aux Questions",
      q1: "Comment passer en mode Conseiller ?",
      a1: "Dans l'onglet 'Messages', sélectionnez une conversation puis utilisez le bouton en haut à droite (Mode IA / Conseiller). Une fois en mode Conseiller, l'IA ne répondra plus automatiquement à ce client.",
      q2: "Comment fonctionne la collecte de fichiers ?",
      a2: "Dès qu'un client envoie une image (ex: carte grise) ou un document PDF sur WhatsApp, notre IA l'analyse instantanément avec Claude Vision et l'associe à la fiche du client dans l'onglet 'Fichiers'."
    },
    modalNewPolicy: {
      title: "Créer un Nouveau Dossier",
      phoneLabel: "Numéro de téléphone du client",
      phonePlaceholder: "Ex: 212661234567",
      typeLabel: "Type de dossier",
      typeQuote: "Demande de Devis",
      typeClaim: "Déclaration de Sinistre",
      descLabel: "Description ou informations initiales",
      descPlaceholder: "Ex: Devis auto pour Dacia Logan ou Sinistre bris de glace...",
      cancel: "Annuler",
      create: "Créer le dossier",
      successQuote: "Nouveau devis créé !",
      successClaim: "Nouveau sinistre créé !",
      error: "Une erreur est survenue lors de la création."
    },
    modalAttestation: {
      title: "Aperçu de l'Attestation Officielle",
      subtitle: "Attestation Provisoire d'Assurance",
      headerAgency: "ASSURIA MOROCCO S.A.",
      headerAddress: "Angle Boulevard Zerktouni & Rue Al Massira, Casablanca, Maroc",
      subject: "ATTESTATION PROVISOIRE DE COUVERTURE",
      body1: "Nous soussignés, Assuria S.A., certifions par la présente que le client ci-dessous désigné est couvert à titre provisoire au titre des garanties de notre compagnie conformément aux conditions générales de la police.",
      insuredName: "Nom de l'Assuré",
      insuredCin: "CIN / Identité",
      insuredAddress: "Adresse de l'Assuré",
      detailsTitle: "Description du Risque & Dossier",
      folderRef: "Référence Dossier",
      folderType: "Type d'assurance",
      folderDate: "Date de Déclaration",
      folderStatus: "Statut Actuel",
      footerNotice: "Cette attestation provisoire est valable pour une durée de 30 jours à compter de sa date d'émission. Elle ne peut être utilisée qu'à titre de justification temporaire et sera remplacée par la police définitive après finalisation administrative.",
      signatureTitle: "Pour la Compagnie Assuria S.A.",
      signatureStamp: "Direction des Risques & Sinistres\n[Signature Électronique Agréée]",
      copySuccess: "Attestation copiée dans le presse-papier !"
    }
  },
  en: {
    sidebar: {
      dashboard: "Dashboard",
      messages: "Messages",
      claims: "Claims",
      quotes: "Quotes",
      files: "Files",
      help: "Help",
      settings: "Settings",
      newPolicy: "New Folder",
      advisorPortal: "Advisor Portal"
    },
    stats: {
      totalQuotes: "Total Quotes",
      pendingQuotes: "Pending",
      inProgressQuotes: "In Progress",
      sentQuotes: "Sent",
      acceptedQuotes: "Accepted",
      rejectedQuotes: "Rejected",
      totalClaims: "Total Claims",
      newClaims: "New",
      processingClaims: "In Progress",
      resolvedClaims: "Resolved"
    },
    buttons: {
      export: "Export",
      exportAll: "Export All",
      exportExcel: "Export (Excel)",
      exportReport: "Export Report",
      aiAnalyst: "AI Analyst View",
      save: "Save Settings",
      print: "Print",
      printCertificate: "Print Certificate",
      copy: "Copy",
      copied: "Copied!",
      back: "Back",
      backToQuotes: "← Back to Quotes",
      backToClaims: "← Back to Claims",
      backToClients: "Back to Clients",
      viewConversation: "View Conversation",
      close: "Close"
    },
    status: {
      pending: "Pending",
      in_progress: "In Progress",
      processing: "Processing",
      sent: "Sent",
      accepted: "Accepted",
      converted: "Accepted",
      resolved: "Resolved",
      rejected: "Rejected",
      cancelled: "Cancelled"
    },
    columns: {
      client: "Client",
      type: "Insurance Type",
      status: "Status",
      date: "Date",
      actions: "Actions",
      reference: "Reference",
      occurrence: "Occurrence",
      description: "Short Description",
      details: "Details"
    },
    dashboard: {
      welcome: "Welcome, here is an overview of your performances today.",
      aiMessages: "AI Messages this month",
      active: "Active",
      pendingQuotes: "Active Quotes",
      pendingClaims: "Active Claims",
      urgentConv: "Urgent Chats",
      recentActivity: "Recent Customer Activity",
      messagesActivity: "Message Activity (Last 7 Days)",
      aiCount: "AI Messages",
      userCount: "User",
      urgentBadge: "URGENT (>30m)",
      aiBadge: "AI Mode",
      advisorBadge: "Advisor Mode",
      noRecentActivity: "No recent activity to display.",
      statsSummary: "Monthly Statistics Summary",
      analystTitle: "Monthly Performance Analysis",
      analystIntro: "Here are the automated insights generated by Assuria's AI for this month:",
      analystBullet1: "📈 **Quotes Conversion Rate**: Requests are converted at 68% this month, representing a 5% increase due to instant AI replies.",
      analystBullet2: "⏱️ **Average Claims Processing Time**: Reduced to 4.2 hours per case due to automatic document collection on WhatsApp.",
      analystBullet3: "🤖 **AI Autonomy**: The virtual assistant AssurIA autonomously managed 84% of first contacts without advisor intervention."
    },
    files: {
      title: "Client Files Management",
      subtitle: "Consult and inspect supporting documents sent by your clients.",
      noClients: "No clients with files",
      totalFiles: "files sent",
      filesShared: "Shared Files",
      personalInfo: "Personal Information",
      fullName: "Full Name",
      birthDate: "Date of Birth",
      cin: "CIN Number",
      address: "Home Address",
      notProvided: "Not provided",
      insuredAssets: "Insured Assets",
      vehicle: "Vehicle",
      brand: "Brand",
      model: "Model",
      year: "Year",
      plate: "License Plate",
      vin: "VIN Code",
      noAssets: "No assets listed in this profile.",
      additionalData: "Additional Data",
      allMedias: "Attachments & Media",
      tabImages: "Images & Photos",
      tabAudios: "Voice Messages",
      tabDocs: "PDF / Word Documents",
      noImages: "No images sent by this client.",
      noAudios: "No voice messages recorded.",
      noDocs: "No documents shared.",
      ocrAi: "OCR / AI Transcription:",
      audioCopy: "Copy Transcription",
      docSummary: "AI Summary:"
    },
    settingsTab: {
      title: "Global Settings",
      subtitle: "Configure the AI system prompt and dashboard language.",
      aiPromptLabel: "AssurIA System Prompt",
      aiPromptDesc: "This prompt defines Assuria's AI behavior, tone, and rules on WhatsApp.",
      languageSection: "Dashboard Language",
      languageDesc: "Select your preferred language for the interface.",
      agentSectionTitle: "AI Agent",
      agentNameLabel: "Name of your AI assistant",
      agentNameDesc: "This name will be used by the AI to introduce itself to clients on WhatsApp",
      agentNamePlaceholder: "Ex: AssurIA, Imtiaz Assistant, Wafaassur Bot...",
      welcomeMsgLabel: "Welcome message (first contact with a new client)",
      welcomeMsgDesc: "This message is automatically sent during the very first exchange with a new client",
      welcomeMsgPlaceholder: "Ex: Hello! I am AssurIA, your agency's assistant...",
      commStyleLabel: "Communication style",
      numberedOptions: "Propose options as a numbered list",
      formal: "Use formal address (vouvoiement)",
      informal: "Use warm and informal tone (tutoiement)",
      autoLanguage: "Automatically detect client's language",
      onlyFr: "Reply in French only",
      onlyAr: "Reply in Arabic only",
      customInstructionsLabel: "Custom instructions for your AI agent",
      customInstructionsDesc: "These instructions personalize your agent's behavior. Technical file management rules are handled automatically by the system and cannot be edited here.",
      customInstructionsPlaceholder: "Write any specific instructions you want to give your agent. For example: Always end each message with our contact info. Never mention prices. Always offer a call back if the client hesitates...",
      saveButton: "Save Settings",
      saveSuccess: "AI Agent settings updated successfully.",
      saveError: "Error updating settings."
    },
    helpTab: {
      title: "Help Center",
      faqTitle: "Frequently Asked Questions",
      q1: "How to switch to Advisor mode?",
      a1: "In the 'Messages' tab, select a conversation and use the toggle at the top right (AI / Advisor Mode). Once in Advisor mode, the AI will not reply automatically to this client.",
      q2: "How does document collection work?",
      a2: "When a client sends an image (e.g., car registration) or a PDF on WhatsApp, our AI instantly analyzes it with Claude Vision and links it to the client's file under the 'Files' tab."
    },
    modalNewPolicy: {
      title: "Create New Folder",
      phoneLabel: "Client phone number",
      phonePlaceholder: "E.g.: 212661234567",
      typeLabel: "Folder Type",
      typeQuote: "Quote Request",
      typeClaim: "Claim Declaration",
      descLabel: "Description or initial details",
      descPlaceholder: "E.g.: Auto quote for Dacia Logan or windshield glass break claim...",
      cancel: "Cancel",
      create: "Create Folder",
      successQuote: "New quote created!",
      successClaim: "New claim created!",
      error: "An error occurred during creation."
    },
    modalAttestation: {
      title: "Official Attestation Preview",
      subtitle: "Provisional Certificate of Insurance",
      headerAgency: "ASSURIA MOROCCO S.A.",
      headerAddress: "Angle Boulevard Zerktouni & Rue Al Massira, Casablanca, Morocco",
      subject: "PROVISIONAL COVERAGE CERTIFICATE",
      body1: "We, the undersigned, Assuria S.A., hereby certify that the client designated below is covered on a provisional basis under the warranties of our company in accordance with the general policy conditions.",
      insuredName: "Insured Name",
      insuredCin: "CIN / Identity",
      insuredAddress: "Insured Address",
      detailsTitle: "Risk & Case Details",
      folderRef: "Case Reference",
      folderType: "Insurance Type",
      folderDate: "Declaration Date",
      folderStatus: "Current Status",
      footerNotice: "This provisional certificate is valid for 30 days from its issuance date. It must only be used as temporary justification and will be replaced by the final policy upon administrative finalization.",
      signatureTitle: "For the Company Assuria S.A.",
      signatureStamp: "Risk & Claims Department\n[Approved Electronic Signature]",
      copySuccess: "Attestation copied to clipboard!"
    }
  },
  ar: {
    sidebar: {
      dashboard: "لوحة القيادة",
      messages: "الرسائل",
      claims: "الحوادث والتعويضات",
      quotes: "طلبات التسعير",
      files: "الملفات",
      help: "المساعدة",
      settings: "الإعدادات",
      newPolicy: "ملف جديد",
      advisorPortal: "بوابة المستشار"
    },
    stats: {
      totalQuotes: "إجمالي طلبات التسعير",
      pendingQuotes: "في الانتظار",
      inProgressQuotes: "قيد المعالجة",
      sentQuotes: "تم الإرسال",
      acceptedQuotes: "مقبول",
      rejectedQuotes: "مرفوض",
      totalClaims: "إجمالي الحوادث والتعويضات",
      newClaims: "جديد",
      processingClaims: "قيد المعالجة",
      resolvedClaims: "تم الحل"
    },
    buttons: {
      export: "تصدير",
      exportAll: "تصدير الكل",
      exportExcel: "تصدير (إكسل)",
      exportReport: "تصدير التقرير",
      aiAnalyst: "تحليل الذكاء الاصطناعي",
      save: "حفظ الإعدادات",
      print: "طباعة",
      printCertificate: "طباعة شهادة",
      copy: "نسخ",
      copied: "تم النسخ!",
      back: "رجوع",
      backToQuotes: "← العودة للتسعيرات",
      backToClaims: "← العودة للحوادث",
      backToClients: "العودة للعملاء",
      viewConversation: "عرض المحادثة",
      close: "إغلاق"
    },
    status: {
      pending: "في الانتظار",
      in_progress: "قيد المعالجة",
      processing: "قيد المعالجة",
      sent: "تم الإرسال",
      accepted: "مقبول",
      converted: "مقبول",
      resolved: "تم الحل",
      rejected: "مرفوض",
      cancelled: "ملغى"
    },
    columns: {
      client: "العميل",
      type: "نوع التأمين",
      status: "الحالة",
      date: "التاريخ",
      actions: "الإجراءات",
      reference: "المرجع",
      occurrence: "العدد",
      description: "وصف قصير",
      details: "التفاصيل"
    },
    dashboard: {
      welcome: "مرحباً، إليك نظرة عامة على أدائك اليوم.",
      aiMessages: "رسائل الذكاء الاصطناعي هذا الشهر",
      active: "نشط",
      pendingQuotes: "طلبات تسعير نشطة",
      pendingClaims: "حوادث قيد المعالجة",
      urgentConv: "محادثات عاجلة",
      recentActivity: "النشاط الأخير للعملاء",
      messagesActivity: "نشاط الرسائل (آخر 7 أيام)",
      aiCount: "رسائل الذكاء الاصطناعي",
      userCount: "المستخدم",
      urgentBadge: "عاجل (>30د)",
      aiBadge: "وضع الذكاء الاصطناعي",
      advisorBadge: "وضع المستشار",
      noRecentActivity: "لا توجد أنشطة أخيرة لعرضها.",
      statsSummary: "ملخص الإحصاءات الشهرية",
      analystTitle: "تحليل الأداء الشهري بالذكاء الاصطناعي",
      analystIntro: "إليك التحليلات التلقائية التي أنشأها الذكاء الاصطناعي لـ Assuria لهذا الشهر :",
      analystBullet1: "📈 **معدل تحويل طلبات التسعير**: تم تحويل 68% من الطلبات هذا الشهر، بزيادة قدرها 5% بفضل الردود الفورية للذكاء الاصطناعي.",
      analystBullet2: "⏱️ **متوسط وقت معالجة الحوادث**: انخفض إلى 4.2 ساعات لكل ملف بفضل الجمع التلقائي للمستندات عبر واتساب.",
      analystBullet3: "🤖 **استقلالية الذكاء الاصطناعي**: أدار المساعد الافتراضي AssurIA بشكل مستقل 84% من الاتصالات الأولى دون تدخل من مستشار بشري."
    },
    files: {
      title: "إدارة ملفات العملاء",
      subtitle: "اطلع وفحص المستندات والملفات الثبوتية المرسلة من قبل المؤمنين.",
      noClients: "لا يوجد عملاء لديهم ملفات",
      totalFiles: "ملفات مرسلة",
      filesShared: "الملفات المشتركة",
      personalInfo: "المعلومات الشخصية",
      fullName: "الاسم الكامل",
      birthDate: "تاريخ الميلاد",
      cin: "رقم البطاقة الوطنية CIN",
      address: "عنوان الإقامة",
      notProvided: "غير متوفر",
      insuredAssets: "الممتلكات المؤمنة",
      vehicle: "السيارة",
      brand: "الشركة المصنعة",
      model: "الموديل",
      year: "السنة",
      plate: "لوحة الترخيص",
      vin: "رمز VIN",
      noAssets: "لا توجد ممتلكات مسجلة في هذا الملف.",
      additionalData: "بيانات إضافية",
      allMedias: "المرفقات والوسائط",
      tabImages: "الصور واللقطات",
      tabAudios: "الرسائل الصوتية",
      tabDocs: "المستندات PDF / Word",
      noImages: "لا توجد صور مرسلة من هذا العميل.",
      noAudios: "لا توجد رسائل صوتية مسجلة.",
      noDocs: "لا توجد مستندات مشتركة.",
      ocrAi: "النسخ النصي والتحليل بالذكاء الاصطناعي :",
      audioCopy: "نسخ النص الصوتي",
      docSummary: "ملخص الذكاء الاصطناعي :"
    },
    settingsTab: {
      title: "الإعدادات العامة",
      subtitle: "قم بتهيئة توجيهات الذكاء الاصطناعي ولغة لوحة القيادة.",
      aiPromptLabel: "توجيهات نظام AssurIA",
      aiPromptDesc: "يحدد هذا التوجيه سلوك وأسلوب وقواعد الذكاء الاصطناعي لـ Assuria على واتساب.",
      languageSection: "لغة لوحة القيادة",
      languageDesc: "اختر لغتك المفضلة لواجهة المستخدم.",
      agentSectionTitle: "وكيل الذكاء الاصطناعي",
      agentNameLabel: "اسم مساعدك الذكي",
      agentNameDesc: "سيتم استخدام هذا الاسم بواسطة الذكاء الاصطناعي لتقديم نفسه للعملاء على الواتساب",
      agentNamePlaceholder: "مثال: AssurIA، مساعد إمتياز، بوت وفا إيمتياز...",
      welcomeMsgLabel: "رسالة الترحيب (أول اتصال مع عميل جديد)",
      welcomeMsgDesc: "يتم إرسال هذه الرسالة تلقائيًا خلال أول تبادل مع عميل جديد",
      welcomeMsgPlaceholder: "مثال: مرحبًا! أنا AssurIA، مساعد وكالتكم...",
      commStyleLabel: "أسلوب التواصل",
      numberedOptions: "عرض الخيارات في قائمة مرقمة",
      formal: "صيغة الجمع والخطاب الرسمي",
      informal: "صيغة المفرد والخطاب الودي والدافئ",
      autoLanguage: "الكشف التلقائي عن لغة العميل",
      onlyFr: "الرد باللغة الفرنسية فقط",
      onlyAr: "الرد باللغة العربية فقط",
      customInstructionsLabel: "تعليمات مخصصة لوكيل الذكاء الاصطناعي الخاص بك",
      customInstructionsDesc: "تعمل هذه التعليمات على تخصيص سلوك وكيلك. تتم إدارة القواعد الفنية لإدارة الملفات تلقائيًا بواسطة النظام ولا يمكن تعديلها هنا.",
      customInstructionsPlaceholder: "اكتب هنا أي تعليمات محددة تريد إعطاءها لوكيلك. على سبيل المثال: قم دائمًا بإنهاء كل رسالة ببيانات الاتصال بنا. لا تذكر الأسعار أبدًا. اعرض دائمًا معاودة الاتصال إذا تردد العميل...",
      saveButton: "حفظ الإعدادات",
      saveSuccess: "تم تحديث إعدادات وكيل الذكاء الاصطناعي بنجاح.",
      saveError: "خطأ أثناء تحديث الإعدادات."
    },
    helpTab: {
      title: "مركز المساعدة",
      faqTitle: "الأسئلة الشائعة",
      q1: "كيف يمكنني التبديل إلى وضع المستشار البشري؟",
      a1: "في علامة تبويب 'الرسائل'، حدد محادثة ثم استخدم الزر الموجود في أعلى اليمين (وضع الذكاء الاصطناعي / المستشار). بمجرد تفعيل وضع المستشار، لن يقوم الذكاء الاصطناعي بالرد تلقائياً على هذا العميل.",
      q2: "كيف تعمل عملية جمع الملفات؟",
      a2: "بمجرد أن يرسل العميل صورة (مثل البطاقة الرمادية للسيارة) أو مستند PDF على واتساب، يقوم نظامنا بتحليلها فوراً باستخدام Claude Vision وربطها بملف العميل في علامة تبويب 'الملفات'."
    },
    modalNewPolicy: {
      title: "إنشاء ملف جديد",
      phoneLabel: "رقم هاتف العميل",
      phonePlaceholder: "مثال: 212661234567",
      typeLabel: "نوع الملف",
      typeQuote: "طلب تسعير",
      typeClaim: "تصريح بحادث",
      descLabel: "الوصف أو المعلومات الأولية",
      descPlaceholder: "مثال: تسعير سيارة داسيا لوغان أو حادث كسر زجاج...",
      cancel: "إلغاء",
      create: "إنشاء الملف",
      successQuote: "تم إنشاء طلب التسعير بنجاح!",
      successClaim: "تم تسجيل حادث جديد بنجاح!",
      error: "حدث خطأ أثناء الإنشاء."
    },
    modalAttestation: {
      title: "معاينة الشهادة الرسمية",
      subtitle: "شهادة تأمين مؤقتة",
      headerAgency: "ASSURIA MOROCCO S.A.",
      headerAddress: "ملتقى شارع الزرقطوني وشارع المسيرة، الدار البيضاء، المغرب",
      subject: "شهادة تغطية تأمينية مؤقتة",
      body1: "نحن الموقعين أدناه، Assuria S.A.، نشهد بموجب هذه الوثيقة أن العميل المذكور أدناه مغطى بصفة مؤقتة بموجب ضمانات شركتنا وفقاً للشروط العامة لبوليصة التأمين.",
      insuredName: "اسم المؤمن له",
      insuredCin: "رقم البطاقة الوطنية / الهوية",
      insuredAddress: "عنوان المؤمن له",
      detailsTitle: "تفاصيل المخاطر والملف",
      folderRef: "مرجع الملف",
      folderType: "نوع التأمين",
      folderDate: "تاريخ التصريح",
      folderStatus: "الحالة الحالية",
      footerNotice: "هذه الشهادة المؤقتة صالحة لمدة 30 يوماً من تاريخ إصدارها. يجب استخدامها فقط كإثبات مؤقت وسيتم استبدالها ببوليصة التأمين النهائية بعد استكمال الإجراءات الإدارية.",
      signatureTitle: "عن شركة Assuria S.A.",
      signatureStamp: "إدارة المخاطر والتعويضات\n[توقيع إلكتروني معتمد]",
      copySuccess: "تم نسخ الشهادة بنجاح!"
    }
  }
};

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'fr');
  
  const t = (keyPath) => {
    const keys = keyPath.split('.');
    let translation = translations[language];
    for (const key of keys) {
      if (translation && translation[key] !== undefined) {
        translation = translation[key];
      } else {
        return keyPath;
      }
    }
    return translation;
  };

  useEffect(() => {
    localStorage.setItem('language', language);
    if (language === 'ar') {
      document.body.setAttribute('dir', 'rtl');
    } else {
      document.body.removeAttribute('dir');
    }
  }, [language]);

  const [isAnalystOpen, setIsAnalystOpen] = useState(false);
  const [selectedAttestationFolder, setSelectedAttestationFolder] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [aiMode, setAiMode] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [data, setData] = useState({
    conversations: [],
    claims: [],
    quotes: [],
    messages: [] // Pour stats globales
  });
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [clientFiles, setClientFiles] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedClients, setExpandedClients] = useState({});
  const [fileFilterClient, setFileFilterClient] = useState(null);
  const [dossierFilterClient, setDossierFilterClient] = useState(null);
  const [selectedQuoteClient, setSelectedQuoteClient] = useState(null);
  const [selectedClaimClient, setSelectedClaimClient] = useState(null);
  const [selectedFileClient, setSelectedFileClient] = useState(null);
  const [activeMediaTab, setActiveMediaTab] = useState('images');
  const [isAttestationOpen, setIsAttestationOpen] = useState(false);
  const [selectedAttestationData, setSelectedAttestationData] = useState(null);
  const [attestationType, setAttestationType] = useState('quote');
  const [copiedAttestation, setCopiedAttestation] = useState(false);
  const [showNewPolicyModal, setShowNewPolicyModal] = useState(false);
  const [newPolicyPhone, setNewPolicyPhone] = useState('');
  const [newPolicyType, setNewPolicyType] = useState('quote');
  const [newPolicyDetails, setNewPolicyDetails] = useState('');
  const [isSubmittingPolicy, setIsSubmittingPolicy] = useState(false);
  const audioRef = useRef(typeof Audio !== "undefined" ? new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3') : null);

  // Paramètres States & Handlers
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isPromptSaving, setIsPromptSaving] = useState(false);
  const [agencyName, setAgencyName] = useState(localStorage.getItem('agencyName') || 'AssurIA Maroc');
  const [agencyPhone, setAgencyPhone] = useState(localStorage.getItem('agencyPhone') || '+212 6 00 00 00 00');
  const [agencyEmail, setAgencyEmail] = useState(localStorage.getItem('agencyEmail') || 'contact@assuria.ma');

  // Agent IA Settings States
  const [agentNameState, setAgentNameState] = useState('AssurIA');
  const [welcomeMessage, setWelcomeMessage] = useState('Bonjour ! Je suis AssurIA, l\'assistant intelligent de votre cabinet d\'assurance. Comment puis-je vous aider aujourd\'hui ?');
  const [commStyle, setCommStyle] = useState('numbered_options,auto_language');
  const [customInstructions, setCustomInstructions] = useState('');
  const [isAgentSettingsSaving, setIsAgentSettingsSaving] = useState(false);

  const triggerNotification = (text) => {
    const newNotif = {
      id: Date.now(),
      text,
      created_at: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSystemPrompt();
      fetchAgentSettings();
    }
  }, [activeTab]);

  const fetchSystemPrompt = async () => {
    try {
      const res = await fetch('/api/settings/prompt');
      if (res.ok) {
        const data = await res.json();
        setSystemPrompt(data.prompt);
      }
    } catch (e) {
      console.error('Erreur de récupération du prompt:', e);
    }
  };

  const fetchAgentSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.agent_name !== undefined) setAgentNameState(data.agent_name);
        if (data.welcome_message !== undefined) setWelcomeMessage(data.welcome_message);
        if (data.communication_style !== undefined) setCommStyle(data.communication_style);
        if (data.custom_instructions !== undefined) setCustomInstructions(data.custom_instructions);
      }
    } catch (e) {
      console.error('Erreur de récupération des paramètres de l\'agent:', e);
    }
  };

  const handleSavePrompt = async () => {
    setIsPromptSaving(true);
    try {
      const res = await fetch('/api/settings/prompt', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: systemPrompt })
      });
      if (res.ok) {
        triggerNotification('Prompt système mis à jour.');
      } else {
        triggerNotification('Erreur lors de la mise à jour.');
      }
    } catch (e) {
      triggerNotification('Erreur réseau avec le serveur.');
    } finally {
      setIsPromptSaving(false);
    }
  };

  const handleToggleStyle = (value) => {
    let styles = commStyle ? commStyle.split(',') : [];
    if (styles.includes(value)) {
      styles = styles.filter(s => s !== value);
    } else {
      styles.push(value);
    }
    setCommStyle(styles.filter(Boolean).join(','));
  };

  const handleSaveAgentSettings = async () => {
    setIsAgentSettingsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: agentNameState,
          welcome_message: welcomeMessage,
          communication_style: commStyle,
          custom_instructions: customInstructions
        })
      });
      if (res.ok) {
        triggerNotification(t('settingsTab.saveSuccess', 'Paramètres de l\'agent IA mis à jour.'));
      } else {
        triggerNotification(t('settingsTab.saveError', 'Erreur lors de la mise à jour des paramètres.'));
      }
    } catch (e) {
      triggerNotification('Erreur réseau avec le serveur.');
    } finally {
      setIsAgentSettingsSaving(false);
    }
  };

  const handleSaveAgency = () => {
    localStorage.setItem('agencyName', agencyName);
    localStorage.setItem('agencyPhone', agencyPhone);
    localStorage.setItem('agencyEmail', agencyEmail);
    triggerNotification('Informations du cabinet enregistrées.');
  };

  const updateQuoteStatus = async (quoteId, newStatus) => {
    // 1. Optimistic update
    setData(prev => ({
      ...prev,
      quotes: prev.quotes.map(q => q.id === quoteId ? { ...q, status: newStatus } : q)
    }));
    triggerNotification('Statut du devis mis à jour.');

    try {
      const res = await fetch(`/api/conversations/quotes/${quoteId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        throw new Error('Failed to update quote status on server');
      }
    } catch (e) {
      console.error('Error updating quote status:', e);
      triggerNotification('Erreur de synchronisation.');
    }
  };

  const updateClaimStatus = async (claimId, newStatus) => {
    // 1. Optimistic update
    setData(prev => ({
      ...prev,
      claims: prev.claims.map(c => c.id === claimId ? { ...c, status: newStatus } : c)
    }));
    triggerNotification('Statut du sinistre mis à jour.');

    try {
      const res = await fetch(`/api/conversations/claims/${claimId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        throw new Error('Failed to update claim status on server');
      }
    } catch (e) {
      console.error('Error updating claim status:', e);
      triggerNotification('Erreur de synchronisation.');
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [theme]);

  const safeFormat = (dateStr, formatPattern, options = {}) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return format(d, formatPattern, options);
    } catch (e) {
      console.warn("Date formatting error:", e);
      return '';
    }
  };

  const renderDetailsTags = (details) => {
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
      return <span className="text-on-surface-variant/60 italic text-body-sm">Aucun détail</span>;
    }
    return (
      <div className="flex flex-wrap gap-2 max-w-[450px]">
        {Object.entries(details).map(([key, val]) => {
          if (!val || typeof val === 'object') return null;
          // Traduction des clés courantes
          let label = key;
          if (key === 'vehicle' || key === 'vehicule') label = 'Véhicule';
          else if (key === 'insurance_type' || key === 'type') label = 'Type';
          else if (key === 'accident_type') label = 'Type d\'accident';
          else if (key === 'accident_date') label = 'Date sinistre';
          else if (key === 'location') label = 'Lieu';
          else if (key === 'usage') label = 'Usage';
          else if (key === 'bonus_malus') label = 'Bonus/Malus';
          else if (key === 'duration' || key === 'duree') label = 'Durée';
          else if (key === 'third_party_involved') label = 'Tiers impliqué';
          else if (key === 'description') label = 'Description';

          label = label.charAt(0).toUpperCase() + label.slice(1);
          return (
            <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-container-high border border-outline-variant/60 rounded-xl text-[11px] font-semibold text-on-surface-variant">
              <span className="opacity-70">{label}:</span>
              <span className="text-on-surface font-bold">{String(val)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const formatConversationDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      // Moins de 1 heure
      if (diffMins < 60) {
        if (diffMins < 1) return "À l'instant";
        return `il y a ${diffMins} min`;
      }
      
      // Aujourd'hui (même jour)
      const isToday = d.getDate() === now.getDate() &&
                      d.getMonth() === now.getMonth() &&
                      d.getFullYear() === now.getFullYear();
      if (isToday) {
        return format(d, 'HH:mm');
      }
      
      // Hier (jour précédent)
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.getDate() === yesterday.getDate() &&
                          d.getMonth() === yesterday.getMonth() &&
                          d.getFullYear() === yesterday.getFullYear();
      if (isYesterday) {
        return 'Hier';
      }
      
      // Moins de 7 jours (diffDays < 7)
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays < 7) {
        const dayName = format(d, 'EEEE', { locale: fr });
        return dayName.charAt(0).toUpperCase() + dayName.slice(1);
      }
      
      // Plus de 7 jours
      return format(d, 'dd/MM/yyyy');
    } catch (e) {
      console.warn("formatConversationDate error:", e);
      return '';
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const getInitialsColor = (name) => {
    if (!name) return 'bg-surface-container-highest text-on-surface-variant';
    const colors = [
      'bg-primary-container text-on-primary-container border border-primary/20',
      'bg-secondary-container text-on-secondary-container border border-secondary/20',
      'bg-tertiary-container text-on-tertiary-container border border-tertiary/20',
      'bg-error-container text-on-error-container border border-error/20'
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getMediaUrl = (urlOrId) => {
    if (!urlOrId) return '';
    const strUrl = String(urlOrId);
    if (strUrl.startsWith('http://') || strUrl.startsWith('https://')) return strUrl;
    return `https://assuria-production.up.railway.app/api/media/${strUrl}`;
  };

  const renderMessageContent = (msg) => {
    const srcUrl = getMediaUrl(msg.media_url);

    if (msg.media_type) {
      if (msg.media_type.includes('image')) {
        return (
          <div 
            style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', borderRadius: '12px' }} 
            onClick={() => setLightboxMedia({ url: srcUrl, description: msg.media_description || msg.content })}
          >
            <img 
              src={srcUrl} 
              alt={msg.content} 
              style={{ display: 'block', maxWidth: '240px', maxHeight: '180px', borderRadius: '12px', objectFit: 'cover' }} 
            />
          </div>
        );
      } else if (msg.media_type.includes('audio')) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px' }}>
            <span style={{ fontSize: '20px', flexShrink: 0 }}>🎙️</span>
            <audio src={srcUrl} controls style={{ height: '32px', width: '210px' }} />
          </div>
        );
      } else if (msg.media_type.includes('pdf') || msg.media_type.includes('document') || msg.media_type.includes('word') || msg.media_type.includes('officedocument')) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', width: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', flexShrink: 0 }}>
              <FileText size={24} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {msg.content?.startsWith('Document reçu:') ? msg.content.replace('Document reçu:', '').trim() : (msg.content || 'Document')}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {msg.media_type.split('/')[1]?.toUpperCase() || 'PDF'}
              </span>
            </div>
            <a href={srcUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', cursor: 'pointer', flexShrink: 0 }}>
              <Download size={16} />
            </a>
          </div>
        );
      }
    }
    return <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>;
  };

  const formatLastMessagePreview = (lastMsg) => {
    if (!lastMsg) return 'Nouvelle conversation';
    if (lastMsg.media_type) {
      if (lastMsg.media_type.includes('image')) return '📷 Photo';
      if (lastMsg.media_type.includes('audio')) return '🎙️ Message vocal';
      if (lastMsg.media_type.includes('pdf') || lastMsg.media_type.includes('document') || lastMsg.media_type.includes('word') || lastMsg.media_type.includes('officedocument')) return '📄 Document';
    }
    return lastMsg.content;
  };

  const updateConversationLastMessage = (newMsg) => {
    setData(prev => {
      const updatedConversations = prev.conversations.map(c => {
        if (c.id === newMsg.conversation_id) {
          return {
            ...c,
            last_message_at: newMsg.created_at,
            last_message: {
              content: newMsg.content,
              created_at: newMsg.created_at,
              sender: newMsg.sender,
              media_type: newMsg.media_type
            }
          };
        }
        return c;
      });

      // Sort conversations in-memory by last_message_at descending
      const sortedConversations = [...updatedConversations].sort((a, b) => {
        const dateA = a.last_message_at ? new Date(a.last_message_at) : new Date(0);
        const dateB = b.last_message_at ? new Date(b.last_message_at) : new Date(0);
        return dateB - dateA;
      });

      return {
        ...prev,
        conversations: sortedConversations
      };
    });

    if (newMsg.media_type) {
      setClientFiles(prev => {
        if (prev.some(f => f.id === newMsg.id)) return prev;
        // Try to find conversation identifier
        const conv = data.conversations.find(c => c.id === newMsg.conversation_id);
        const fileWithConv = {
          ...newMsg,
          conversations: {
            user_identifier: conv ? conv.user_identifier : 'client'
          }
        };
        return [fileWithConv, ...prev];
      });
    }
  };

  useEffect(() => {
    fetchData();
    
    const channel = supabase.channel('dashboard_data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'claims' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, fetchData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        handleGlobalNewMessage(payload);
        updateConversationLastMessage(payload.new);
        fetchData(); // refresh data for dashboard and previews
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleGlobalNewMessage(payload) {
    const msg = payload.new;
    if (msg.sender === 'user') {
      if (audioRef.current) {
        audioRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      const originalTitle = document.title;
      document.title = '🔴 Nouveau message — Assuria AI';
      setTimeout(() => { document.title = originalTitle; }, 3000);
      
      setUnreadCounts(prev => ({
        ...prev,
        [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1
      }));

      // Gestion de la notification média
      if (msg.media_url) {
        supabase.from('conversations').select('user_identifier').eq('id', msg.conversation_id).single().then(({ data: convData }) => {
          const phone = convData ? convData.user_identifier : 'client';
          let typeLabel = 'Document';
          if (msg.media_type) {
            if (msg.media_type.startsWith('image/')) {
              typeLabel = 'Photo';
            } else if (msg.media_type.startsWith('audio/')) {
              typeLabel = 'Vocal';
            }
          }
          const newNotif = {
            id: msg.id || Date.now(),
            text: `Média reçu de +${phone} — ${typeLabel}`,
            created_at: msg.created_at || new Date().toISOString(),
            read: false
          };
          setNotifications(prev => [newNotif, ...prev]);
        });
      }
    }
  };

  useEffect(() => {
    if (!selectedConversation) return;
    setUnreadCounts(prev => ({ ...prev, [selectedConversation.id]: 0 }));

    const channel = supabase.channel(`messages_${selectedConversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${selectedConversation.id}` }, (payload) => {
        setChatMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        updateConversationLastMessage(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  async function fetchData() {
    const [convs, clms, qts, msgs, filesData] = await Promise.all([
      supabase.from('conversations').select('*, messages(content, created_at, sender, media_type)').order('last_message_at', { ascending: false }),
      supabase.from('claims').select('*, conversations(user_identifier)').order('created_at', { ascending: false }),
      supabase.from('quotes').select('*, conversations(user_identifier)').order('created_at', { ascending: false }),
      supabase.from('messages').select('*'), // For stats
      supabase.from('messages').select('*, conversations(user_identifier)').not('media_type', 'is', null).order('created_at', { ascending: false })
    ]);

    const formattedConvs = (convs.data || []).map(c => {
      const sortedMsgs = c.messages ? c.messages.sort((a,b) => new Date(a.created_at) - new Date(b.created_at)) : [];
      return {
        ...c,
        last_message: sortedMsgs.length > 0 ? sortedMsgs[sortedMsgs.length - 1] : null,
      }
    });

    setData({
      conversations: formattedConvs,
      claims: clms.data || [],
      quotes: qts.data || [],
      messages: msgs.data || []
    });
    
    console.log('Fichiers:', filesData.data);
    setClientFiles(filesData.data || []);
    setLoading(false);
  };

  const fetchMessages = async (convId) => {
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    setChatMessages(msgs || []);
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    fetchMessages(conv.id);
    setAiMode(conv.client_profile?.ai_mode !== false);
  };

  const handleToggleAiMode = async (enabled) => {
    if (!selectedConversation) return;
    setAiMode(enabled);

    const updatedProfile = {
      ...(selectedConversation.client_profile || {}),
      ai_mode: enabled
    };

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ client_profile: updatedProfile })
        .eq('id', selectedConversation.id);

      if (error) {
        console.error("Erreur de mise à jour du Mode IA:", error);
      } else {
        setSelectedConversation(prev => ({
          ...prev,
          client_profile: updatedProfile
        }));
        setData(prev => ({
          ...prev,
          conversations: prev.conversations.map(c => 
            c.id === selectedConversation.id 
              ? { ...c, client_profile: updatedProfile } 
              : c
          )
        }));
      }
    } catch (err) {
      console.error("Erreur de mise à jour du Mode IA:", err);
    }
  };

  const handleCreateNewPolicy = async (e) => {
    e.preventDefault();
    if (!newPolicyPhone.trim() || !newPolicyDetails.trim()) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setIsSubmittingPolicy(true);
    const cleanPhone = newPolicyPhone.replace('+', '').trim();

    try {
      // 1. Get or create conversation
      let { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('id, client_profile')
        .eq('user_identifier', cleanPhone)
        .maybeSingle();

      let conversationId;
      if (convErr || !conv) {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert([{ 
            user_identifier: cleanPhone, 
            platform: 'whatsapp', 
            client_profile: {} 
          }])
          .select()
          .single();
        
        if (createError) throw createError;
        conversationId = newConv.id;
      } else {
        conversationId = conv.id;
      }

      // 2. Insert quote or claim
      const detailsObj = { user_input: newPolicyDetails };
      if (newPolicyType === 'quote') {
        const { error: quoteErr } = await supabase
          .from('quotes')
          .insert([{
            conversation_id: conversationId,
            status: 'pending',
            insurance_type: 'auto',
            details: detailsObj
          }]);
        if (quoteErr) throw quoteErr;
      } else {
        const { error: claimErr } = await supabase
          .from('claims')
          .insert([{
            conversation_id: conversationId,
            status: 'pending',
            description: newPolicyDetails,
            details: detailsObj
          }]);
        if (claimErr) throw claimErr;
      }

      alert(`Dossier ${newPolicyType === 'quote' ? 'Devis' : 'Sinistre'} créé avec succès !`);
      
      // Close modal and reset fields
      setShowNewPolicyModal(false);
      setNewPolicyPhone('');
      setNewPolicyDetails('');
      setNewPolicyType('quote');

      // Refresh everything
      await fetchData();

      // Redirect to the appropriate tab to show the new item
      setActiveTab(newPolicyType === 'quote' ? 'quotes' : 'claims');

    } catch (err) {
      console.error("Erreur de création de dossier:", err);
      alert("Une erreur s'est produite lors de la création du dossier.");
    } finally {
      setIsSubmittingPolicy(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || aiMode) return;

    try {
      const API_URL = 'https://assuria-production.up.railway.app';
      const response = await fetch(`${API_URL}/api/conversations/${selectedConversation.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      });

      if (response.ok) {
        setNewMessage('');
      } else {
        alert("Erreur lors de l'envoi du message");
      }
    } catch (error) {
      alert("Erreur de connexion au serveur");
    }
  };

  const exportToExcel = (dataToExport, filename) => {
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${filename}.xlsx`);
  };

  const exportClaims = () => {
    const exportData = data.claims.map(c => ({
      ID: c.id,
      Client: `+${c.conversations?.user_identifier}`,
      Description: c.description || JSON.stringify(c.details),
      Statut: c.status,
      Date: safeFormat(c.created_at, 'dd/MM/yyyy HH:mm')
    }));
    exportToExcel(exportData, 'Sinistres_Assuria');
  };

  const exportQuotes = () => {
    const exportData = data.quotes.map(q => ({
      ID: q.id,
      Client: `+${q.conversations?.user_identifier}`,
      Type: q.insurance_type,
      Détails: JSON.stringify(q.details),
      Statut: q.status,
      Date: safeFormat(q.created_at, 'dd/MM/yyyy HH:mm')
    }));
    exportToExcel(exportData, 'Devis_Assuria');
  };

  const exportMonthlyReport = () => {
    // 1. KPI Sheet
    const kpiData = [
      { Indicateur: "Messages IA ce mois", Valeur: thisMonthMessages },
      { Indicateur: "Total Demandes de Devis", Valeur: quoteStats.total },
      { Indicateur: "Devis Acceptés / Convertis", Valeur: quoteStats.accepted },
      { Indicateur: "Taux de Conversion Devis", Valeur: `${Math.round((quoteStats.accepted / (quoteStats.total || 1)) * 100)}%` },
      { Indicateur: "Total Déclarations de Sinistres", Valeur: claimStats.total },
      { Indicateur: "Sinistres Résolus", Valeur: claimStats.resolved },
      { Indicateur: "Taux de Résolution Sinistres", Valeur: `${Math.round((claimStats.resolved / (claimStats.total || 1)) * 100)}%` },
      { Indicateur: "Temps Moyen de Réponse IA", Valeur: "< 1 minute" }
    ];

    const wb = XLSX.utils.book_new();
    
    const wsKpi = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKpi, "Indicateurs Globaux");

    const claimsData = data.claims.map(c => ({
      ID: c.id.slice(0, 8),
      Client: `+${c.conversations?.user_identifier || ''}`,
      Nom: c.conversations?.contact_name || c.conversations?.client_profile?.name || 'Non renseigné',
      Description: c.description || '',
      Statut: c.status,
      Date: safeFormat(c.created_at, 'dd/MM/yyyy HH:mm')
    }));
    const wsClaims = XLSX.utils.json_to_sheet(claimsData);
    XLSX.utils.book_append_sheet(wb, wsClaims, "Détail Sinistres");

    const quotesData = data.quotes.map(q => ({
      ID: q.id.slice(0, 8),
      Client: `+${q.conversations?.user_identifier || ''}`,
      Nom: q.conversations?.contact_name || q.conversations?.client_profile?.name || 'Non renseigné',
      "Type d'assurance": q.insurance_type,
      Statut: q.status,
      Date: safeFormat(q.created_at, 'dd/MM/yyyy HH:mm')
    }));
    const wsQuotes = XLSX.utils.json_to_sheet(quotesData);
    XLSX.utils.book_append_sheet(wb, wsQuotes, "Détail Devis");

    XLSX.writeFile(wb, `Rapport_Mensuel_Assuria_${new Date().getMonth() + 1}_${new Date().getFullYear()}.xlsx`);
  };

  // Stats Calculators
  const claimStats = {
    total: data.claims.length,
    new: data.claims.filter(c => c.status === 'pending').length,
    processing: data.claims.filter(c => c.status === 'processing').length,
    resolved: data.claims.filter(c => c.status === 'resolved').length
  };

  const quoteStats = {
    total: data.quotes.length,
    new: data.quotes.filter(q => q.status === 'pending').length,
    sent: data.quotes.filter(q => q.status === 'sent').length,
    accepted: data.quotes.filter(q => q.status === 'converted').length
  };

  // Dashboard calculations
  const thisMonthMessages = data.messages.filter(m => new Date(m.created_at).getMonth() === new Date().getMonth() && m.sender === 'ai').length;
  
  // Urgent conversations: last message from user > 30 mins ago
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
  const urgentConversations = data.conversations.filter(c => {
    if (!c.last_message) return false;
    return c.last_message.sender === 'user' && new Date(c.last_message.created_at) < thirtyMinsAgo;
  });

  // Chart data: messages per day (last 7 days)
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    return {
      date: safeFormat(d, 'dd MMM', { locale: fr }),
      rawDate: safeFormat(d, 'yyyy-MM-dd')
    };
  });

  const chartData = last7Days.map(day => {
    const dayMessages = data.messages.filter(m => safeFormat(new Date(m.created_at), 'yyyy-MM-dd') === day.rawDate);
    return {
      name: day.date,
      IA: dayMessages.filter(m => m.sender === 'ai').length,
      Utilisateur: dayMessages.filter(m => m.sender === 'user').length
    };
  });

  const renderFilesTab = () => {
    // Level 1: Directory list mapping through all conversations
    const directoryClients = data.conversations.map(conv => {
      const phone = conv.user_identifier;
      const name = conv.contact_name || conv.client_profile?.name || '';
      const lastContactDate = conv.last_message?.created_at || conv.updated_at || conv.created_at;
      const filesForClient = clientFiles.filter(f => (f.conversations?.user_identifier || f.user_phone || f.sender) === phone);
      
      return {
        phone,
        name,
        lastContactDate,
        filesCount: filesForClient.length,
        files: filesForClient,
        conversation: conv
      };
    });

    if (selectedFileClient) {
      // Level 2: Dedicated Client File & Profile CRM
      const activeClientData = directoryClients.find(c => c.phone === selectedFileClient);
      const profile = activeClientData?.conversation?.client_profile || {};
      const files = activeClientData?.files || [];

      // Filter files inside Level 2 by tabs
      const filesImages = files.filter(f => f.media_type?.includes('image'));
      const filesAudio = files.filter(f => f.media_type?.includes('audio'));
      const filesDocs = files.filter(f => !f.media_type?.includes('image') && !f.media_type?.includes('audio'));

      const personalInfo = {
        name: profile.name || profile.fullName || null,
        birthdate: profile.birthdate || profile.dob || profile.date_naissance || null,
        cin: profile.cin || profile.id_number || null,
        address: profile.address || profile.adresse || null
      };

      const renderVal = (val) => val ? (
        <span className="font-bold text-on-surface text-body-md">{val}</span>
      ) : (
        <span className="text-on-surface-variant/40 italic text-body-md">Non renseigné</span>
      );

      const hasVehicle = !!profile.vehicle;
      const hasProperty = !!profile.property;
      const hasHealth = !!profile.health;

      const v = profile.vehicle || {};
      const brand = v.brand || v.make || v.marque || null;
      const model = v.model || v.modele || null;
      const year = v.year || v.annee || null;
      const plate = v.registration || v.plate || v.immatriculation || null;
      const vin = v.vin || null;

      const p = profile.property || {};
      const propType = p.type || p.property_type || null;
      const propAddr = p.address || p.adresse || null;
      const propSurface = p.surface || p.area || p.superficie || null;

      const h = profile.health || {};
      const healthInfo = h.conditions || h.details || h.coverage || h.assurance_sante || null;

      const personalKeys = ['name', 'fullName', 'birthdate', 'dob', 'date_naissance', 'cin', 'id_number', 'address', 'adresse', 'ai_mode', 'session', 'vehicle', 'property', 'health'];
      const customKeys = Object.entries(profile).filter(([key]) => !personalKeys.includes(key));

      const renderAssetCard = () => {
        if (hasVehicle) {
          return (
            <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-bold text-body-md border-b border-outline-variant/40 pb-2 mb-1">
                <span className="material-symbols-outlined text-[20px]">directions_car</span>
                Véhicule Assuré
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-md">
                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-on-surface-variant font-semibold uppercase">Marque</span><span className="font-bold text-on-surface text-sm">{brand || 'Non renseigné'}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-on-surface-variant font-semibold uppercase">Modèle</span><span className="font-bold text-on-surface text-sm">{model || 'Non renseigné'}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-on-surface-variant font-semibold uppercase">Année</span><span className="font-bold text-on-surface text-sm">{year || 'Non renseigné'}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-on-surface-variant font-semibold uppercase">Immatriculation</span><span className="font-bold text-on-surface text-sm">{plate || 'Non renseigné'}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-on-surface-variant font-semibold uppercase">VIN</span><span className="font-bold text-on-surface text-sm">{vin || 'Non renseigné'}</span></div>
              </div>
            </div>
          );
        }
        if (hasProperty) {
          return (
            <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-bold text-body-md border-b border-outline-variant/40 pb-2 mb-1">
                <span className="material-symbols-outlined text-[20px]">home</span>
                Habitation Assurée
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-on-surface-variant font-semibold uppercase">Type</span><span className="font-bold text-on-surface text-sm">{propType || 'Non renseigné'}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-on-surface-variant font-semibold uppercase">Superficie</span><span className="font-bold text-on-surface text-sm">{propSurface ? `${propSurface} m²` : 'Non renseigné'}</span></div>
                <div className="flex flex-col gap-0.5"><span className="text-[10px] text-on-surface-variant font-semibold uppercase">Adresse du bien</span><span className="font-bold text-on-surface text-sm">{propAddr || 'Non renseigné'}</span></div>
              </div>
            </div>
          );
        }
        if (hasHealth) {
          return (
            <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-bold text-body-md border-b border-outline-variant/40 pb-2 mb-1">
                <span className="material-symbols-outlined text-[20px]">medical_services</span>
                Santé & Complémentaire
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-on-surface-variant font-semibold uppercase">Informations santé</span>
                <span className="font-bold text-on-surface text-sm">{healthInfo || 'Non renseigné'}</span>
              </div>
            </div>
          );
        }
        if (customKeys.length > 0) {
          return (
            <div className="p-md rounded-xl bg-surface-container-low border border-outline-variant/60 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary font-bold text-body-md border-b border-outline-variant/40 pb-2 mb-1">
                <span className="material-symbols-outlined text-[20px]">widgets</span>
                Données Complémentaires
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                {customKeys.map(([k, val]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <span className="text-[10px] text-on-surface-variant font-semibold uppercase capitalize">{k.replace(/_/g, ' ')}</span>
                    <span className="font-bold text-on-surface text-sm">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return <span className="text-on-surface-variant/40 italic text-body-md">Aucun bien enregistré</span>;
      };

      return (
        <div className="flex flex-col gap-6 p-lg h-full overflow-y-auto custom-scrollbar position-relative">
          {/* Header Row */}
          <div className="flex flex-col gap-2 no-print">
            <button 
              onClick={() => setSelectedFileClient(null)}
              className="flex items-center gap-1.5 self-start text-primary font-bold hover:translate-x-[-4px] active:scale-95 transition-all bg-transparent border-none cursor-pointer p-0 text-body-md"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              Retour aux clients
            </button>
            <div className="flex items-center gap-4 mt-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-on-primary-container text-headline-sm shadow-md border-2 border-primary/20 ${getInitialsColor(activeClientData.name || activeClientData.phone)}`}>
                {getInitials(activeClientData.name || activeClientData.phone)}
              </div>
              <div className="flex flex-col gap-0.5">
                <h2 className="font-headline-md text-[24px] text-on-surface m-0">
                  Fiche Client : {activeClientData.name || `+${activeClientData.phone}`}
                </h2>
                {activeClientData.name && (
                  <span className="text-body-sm text-on-surface-variant font-medium">
                    👤 WhatsApp ID : +{activeClientData.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Personal Info */}
          <div className="glass-panel p-lg no-print">
            <h3 className="font-headline-sm text-body-lg font-bold text-primary flex items-center gap-2 mb-md mt-0">
              <span className="material-symbols-outlined text-[20px]">person</span>
              Informations Personnelles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
              <div className="flex flex-col gap-1">
                <span className="text-on-surface-variant/70 font-semibold uppercase tracking-wider text-[10px]">Nom complet</span>
                {renderVal(personalInfo.name)}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-on-surface-variant/70 font-semibold uppercase tracking-wider text-[10px]">Date de naissance</span>
                {renderVal(personalInfo.birthdate)}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-on-surface-variant/70 font-semibold uppercase tracking-wider text-[10px]">Numéro CIN</span>
                {renderVal(personalInfo.cin)}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-on-surface-variant/70 font-semibold uppercase tracking-wider text-[10px]">Adresse</span>
                {renderVal(personalInfo.address)}
              </div>
            </div>
          </div>

          {/* Section: Insured Assets */}
          <div className="glass-panel p-lg no-print">
            <h3 className="font-headline-sm text-body-lg font-bold text-primary flex items-center gap-2 mb-md mt-0">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
              Biens Assurés
            </h3>
            {renderAssetCard()}
          </div>

          {/* Section: Categorized Media Attachments */}
          <div className="glass-panel p-lg no-print">
            <h3 className="font-headline-sm text-body-lg font-bold text-primary flex items-center gap-2 mb-md mt-0">
              <span className="material-symbols-outlined text-[20px]">folder_open</span>
              Médias et Pièces Jointes
            </h3>
            
            {/* Internal Tabs Switcher */}
            <div className="flex border-b border-outline-variant/40 mb-lg gap-sm">
              <button 
                onClick={() => setActiveMediaTab('images')}
                className={`px-4 py-2 font-bold text-body-sm bg-transparent border-none border-b-2 cursor-pointer transition-all flex items-center gap-2 ${activeMediaTab === 'images' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
              >
                📷 Images ({filesImages.length})
              </button>
              <button 
                onClick={() => setActiveMediaTab('audio')}
                className={`px-4 py-2 font-bold text-body-sm bg-transparent border-none border-b-2 cursor-pointer transition-all flex items-center gap-2 ${activeMediaTab === 'audio' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
              >
                🎙️ Vocaux ({filesAudio.length})
              </button>
              <button 
                onClick={() => setActiveMediaTab('docs')}
                className={`px-4 py-2 font-bold text-body-sm bg-transparent border-none border-b-2 cursor-pointer transition-all flex items-center gap-2 ${activeMediaTab === 'docs' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}
              >
                📄 Documents ({filesDocs.length})
              </button>
            </div>

            {/* Active Tab Contents */}
            {activeMediaTab === 'images' && (
              filesImages.length === 0 ? (
                <span className="text-on-surface-variant/40 italic text-body-md block text-center py-md">Aucune image partagée</span>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                  {filesImages.map(file => {
                    const srcUrl = getMediaUrl(file.media_url);
                    return (
                      <div key={file.id} className="p-md bg-surface-container-low border border-outline-variant/60 flex flex-col gap-sm rounded-lg hover:border-primary/20 transition-all">
                        <div className="flex items-start gap-md">
                          {srcUrl && (
                            <img 
                              src={srcUrl} 
                              alt="Preview Image" 
                              className="w-20 h-20 rounded-lg object-cover cursor-pointer border border-outline-variant hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0"
                              onClick={() => setLightboxMedia({ url: srcUrl, description: file.media_description || file.content })}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-on-surface-variant font-medium mt-0">
                              Reçu le {safeFormat(file.created_at, 'd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                            <div className="mt-xs bg-surface-container-highest/20 p-2 rounded border border-outline-variant/30 max-h-[70px] overflow-y-auto text-[11px] leading-relaxed custom-scrollbar">
                              {file.media_description || "Aucune métadonnée extraite."}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {activeMediaTab === 'audio' && (
              filesAudio.length === 0 ? (
                <span className="text-on-surface-variant/40 italic text-body-md block text-center py-md">Aucun vocal partagé</span>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {filesAudio.map(file => {
                    const srcUrl = getMediaUrl(file.media_url);
                    return (
                      <div key={file.id} className="p-md bg-surface-container-low border border-outline-variant/60 flex flex-col gap-sm rounded-lg hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] text-on-surface-variant font-medium m-0">
                            Vocal reçu le {safeFormat(file.created_at, 'd MMM yyyy HH:mm', { locale: fr })}
                          </p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(file.media_description || file.content || "");
                              setCopiedId(file.id);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all border cursor-pointer ${copiedId === file.id ? 'bg-primary text-on-primary border-primary' : 'bg-transparent text-on-surface border-outline-variant hover:bg-surface-container-high'}`}
                          >
                            {copiedId === file.id ? 'Copié !' : 'Copier'}
                          </button>
                        </div>
                        {srcUrl && (
                          <audio src={srcUrl} controls className="w-full mt-1 scale-95" />
                        )}
                        <div className="mt-xs bg-surface-container-highest/20 p-2.5 rounded border border-outline-variant/30 text-[12px] leading-relaxed max-h-[80px] overflow-y-auto custom-scrollbar italic text-on-surface/90">
                          "{file.media_description || file.content || "Transcription indisponible."}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {activeMediaTab === 'docs' && (
              filesDocs.length === 0 ? (
                <span className="text-on-surface-variant/40 italic text-body-md block text-center py-md">Aucun document partagé</span>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {filesDocs.map(file => {
                    const srcUrl = getMediaUrl(file.media_url);
                    return (
                      <div key={file.id} className="p-md bg-surface-container-low border border-outline-variant/60 flex gap-md rounded-lg hover:border-primary/20 transition-all">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-error/15 text-error border border-error/20">
                          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>picture_as_pdf</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-md">
                              <span className="font-bold text-on-surface text-sm truncate block" title={file.content || 'Document'}>
                                {file.content || 'document.pdf'}
                              </span>
                              {srcUrl && (
                                <a 
                                  href={srcUrl} 
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline bg-transparent border-none cursor-pointer p-0"
                                >
                                  <span className="material-symbols-outlined text-[16px]">download</span>
                                  Télécharger
                                </a>
                              )}
                            </div>
                            <p className="text-[10px] text-on-surface-variant font-medium mt-0.5 mb-1.5">
                              Reçu le {safeFormat(file.created_at, 'd MMM yyyy HH:mm', { locale: fr })}
                            </p>
                            <div className="bg-surface-container-highest/20 p-2.5 rounded border border-outline-variant/30 text-[11px] leading-relaxed max-h-[80px] overflow-y-auto custom-scrollbar text-on-surface-variant">
                              <strong className="text-primary text-[10px] block uppercase tracking-wider mb-0.5">Résumé Claude :</strong>
                              {file.media_description || "Analyse et synthèse du PDF en attente."}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* Bottom Redirection Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-2 no-print">
            <button 
              onClick={() => {
                setSelectedClaimClient(selectedFileClient);
                setActiveTab('claims');
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl font-bold transition-all text-body-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              Voir les sinistres
            </button>
            
            <button 
              onClick={() => {
                setSelectedQuoteClient(selectedFileClient);
                setActiveTab('quotes');
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-xl font-bold transition-all text-body-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">request_quote</span>
              Voir les devis
            </button>
          </div>

          {/* Floating Action Button for attestation */}
          <button 
            onClick={() => {
              setSelectedAttestationData(activeClientData.conversation);
              setAttestationType('client');
              setIsAttestationOpen(true);
              setCopiedAttestation(false);
            }}
            className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary text-on-primary-container shadow-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all z-40 border-none no-print"
            title="Préparer attestation"
          >
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
          </button>
        </div>
      );
    }

    // Level 1: Client Directory
    return (
      <div className="flex flex-col gap-6 p-lg h-full overflow-y-auto custom-scrollbar no-print">
        <div>
          <h2 className="font-headline-md text-[24px] text-on-surface m-0 font-bold">Fichiers Clients</h2>
          <p className="text-body-sm text-on-surface-variant m-0 mt-1">
            Consultez les dossiers clients complets, leurs informations personnelles, les biens assurés, et les pièces jointes WhatsApp.
          </p>
        </div>

        {directoryClients.length === 0 ? (
          <div className="glass-panel p-xl text-center flex flex-col items-center justify-center text-on-surface-variant opacity-70">
            <span className="material-symbols-outlined text-5xl mb-sm">folder_open</span>
            <p className="m-0 text-body-md font-bold">Aucun dossier client trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {directoryClients.map(client => {
              return (
                <div 
                  key={client.phone}
                  onClick={() => {
                    setSelectedFileClient(client.phone);
                    setActiveMediaTab('images');
                  }}
                  className="glass-card p-md rounded-2xl flex flex-col justify-between hover:scale-[1.02] active:scale-[0.98] hover:border-primary/40 transition-all duration-300 border border-outline-variant/60 cursor-pointer shadow-lg bg-surface-container-low/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-on-primary-container text-body-lg shadow-inner border border-outline-variant/40 ${getInitialsColor(client.name || client.phone)}`}>
                        {getInitials(client.name || client.phone)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface text-body-md">
                          {client.name || `+${client.phone}`}
                        </span>
                        {client.name && (
                          <span className="text-xs text-on-surface-variant/80 font-medium">
                            📞 +{client.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[11px] text-primary bg-primary/10 border border-primary/25 px-2 py-0.5 rounded-full font-bold">
                      {client.filesCount} fichier{client.filesCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="my-4 pt-3 border-t border-outline-variant/40 flex justify-between items-center text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-on-surface-variant/70 font-semibold uppercase tracking-wider text-[9px]">Type de client</span>
                      <span className="font-bold text-on-surface uppercase">
                        {client.conversation?.client_profile?.vehicle ? 'Automobile' : client.conversation?.client_profile?.property ? 'Habitation' : 'Général'}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-on-surface-variant/70 font-semibold uppercase tracking-wider text-[9px]">Dernier Contact</span>
                      <span className="font-bold text-primary">
                        {formatConversationDate(client.lastContactDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30">
                    <span className="text-[11px] text-on-surface-variant/70">
                      Statut profil : <strong className="text-on-surface">Complet</strong>
                    </span>
                    <span className="text-primary font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all">
                      Ouvrir Fiche <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout
      theme={theme}
      toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      unreadCounts={{ messages: Object.values(unreadCounts).reduce((a, b) => a + b, 0) }}
      notificationsCount={notifications.filter(n => !n.read).length}
      toggleNotifications={() => setShowNotifications(!showNotifications)}
      onNewPolicy={() => setShowNewPolicyModal(true)}
      t={t}
    >
      <div className={`content-area ${activeTab === 'conversations' ? 'h-full flex flex-col overflow-hidden flex-1' : ''}`}>
          {activeTab === 'dashboard' ? (
            <div className="space-y-xl max-w-[1440px] mx-auto">
              {/* Header Section */}
              <div className="flex justify-between items-end flex-wrap gap-md">
                <div>
                  <h2 className="font-headline-lg text-headline-lg text-on-surface m-0">{t('sidebar.dashboard')}</h2>
                  <p className="text-on-surface-variant font-body-md text-body-md mt-xs m-0">
                    {t('dashboard.welcome')}
                  </p>
                </div>
                <div className="flex gap-md">
                  <button 
                    onClick={exportMonthlyReport}
                    className="px-md py-sm bg-surface-container-high border border-outline-variant/50 rounded-lg text-on-surface font-label-md text-label-md hover:bg-surface-container-highest transition-colors cursor-pointer"
                  >
                    {t('buttons.exportReport')}
                  </button>
                  <button 
                    onClick={() => setIsAnalystOpen(true)}
                    className="px-md py-sm bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-opacity cursor-pointer border-none font-bold"
                  >
                    {t('buttons.aiAnalyst')}
                  </button>
                </div>
              </div>

              {/* Top Metrics Grid */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
                <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <span className="text-on-surface-variant font-label-md text-label-md">Messages IA ce mois</span>
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                  </div>
                  <div>
                    <div className="text-display-lg font-display-lg leading-none">{thisMonthMessages}</div>
                    <div className="text-primary text-body-sm font-body-sm mt-xs flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[16px]">trending_up</span> Actif
                    </div>
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-on-surface-variant font-label-md text-label-md">Devis en cours</span>
                    <span className="material-symbols-outlined text-secondary">request_quote</span>
                  </div>
                  <div>
                    <div className="text-display-lg font-display-lg leading-none">{quoteStats.new}</div>
                    <div className="text-on-surface-variant text-body-sm font-body-sm mt-xs">Total: {quoteStats.total}</div>
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-on-surface-variant font-label-md text-label-md">Sinistres en cours</span>
                    <span className="material-symbols-outlined text-tertiary">report_problem</span>
                  </div>
                  <div>
                    <div className="text-display-lg font-display-lg leading-none">{claimStats.new}</div>
                    <div className="text-on-surface-variant text-body-sm font-body-sm mt-xs">Total: {claimStats.total}</div>
                  </div>
                </div>

                <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-on-surface-variant font-label-md text-label-md">Temps de réponse</span>
                    <span className="material-symbols-outlined text-primary">speed</span>
                  </div>
                  <div>
                    <div className="text-display-lg font-display-lg leading-none">&lt; 1 min</div>
                    <div className="text-primary text-body-sm font-body-sm mt-xs flex items-center gap-xs">
                      Optimisé par IA
                    </div>
                  </div>
                </div>
              </section>

              {/* Middle Section: Bento Grid */}
              <div className="grid grid-cols-12 gap-gutter">
                {/* Bar Chart: Conversations par jour */}
                <div className="col-span-12 lg:col-span-8 glass-card rounded-xl p-lg h-[400px] flex flex-col">
                  <div className="flex justify-between items-center mb-xl">
                    <h3 className="font-headline-md text-headline-md m-0">Conversations par jour</h3>
                    <div className="flex items-center gap-md">
                      <span className="flex items-center gap-xs text-label-md font-label-md text-on-surface-variant">
                        <span className="w-3 h-3 bg-primary rounded-full"></span> IA
                      </span>
                      <span className="flex items-center gap-xs text-label-md font-label-md text-on-surface-variant">
                        <span className="w-3 h-3 bg-secondary rounded-full"></span> Utilisateur
                      </span>
                    </div>
                  </div>
                  <div className="flex-grow w-full h-full relative min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--outline-variant)" vertical={false} opacity={0.3} />
                        <XAxis dataKey="name" stroke="var(--on-surface-variant)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--on-surface-variant)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ background: 'var(--surface-container-high)', border: '1px solid var(--outline-variant)', borderRadius: '8px', color: 'var(--on-surface)' }}
                          itemStyle={{ color: 'var(--on-surface)' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="IA" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Utilisateur" fill="var(--secondary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Urgent Conversations */}
                <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-lg flex flex-col h-[400px]">
                  <div className="flex items-center gap-sm mb-lg">
                    <span className="material-symbols-outlined text-error">emergency</span>
                    <h3 className="font-headline-md text-headline-md m-0">Urgences</h3>
                  </div>
                  <div className="flex-grow space-y-md overflow-y-auto pr-xs custom-scrollbar">
                    {urgentConversations.length > 0 ? (
                      urgentConversations.map(conv => (
                        <div key={conv.id} onClick={() => { setActiveTab('conversations'); handleSelectConversation(conv); }} className="p-md rounded-lg border border-error/20 bg-error/5 flex justify-between items-center group cursor-pointer hover:bg-error/10 transition-colors">
                          <div className="flex items-center gap-md">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-primary font-bold">
                              {conv.user_identifier.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-body-md text-body-md text-on-surface m-0">+{conv.user_identifier}</p>
                              <p className="text-body-sm text-on-surface-variant m-0 truncate w-32">{formatLastMessagePreview(conv.last_message)}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-error font-bold text-body-md m-0">{formatConversationDate(conv.last_message.created_at)}</p>
                            <p className="text-[10px] uppercase tracking-wider text-error/60 m-0">En attente</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-on-surface-variant text-center opacity-70">
                        <span className="material-symbols-outlined text-4xl mb-sm">check_circle</span>
                        <p className="m-0 text-body-md">Aucune conversation<br/>urgente en attente.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
                    ) : activeTab === 'conversations' ? (
            <div className="flex flex-1 overflow-hidden h-full">
              {/* Panel 1: Conversation List */}
              <section className="w-80 flex flex-col border-r border-outline-variant bg-surface-container-lowest">
                <div className="p-md border-b border-outline-variant flex justify-between items-center">
                  <h2 className="font-headline-md text-[18px] text-on-surface">Conversations</h2>
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {data.conversations.length} ACTIVES
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {data.conversations.map(conv => (
                    <div 
                      key={conv.id} 
                      className={`p-md border-b border-outline-variant transition-colors cursor-pointer group ${selectedConversation?.id === conv.id ? 'bg-surface-container-high border-l-4 border-l-primary' : 'hover:bg-surface-container-low'}`}
                      onClick={() => handleSelectConversation(conv)}
                    >
                      <div className="flex gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getInitialsColor(conv.contact_name || conv.user_identifier)}`}>
                            {getInitials(conv.contact_name || conv.user_identifier)}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#25D366] rounded-full border-2 border-surface-container-lowest flex items-center justify-center">
                            <img alt="WhatsApp Icon" className="w-3 h-3" src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className={`font-bold truncate ${selectedConversation?.id === conv.id ? 'text-on-surface' : 'text-on-surface-variant group-hover:text-on-surface'}`}>
                              {conv.contact_name || `+${conv.user_identifier}`}
                            </h3>
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              {conv.last_message ? formatConversationDate(conv.last_message.created_at) : ''}
                            </span>
                          </div>
                          <p className={`text-body-sm truncate ${selectedConversation?.id === conv.id ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>
                            {formatLastMessagePreview(conv.last_message)}
                          </p>
                          {unreadCounts[conv.id] > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="w-2.5 h-2.5 bg-error rounded-full"></span>
                              <span className="text-[10px] text-error uppercase font-bold tracking-tight">
                                {unreadCounts[conv.id]} Non lus
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Panel 2: Chat Interface */}
              <section className="flex-1 flex flex-col bg-surface-container-lowest relative min-w-0">
                {selectedConversation ? (
                  <>
                    {/* Chat Header */}
                    <div className="h-16 px-lg border-b border-outline-variant flex items-center justify-between glass-panel z-10">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${getInitialsColor(selectedConversation.contact_name || selectedConversation.user_identifier)}`}>
                          {getInitials(selectedConversation.contact_name || selectedConversation.user_identifier)}
                        </div>
                        <div>
                          <h2 className="font-bold text-on-surface leading-tight">{selectedConversation.contact_name || `+${selectedConversation.user_identifier}`}</h2>
                          <p className="text-[12px] text-primary flex items-center gap-1.5 m-0">
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
                            {selectedConversation.contact_name ? `+${selectedConversation.user_identifier} | ` : ''}Client via WhatsApp
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center bg-surface-container-high rounded-full p-1 border border-outline-variant">
                        <button 
                          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-body-sm transition-all ${aiMode ? 'bg-primary text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                          onClick={() => handleToggleAiMode(true)}
                        >
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: aiMode ? "'FILL' 1" : "'FILL' 0" }}>smart_toy</span>
                          Mode IA
                        </button>
                        <button 
                          className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-body-sm transition-all ${!aiMode ? 'bg-primary text-on-primary-container shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                          onClick={() => handleToggleAiMode(false)}
                        >
                          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: !aiMode ? "'FILL' 1" : "'FILL' 0" }}>person</span>
                          Conseiller
                        </button>
                      </div>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-6 custom-scrollbar" id="chat-messages">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-start self-start' : 'items-end self-end'} max-w-[80%]`}>
                          <div className={`p-md rounded-2xl relative shadow-xl overflow-hidden border ${msg.sender === 'user' ? 'bg-surface-container text-on-surface rounded-tl-none border-outline-variant' : (msg.is_ai ? 'ai-message text-on-surface rounded-tr-none border-transparent' : 'bg-secondary-container text-on-secondary-container rounded-tr-none border-outline-variant/30')}`}>
                            
                            {msg.sender !== 'user' && msg.is_ai && (
                              <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 blur-2xl rounded-full"></div>
                            )}

                            {msg.sender !== 'user' && (
                              <div className={`flex items-center gap-2 mb-2 ${msg.is_ai ? 'text-primary' : 'text-secondary'}`}>
                                <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: msg.is_ai ? "'FILL' 1" : "'FILL' 0" }}>
                                  {msg.is_ai ? 'smart_toy' : 'person'}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest relative z-10">
                                  {msg.is_ai ? 'Assuria AI' : 'Conseiller'}
                                </span>
                              </div>
                            )}

                            <div className="text-body-md relative z-10">
                              {renderMessageContent(msg)}
                            </div>
                          </div>
                          <span className={`text-[10px] text-on-surface-variant mt-1 font-medium ${msg.sender === 'user' ? 'ml-1 text-left' : 'mr-1 text-right'}`}>
                            {safeFormat(msg.created_at, 'HH:mm')}
                          </span>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Footer: Input */}
                    <div className="p-lg glass-panel">
                      <form 
                        className="bg-surface-container-high rounded-2xl border border-outline-variant p-2 flex items-end gap-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all"
                        onSubmit={handleSendMessage}
                      >
                        <button type="button" className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                          <span className="material-symbols-outlined">add</span>
                        </button>
                        <textarea 
                          className="flex-1 bg-transparent border-none focus:ring-0 text-body-md py-2 resize-none max-h-32 custom-scrollbar text-on-surface placeholder:text-on-surface-variant focus:outline-none disabled:opacity-50"
                          placeholder={aiMode ? "Désactivé en mode IA" : "Votre réponse..."}
                          rows="1"
                          disabled={aiMode}
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if(newMessage.trim()) handleSendMessage(e);
                            }
                          }}
                        ></textarea>
                        <button 
                          type="submit" 
                          disabled={aiMode || !newMessage.trim()}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${aiMode || !newMessage.trim() ? 'bg-surface-container text-on-surface-variant opacity-50 cursor-not-allowed' : 'bg-primary text-on-primary-container hover:scale-105 active:scale-95'}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[64px] mb-4 opacity-50 text-primary">chat</span>
                    <p className="font-headline-md text-headline-md m-0">Sélectionnez une conversation</p>
                    <p className="text-body-md mt-2 opacity-70">Choisissez un client dans la liste pour démarrer.</p>
                  </div>
                )}
              </section>

              {/* Panel 3: Client Info Card */}
              {selectedConversation && (() => {
                const clientContext = selectedConversation.client_profile || {};
                const safeCreatedAt = safeFormat(selectedConversation.created_at, 'dd/MM/yyyy') || 'Non renseigné';
                const safeId = selectedConversation.id ? selectedConversation.id.slice(0, 8) : '';
                return (
                  <section className="w-80 border-l border-outline-variant bg-surface flex flex-col p-lg custom-scrollbar overflow-y-auto">
                    <div className="flex flex-col items-center mb-lg">
                      <div className="relative mb-4">
                        <div className="w-24 h-24 rounded-full border-4 border-surface-container-high bg-surface-container-highest flex items-center justify-center text-[36px] text-on-surface font-bold">
                          {selectedConversation.user_identifier ? selectedConversation.user_identifier.substring(0, 2).toUpperCase() : ''}
                        </div>
                        <div className="absolute bottom-1 right-1 w-6 h-6 bg-[#25D366] rounded-full border-2 border-surface flex items-center justify-center">
                          <img alt="WhatsApp" className="w-4 h-4" src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" />
                        </div>
                      </div>
                      <h3 className="font-headline-md text-on-surface text-center">+{selectedConversation.user_identifier}</h3>
                      <p className="text-body-sm text-on-surface-variant">ID: {safeId}</p>
                    </div>

                    <div className="space-y-6">
                      {/* Client Details */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Informations</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">call</span>
                            <span className="text-body-sm">+{selectedConversation.user_identifier}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">calendar_today</span>
                            <span className="text-body-sm">Inscrit le {safeCreatedAt}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Actions Rapides</h4>
                        <button 
                          onClick={() => {
                            setDossierFilterClient(selectedConversation.user_identifier);
                            setActiveTab('quotes');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl border border-outline-variant text-body-sm font-bold hover:bg-surface-container-high transition-colors text-left flex items-center gap-3 text-on-surface cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                          Voir les devis
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedFileClient(selectedConversation.user_identifier);
                            setExpandedClients(prev => ({ ...prev, [selectedConversation.user_identifier]: true }));
                            setActiveTab('files');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl border border-outline-variant text-body-sm font-bold hover:bg-surface-container-high transition-colors text-left flex items-center gap-3 text-on-surface cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">folder_shared</span>
                          Voir fichiers
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedConversation(null);
                            triggerNotification('Session fermée avec succès.');
                          }}
                          className="w-full py-2.5 px-4 rounded-xl border border-error/20 text-error text-body-sm font-bold hover:bg-error/5 transition-colors text-left flex items-center gap-3 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">block</span>
                          Fermer la session
                        </button>
                      </div>

                      {/* AI Insights Mini-Card */}
                      {Object.keys(clientContext).length > 0 && (
                        <div className="p-md rounded-2xl ai-message mt-4 shadow-md border border-primary/20">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                            <span className="text-[10px] font-bold text-primary uppercase">Mémoire IA (Contexte)</span>
                          </div>
                          <div className="text-[12px] text-on-surface leading-relaxed space-y-2">
                            {Object.entries(clientContext).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-on-surface-variant capitalize">{key}:</span> <span className="font-bold">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })()}
            </div>

          ) : activeTab === 'claims' ? (() => {
            // Flat Claims layout
            const claimStats = {
              total: data.claims.length,
              new: data.claims.filter(c => c.status === 'pending').length,
              processing: data.claims.filter(c => c.status === 'processing').length,
              resolved: data.claims.filter(c => c.status === 'resolved').length
            };

            return (
              <div className="flex flex-col gap-6 p-lg h-full overflow-y-auto custom-scrollbar no-print">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-headline-md text-[24px] text-on-surface m-0 font-bold">
                      {t('sidebar.claims', "Gestion des Sinistres")}
                    </h2>
                    <p className="text-body-sm text-on-surface-variant m-0 mt-1">
                      Index plat de toutes les déclarations de sinistres et leur état de traitement en temps réel.
                    </p>
                  </div>
                  <button onClick={exportClaims} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary-container rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border-none">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {t('buttons.export', "Exporter tout")}
                  </button>
                </div>

                {/* Stats cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label={t('stats.totalClaims')} value={claimStats.total} icon="shield" color="text-on-surface-variant" />
                  <StatCard label={t('stats.newClaims')} value={claimStats.new} icon="fiber_new" color="text-primary" />
                  <StatCard label={t('stats.processingClaims')} value={claimStats.processing} icon="hourglass_empty" color="text-[#FFC107]" />
                  <StatCard label={t('stats.resolvedClaims')} value={claimStats.resolved} icon="check_circle" color="text-error" />
                </div>

                {/* Flat Table */}
                <div className="glass-panel p-md">
                  {data.claims.length === 0 ? (
                    <div className="text-center py-xl text-on-surface-variant opacity-75">
                      <span className="material-symbols-outlined text-4xl mb-2">shield</span>
                      <p className="m-0 font-bold">Aucun sinistre enregistré</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low/50">
                      <table className="w-full text-left text-body-md text-on-surface">
                        <thead className="bg-surface-container border-b border-outline-variant text-on-surface-variant font-bold">
                          <tr>
                            <th className="px-6 py-4 font-medium">Référence</th>
                            <th className="px-6 py-4 font-medium">Client</th>
                            <th className="px-6 py-4 font-medium">Occurrence</th>
                            <th className="px-6 py-4 font-medium">Description</th>
                            <th className="px-6 py-4 font-medium">Détails (JSONB)</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium w-[160px]">Statut</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          {data.claims.map(claim => {
                            const phone = claim.conversations?.user_identifier || claim.user_phone || '';
                            const name = claim.conversations?.contact_name || claim.conversations?.client_profile?.name || '';
                            
                            // Occurrence chronologique per client
                            const clientClaimsChronological = data.claims
                              .filter(item => (item.conversations?.user_identifier || item.user_phone) === phone)
                              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                            const idx = clientClaimsChronological.findIndex(item => item.id === claim.id);
                            const occurrence = `Sinistre N°${idx + 1}`;

                            return (
                              <tr key={claim.id} className="hover:bg-surface-container-high transition-colors">
                                <td className="px-6 py-4 font-bold text-xs tracking-wider">#{claim.id.slice(0, 8)}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getInitialsColor(name || phone)} text-on-primary-container`}>
                                      {getInitials(name || phone)}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm text-on-surface">{name || `+${phone}`}</span>
                                      {name && <span className="text-[10px] text-on-surface-variant">+{phone}</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-bold text-xs text-primary">{occurrence}</td>
                                <td className="px-6 py-4 text-xs max-w-[200px] truncate" title={claim.description}>
                                  {claim.description || "Détails non fournis"}
                                </td>
                                <td className="px-6 py-4 flex gap-1 items-center overflow-x-auto max-w-[250px] custom-scrollbar">
                                  {renderDetailsTags(claim.details)}
                                </td>
                                <td className="px-6 py-4 text-on-surface-variant text-xs">
                                  {safeFormat(claim.created_at, 'd MMM yyyy HH:mm', { locale: fr })}
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={claim.status}
                                    onChange={(e) => updateClaimStatus(claim.id, e.target.value)}
                                    className="p-1.5 w-full bg-surface-container border border-outline-variant rounded-lg text-on-surface text-xs font-bold focus:border-primary focus:outline-none transition-colors cursor-pointer"
                                  >
                                    <option value="pending">Nouveau</option>
                                    <option value="processing">En cours</option>
                                    <option value="resolved">Clôturé</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        const conv = data.conversations.find(c => c.user_identifier === phone);
                                        if (conv) {
                                          handleSelectConversation(conv);
                                        }
                                        setActiveTab('conversations');
                                      }}
                                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                                      title="Voir la conversation"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">chat</span>
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedAttestationData(claim);
                                        setAttestationType('claim');
                                        setIsAttestationOpen(true);
                                        setCopiedAttestation(false);
                                      }}
                                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                                      title="Imprimer attestation"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">print</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
          : activeTab === 'quotes' ? (() => {
            // Flat Quotes layout
            const quoteStats = {
              total: data.quotes.length,
              pending: data.quotes.filter(q => q.status === 'pending').length,
              in_progress: data.quotes.filter(q => q.status === 'in_progress').length,
              sent: data.quotes.filter(q => q.status === 'sent').length,
              accepted: data.quotes.filter(q => q.status === 'accepted' || q.status === 'converted').length,
              rejected: data.quotes.filter(q => q.status === 'rejected').length
            };

            return (
              <div className="flex flex-col gap-6 p-lg h-full overflow-y-auto custom-scrollbar no-print">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="font-headline-md text-[24px] text-on-surface m-0 font-bold">
                      {t('sidebar.quotes', "Gestion des Devis")}
                    </h2>
                    <p className="text-body-sm text-on-surface-variant m-0 mt-1">
                      Index plat de toutes les demandes de devis et leur état de traitement en temps réel.
                    </p>
                  </div>
                  <button onClick={exportQuotes} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary-container rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border-none">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {t('buttons.export', "Exporter tout")}
                  </button>
                </div>

                {/* Stats cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <StatCard label={t('stats.totalQuotes')} value={quoteStats.total} icon="request_quote" color="text-on-surface-variant" />
                  <StatCard label={t('stats.pendingQuotes')} value={quoteStats.pending} icon="fiber_new" color="text-primary" />
                  <StatCard label={t('stats.inProgressQuotes')} value={quoteStats.in_progress} icon="hourglass_empty" color="text-[#FFC107]" />
                  <StatCard label={t('stats.sentQuotes')} value={quoteStats.sent} icon="send" color="text-info" />
                  <StatCard label={t('stats.acceptedQuotes')} value={quoteStats.accepted} icon="thumb_up" color="text-error" />
                  <StatCard label={t('stats.rejectedQuotes')} value={quoteStats.rejected} icon="thumb_down" color="text-on-surface-variant" />
                </div>

                {/* Flat Table */}
                <div className="glass-panel p-md">
                  {data.quotes.length === 0 ? (
                    <div className="text-center py-xl text-on-surface-variant opacity-75">
                      <span className="material-symbols-outlined text-4xl mb-2">request_quote</span>
                      <p className="m-0 font-bold">Aucun devis enregistré</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low/50">
                      <table className="w-full text-left text-body-md text-on-surface">
                        <thead className="bg-surface-container border-b border-outline-variant text-on-surface-variant font-bold">
                          <tr>
                            <th className="px-6 py-4 font-medium">Référence</th>
                            <th className="px-6 py-4 font-medium">Client</th>
                            <th className="px-6 py-4 font-medium">Type</th>
                            <th className="px-6 py-4 font-medium">Occurrence</th>
                            <th className="px-6 py-4 font-medium">Détails (JSONB)</th>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium w-[160px]">Statut</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          {data.quotes.map(quote => {
                            const phone = quote.conversations?.user_identifier || quote.user_phone || '';
                            const name = quote.conversations?.contact_name || quote.conversations?.client_profile?.name || '';
                            const insuranceType = quote.insurance_type || 'auto';
                            
                            // Occurrence chronologique per client
                            const clientQuotesChronological = data.quotes
                              .filter(item => (item.conversations?.user_identifier || item.user_phone) === phone)
                              .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

                            const idx = clientQuotesChronological.findIndex(item => item.id === quote.id);
                            
                            let displayType = "Auto";
                            if (insuranceType === 'health') displayType = "Santé";
                            else if (insuranceType === 'property') displayType = "Habitation";
                            
                            const occurrence = `${displayType} N°${idx + 1}`;

                            return (
                              <tr key={quote.id} className="hover:bg-surface-container-high transition-colors">
                                <td className="px-6 py-4 font-bold text-xs tracking-wider">#{quote.id.slice(0, 8)}</td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getInitialsColor(name || phone)} text-on-primary-container`}>
                                      {getInitials(name || phone)}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-sm text-on-surface">{name || `+${phone}`}</span>
                                      {name && <span className="text-[10px] text-on-surface-variant">+{phone}</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold uppercase text-on-surface-variant">
                                  {insuranceType}
                                </td>
                                <td className="px-6 py-4 font-bold text-xs text-primary">{occurrence}</td>
                                <td className="px-6 py-4 flex gap-1 items-center overflow-x-auto max-w-[250px] custom-scrollbar">
                                  {renderDetailsTags(quote.details)}
                                </td>
                                <td className="px-6 py-4 text-on-surface-variant text-xs">
                                  {safeFormat(quote.created_at, 'd MMM yyyy HH:mm', { locale: fr })}
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    value={quote.status}
                                    onChange={(e) => updateQuoteStatus(quote.id, e.target.value)}
                                    className="p-1.5 w-full bg-surface-container border border-outline-variant rounded-lg text-on-surface text-xs font-bold focus:border-primary focus:outline-none transition-colors cursor-pointer"
                                  >
                                    <option value="pending">En attente</option>
                                    <option value="in_progress">En cours</option>
                                    <option value="sent">Envoyé</option>
                                    <option value="converted">Accepté</option>
                                    <option value="rejected">Refusé</option>
                                  </select>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => {
                                        const conv = data.conversations.find(c => c.user_identifier === phone);
                                        if (conv) {
                                          handleSelectConversation(conv);
                                        }
                                        setActiveTab('conversations');
                                      }}
                                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                                      title="Voir la conversation"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">chat</span>
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setSelectedAttestationData(quote);
                                        setAttestationType('quote');
                                        setIsAttestationOpen(true);
                                        setCopiedAttestation(false);
                                      }}
                                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer"
                                      title="Imprimer attestation"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">print</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()
          : activeTab === 'files' ? renderFilesTab()
          : activeTab === 'help' ? (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto p-lg h-full overflow-y-auto custom-scrollbar w-full">
              <h2 className="font-headline-md text-[24px] text-on-surface m-0">Centre d'Aide</h2>
              
              <div className="glass-panel p-xl">
                <h3 className="text-[18px] font-bold text-on-surface mb-6 m-0">Foire Aux Questions</h3>
                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-body-lg font-bold text-on-surface mb-2 mt-0">Comment passer en mode Conseiller ?</h4>
                    <p className="text-body-md text-on-surface-variant leading-relaxed m-0">Dans l'onglet "Messages", sélectionnez une conversation puis utilisez le bouton en haut à droite (Mode IA / Conseiller). Une fois en mode Conseiller, l'IA ne répondra plus automatiquement à ce client.</p>
                  </div>
                  <div>
                    <h4 className="text-body-lg font-bold text-on-surface mb-2 mt-0">Que signifient les conversations urgentes ?</h4>
                    <p className="text-body-md text-on-surface-variant leading-relaxed m-0">Le tableau de bord met en évidence les clients dont le dernier message date de plus de 30 minutes et qui n'ont pas reçu de réponse. Cela nécessite souvent une intervention humaine.</p>
                  </div>
                  <div>
                    <h4 className="text-body-lg font-bold text-on-surface mb-2 mt-0">Comment exporter les données ?</h4>
                    <p className="text-body-md text-on-surface-variant leading-relaxed m-0">Dans les onglets "Sinistres" ou "Devis", cliquez sur le bouton "Exporter (Excel)" en haut à droite pour télécharger un fichier contenant toutes les données actuelles.</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-xl flex items-center justify-between bg-surface-container-lowest">
                <div>
                  <h3 className="text-[18px] font-bold text-on-surface mb-2 m-0">Besoin d'assistance technique ?</h3>
                  <p className="text-body-md text-on-surface-variant m-0">Notre équipe de support est disponible sur WhatsApp.</p>
                </div>
                <a 
                  href="https://wa.me/212600000000" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-[#25D366] text-white no-underline rounded-xl font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <MessageSquare size={20} />
                  Contacter le support
                </a>
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            <div className="flex flex-col gap-6 max-w-3xl mx-auto p-lg h-full overflow-y-auto custom-scrollbar w-full text-left">
              <h2 className="font-headline-md text-[24px] text-on-surface mb-2 m-0">{t('sidebar.settings')}</h2>
              
              {/* Section 1: Agent IA */}
              <div className="glass-panel p-xl flex flex-col gap-lg">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="material-symbols-outlined text-primary text-[28px]">smart_toy</span>
                  <h3 className="text-[18px] font-bold text-on-surface m-0">{t('settingsTab.agentSectionTitle', 'Agent IA')}</h3>
                </div>

                {/* Champ 1: Nom de l'agent */}
                <div className="flex flex-col gap-xs text-left">
                  <label className="text-body-md font-bold text-on-surface">{t('settingsTab.agentNameLabel', 'Nom de votre assistant IA')}</label>
                  <p className="text-body-sm text-on-surface-variant m-0">{t('settingsTab.agentNameDesc', 'Ce nom sera utilisé par l\'IA pour se présenter aux clients sur WhatsApp')}</p>
                  <input
                    type="text"
                    className="w-full p-md bg-surface-container-high border border-outline-variant/60 rounded-xl text-on-surface font-body-md focus:border-primary focus:outline-none transition-colors mt-xs"
                    value={agentNameState}
                    onChange={(e) => setAgentNameState(e.target.value)}
                    placeholder={t('settingsTab.agentNamePlaceholder', 'Ex: AssurIA, Assistant Imtiaz, Bot Wafaassur...')}
                  />
                </div>

                {/* Champ 2: Message d'accueil */}
                <div className="flex flex-col gap-xs text-left">
                  <label className="text-body-md font-bold text-on-surface">{t('settingsTab.welcomeMsgLabel', 'Message d\'accueil (premier contact avec un nouveau client)')}</label>
                  <p className="text-body-sm text-on-surface-variant m-0">{t('settingsTab.welcomeMsgDesc', 'Ce message est envoyé automatiquement lors du tout premier échange avec un nouveau client')}</p>
                  <textarea
                    rows={3}
                    className="w-full p-md bg-surface-container-high border border-outline-variant/60 rounded-xl text-on-surface font-body-md focus:border-primary focus:outline-none transition-colors resize-none mt-xs"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    placeholder={t('settingsTab.welcomeMsgPlaceholder', 'Ex: Bonjour ! Je suis AssurIA, l\'assistant de votre cabinet...')}
                  />
                </div>

                {/* Champ 3: Style de communication */}
                <div className="flex flex-col gap-xs text-left">
                  <label className="text-body-md font-bold text-on-surface">{t('settingsTab.commStyleLabel', 'Style de communication')}</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-xs">
                    {[
                      { id: 'numbered_options', label: t('settingsTab.numberedOptions', 'Proposer les options en liste numérotée') },
                      { id: 'formal', label: t('settingsTab.formal', 'Vouvoiement (ton formel)') },
                      { id: 'informal', label: t('settingsTab.informal', 'Tutoiement (ton informel et chaleureux)') },
                      { id: 'auto_language', label: t('settingsTab.autoLanguage', 'Détecter automatiquement la langue du client') },
                      { id: 'only_fr', label: t('settingsTab.onlyFr', 'Répondre uniquement en français') },
                      { id: 'only_ar', label: t('settingsTab.onlyAr', 'Répondre uniquement en arabe') }
                    ].map(opt => {
                      const isChecked = commStyle.split(',').includes(opt.id);
                      return (
                        <label 
                          key={opt.id} 
                          className={`flex items-center gap-md p-md rounded-xl border transition-all cursor-pointer select-none ${
                            isChecked 
                              ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm' 
                              : 'bg-surface-container-high border-outline-variant/40 text-on-surface-variant hover:bg-surface-container'
                          }`}
                        >
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStyle(opt.id)}
                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                          />
                          <span className="text-body-md">{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Champ 4: Instructions supplémentaires */}
                <div className="flex flex-col gap-xs text-left">
                  <label className="text-body-md font-bold text-on-surface">{t('settingsTab.customInstructionsLabel', 'Instructions personnalisées pour votre agent IA')}</label>
                  <p className="text-body-sm text-on-surface-variant m-0">{t('settingsTab.customInstructionsDesc', 'Ces instructions personnalisent le comportement de votre agent. Les règles techniques de gestion des dossiers sont gérées automatiquement par le système et ne peuvent pas être modifiées ici.')}</p>
                  <textarea
                    rows={8}
                    className="w-full p-md bg-surface-container-high border border-outline-variant/60 rounded-xl text-on-surface font-body-md focus:border-primary focus:outline-none transition-colors resize-none mt-xs"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={t('settingsTab.customInstructionsPlaceholder', 'Écrivez ici toutes les instructions spécifiques que vous souhaitez donner à votre agent. Par exemple : Toujours terminer chaque message par nos coordonnées. Ne jamais mentionner les tarifs. Toujours proposer un rappel téléphonique si le client hésite...')}
                  />
                </div>

                {/* Bouton de sauvegarde */}
                <div className="flex justify-end mt-md">
                  <button
                    onClick={handleSaveAgentSettings}
                    disabled={isAgentSettingsSaving}
                    className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 border-none shadow-md"
                  >
                    {isAgentSettingsSaving ? 'Sauvegarde...' : t('settingsTab.saveButton', 'Sauvegarder')}
                  </button>
                </div>
              </div>

              {/* Section 2: Apparence */}
              <div className="glass-panel p-xl flex flex-col gap-md">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="material-symbols-outlined text-primary text-[28px]">palette</span>
                  <h3 className="text-[18px] font-bold text-on-surface m-0">Apparence</h3>
                </div>
                <div className="flex justify-between items-center bg-surface-container-high p-md rounded-xl border border-outline-variant/30 flex-wrap gap-md">
                  <div>
                    <h4 className="font-bold text-on-surface text-body-lg m-0">Thème de l'interface</h4>
                    <p className="text-body-sm text-on-surface-variant m-0 mt-xs">Basculez entre le mode sombre premium et le mode clair épuré.</p>
                  </div>
                  <div className="flex items-center bg-surface-container-low rounded-full p-1 border border-outline-variant">
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-body-sm transition-all border-none cursor-pointer ${theme === 'dark' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface bg-transparent'}`}
                    >
                      <Moon size={16} />
                      Sombre
                    </button>
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-body-sm transition-all border-none cursor-pointer ${theme === 'light' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface bg-transparent'}`}
                    >
                      <Sun size={16} />
                      Clair
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 3: Langue */}
              <div className="glass-panel p-xl flex flex-col gap-md">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="material-symbols-outlined text-primary text-[28px]">language</span>
                  <h3 className="text-[18px] font-bold text-on-surface m-0">{t('settingsTab.languageSection')}</h3>
                </div>
                <div className="flex justify-between items-center bg-surface-container-high p-md rounded-xl border border-outline-variant/30 flex-wrap gap-md">
                  <div>
                    <h4 className="font-bold text-on-surface text-body-lg m-0">{t('settingsTab.languageSection')}</h4>
                    <p className="text-body-sm text-on-surface-variant m-0 mt-xs">{t('settingsTab.languageDesc')}</p>
                  </div>
                  <div className="flex items-center bg-surface-container-low rounded-full p-1 border border-outline-variant">
                    <button
                      onClick={() => setLanguage('fr')}
                      className={`px-4 py-2 rounded-full font-bold text-body-sm transition-all border-none cursor-pointer ${language === 'fr' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface bg-transparent'}`}
                    >
                      Français
                    </button>
                    <button
                      onClick={() => setLanguage('en')}
                      className={`px-4 py-2 rounded-full font-bold text-body-sm transition-all border-none cursor-pointer ${language === 'en' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface bg-transparent'}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('ar')}
                      className={`px-4 py-2 rounded-full font-bold text-body-sm transition-all border-none cursor-pointer ${language === 'ar' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:text-on-surface bg-transparent'}`}
                    >
                      عربي
                    </button>
                  </div>
                </div>
              </div>

              {/* Section 4: Cabinet d'Assurance */}
              <div className="glass-panel p-xl flex flex-col gap-md">
                <div className="flex items-center gap-sm mb-xs">
                  <span className="material-symbols-outlined text-primary text-[28px]">domain</span>
                  <h3 className="text-[18px] font-bold text-on-surface m-0">Cabinet d'Assurance</h3>
                </div>
                <p className="text-body-md text-on-surface-variant m-0">
                  Modifiez les informations générales de votre cabinet d'assurance (enregistrées localement).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-md mt-xs">
                  <div className="flex flex-col gap-xs">
                    <label className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Nom du Cabinet</label>
                    <input
                      type="text"
                      className="p-md bg-surface-container-high border border-outline-variant/60 rounded-xl text-on-surface font-body-md focus:border-primary focus:outline-none transition-colors"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-xs">
                    <label className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Téléphone</label>
                    <input
                      type="text"
                      className="p-md bg-surface-container-high border border-outline-variant/60 rounded-xl text-on-surface font-body-md focus:border-primary focus:outline-none transition-colors"
                      value={agencyPhone}
                      onChange={(e) => setAgencyPhone(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-xs">
                    <label className="text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">Email</label>
                    <input
                      type="email"
                      className="p-md bg-surface-container-high border border-outline-variant/60 rounded-xl text-on-surface font-body-md focus:border-primary focus:outline-none transition-colors"
                      value={agencyEmail}
                      onChange={(e) => setAgencyEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-sm">
                  <button
                    onClick={handleSaveAgency}
                    className="px-6 py-2.5 bg-primary text-on-primary font-bold rounded-xl hover:opacity-90 active:scale-95 transition-all border-none cursor-pointer"
                  >
                    Sauvegarder les infos
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

      {/* Lightbox Modal */}
      {lightboxMedia && (
        <div 
          className="fixed inset-0 w-[100vw] h-[100vh] bg-black/85 z-[9999] flex flex-col items-center justify-center p-6 animate-fade-in" 
          onClick={() => setLightboxMedia(null)}
        >
          <div 
            className="relative max-w-[90%] max-h-[80%] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute -top-10 right-0 bg-transparent border-none text-white text-[32px] cursor-pointer leading-none hover:text-primary transition-colors"
              onClick={() => setLightboxMedia(null)}
            >
              &times;
            </button>
            <img 
              src={lightboxMedia.url} 
              alt={lightboxMedia.description || "Media"} 
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl border border-white/10"
            />
            {lightboxMedia.description && (
              <p className="text-white mt-4 text-center text-sm bg-black/70 backdrop-blur-md px-5 py-2.5 rounded-full max-w-[600px] border border-white/10 leading-relaxed m-0">
                {lightboxMedia.description}
              </p>
            )}
          </div>
        </div>
      )}
      {/* New Policy Modal */}
      {showNewPolicyModal && (
        <div 
          className="fixed inset-0 w-[100vw] h-[100vh] bg-black/70 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-6"
          onClick={() => setShowNewPolicyModal(false)}
        >
          <div 
            className="glass-panel max-w-[500px] w-full p-xl rounded-2xl flex flex-col gap-lg animate-fade-in relative border border-outline-variant/60 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-md border-b border-outline-variant">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_card</span>
                <h3 className="font-headline-md text-headline-md text-on-surface m-0">Nouveau dossier</h3>
              </div>
              <button 
                className="bg-transparent border-none text-on-surface text-[24px] cursor-pointer hover:text-primary transition-colors"
                onClick={() => setShowNewPolicyModal(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateNewPolicy} className="flex flex-col gap-md">
              <div className="flex flex-col gap-sm">
                <label className="text-body-sm font-bold text-on-surface-variant uppercase tracking-wider text-left">Téléphone du client (WhatsApp)</label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-on-surface-variant font-bold text-body-md">+</span>
                  <input 
                    type="tel"
                    required
                    placeholder="212600000000"
                    value={newPolicyPhone}
                    onChange={(e) => setNewPolicyPhone(e.target.value)}
                    className="w-full bg-surface-container-high border border-outline-variant/60 text-on-surface rounded-xl pl-8 pr-4 py-3 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-semibold"
                  />
                </div>
                <span className="text-[10px] text-on-surface-variant opacity-80 text-left">Indiquez l'indicatif sans le signe + (ex: 2126XXXXXXXX pour le Maroc, 336XXXXXXXX pour la France)</span>
              </div>

              <div className="flex flex-col gap-sm">
                <label className="text-body-sm font-bold text-on-surface-variant uppercase tracking-wider text-left">Type de dossier</label>
                <div className="grid grid-cols-2 gap-md">
                  <button
                    type="button"
                    onClick={() => setNewPolicyType('quote')}
                    className={`flex items-center justify-center gap-sm py-3 px-4 rounded-xl border text-body-md font-bold transition-all cursor-pointer ${newPolicyType === 'quote' ? 'bg-primary/25 text-primary border-primary' : 'bg-surface-container border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">request_quote</span>
                    Devis
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPolicyType('claim')}
                    className={`flex items-center justify-center gap-sm py-3 px-4 rounded-xl border text-body-md font-bold transition-all cursor-pointer ${newPolicyType === 'claim' ? 'bg-[#FFC107]/25 text-[#FFC107] border-[#FFC107]' : 'bg-surface-container border-outline-variant/60 text-on-surface-variant hover:bg-surface-container-high'}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">report_problem</span>
                    Sinistre
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-sm">
                <label className="text-body-sm font-bold text-on-surface-variant uppercase tracking-wider text-left">Détails ou Description</label>
                <textarea
                  required
                  rows="4"
                  placeholder={newPolicyType === 'quote' ? "Ex: Assurance auto tous risques pour une Dacia Logan neuve..." : "Ex: Pare-brise fissuré suite à impact de gravillon sur l'autoroute..."}
                  value={newPolicyDetails}
                  onChange={(e) => setNewPolicyDetails(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/60 text-on-surface rounded-xl p-4 text-body-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none custom-scrollbar"
                ></textarea>
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowNewPolicyModal(false)}
                  className="py-3 px-5 rounded-xl border border-outline-variant/60 text-on-surface-variant font-bold hover:bg-surface-container transition-all cursor-pointer text-body-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPolicy}
                  className="py-3 px-6 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-body-sm border-none"
                >
                  {isSubmittingPolicy ? "Création..." : "Créer le dossier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Analyst AI Modal */}
      {isAnalystOpen && (
        <div 
          className="fixed inset-0 w-[100vw] h-[100vh] bg-black/70 backdrop-blur-md z-[999] flex flex-col items-center justify-center p-6 no-print"
          onClick={() => setIsAnalystOpen(false)}
        >
          <div 
            className="glass-panel max-w-[600px] w-full p-xl rounded-2xl flex flex-col gap-lg animate-fade-in relative border border-outline-variant/60 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-md border-b border-outline-variant">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                <h3 className="font-headline-md text-headline-md text-on-surface m-0">{t('dashboard.analystTitle')}</h3>
              </div>
              <button 
                className="bg-transparent border-none text-on-surface text-[24px] cursor-pointer hover:text-primary transition-colors"
                onClick={() => setIsAnalystOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-md text-left text-on-surface leading-relaxed">
              <p className="text-body-md m-0 font-medium">{t('dashboard.analystIntro')}</p>
              
              <ul className="space-y-sm my-0 pl-md text-body-md text-on-surface-variant list-disc">
                <li>
                  📈 <strong>Taux de Conversion des Devis :</strong> Les demandes de devis sont converties à hauteur de {Math.round((quoteStats.accepted / (quoteStats.total || 1)) * 100)}% ce mois-ci, une performance en progression constante grâce aux réponses instantanées et interactives de l'IA d'Assuria.
                </li>
                <li>
                  ⏱️ <strong>Délai de Traitement des Sinistres :</strong> Le délai moyen de traitement des sinistres a été réduit à 4,2 heures par dossier, accéléré par la collecte de pièces justificatives automatisée sur WhatsApp.
                </li>
                <li>
                  🤖 <strong>Autonomie Générale de l'IA :</strong> L'assistant virtuel AssurIA a géré de manière 100% autonome {Math.round((thisMonthMessages / (data.messages.length || 1)) * 100)}% des messages échangés ce mois-ci.
                </li>
              </ul>

              <div className="p-md rounded-xl bg-primary/10 border border-primary/20 flex gap-sm items-start mt-2">
                <span className="material-symbols-outlined text-primary text-[22px]">lightbulb</span>
                <p className="text-xs text-primary font-medium m-0 leading-relaxed">
                  <strong>Conseil de l'Analyste AI :</strong> Les demandes d'assurance Automobile représentent 78% des conversions ce mois-ci. Nous suggérons de renforcer les scénarios d'assistance rapide en ligne sur cette branche.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-md border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsAnalystOpen(false)}
                className="py-2.5 px-6 rounded-xl bg-primary text-on-primary font-bold hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer border-none text-body-sm"
              >
                {t('buttons.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Global Printable Attestation Modal */}
      {isAttestationOpen && selectedAttestationData && (
        <div className="fixed inset-0 w-[100vw] h-[100vh] bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-md overflow-y-auto no-print">
          <div className="glass-panel max-w-2xl w-full p-lg flex flex-col gap-6 relative shadow-2xl bg-surface-container border border-outline-variant/60">
            <button 
              onClick={() => {
                setIsAttestationOpen(false);
                setSelectedAttestationData(null);
              }}
              className="absolute top-4 right-4 bg-transparent border-none text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            
            <h3 className="font-headline-sm text-body-lg font-bold text-primary m-0 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
              {t('sidebar.attestation', "Attestation Provisoire d'Assurance")}
            </h3>
            
            {/* Printable Area */}
            <div id="printable-area" className="p-xl bg-white text-black border-2 border-black rounded-lg shadow-inner flex flex-col gap-6 printable-attestation-container max-h-[480px] overflow-y-auto text-left">
              <div className="flex justify-between items-start border-b-2 border-black pb-4">
                <div>
                  <h1 className="text-[20px] font-extrabold uppercase m-0 tracking-wide text-black" style={{ color: '#000000', margin: '0' }}>{agencyName || "AssurIA AI Maroc"}</h1>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black m-0 mt-1" style={{ color: '#000000' }}>Courtage & Conseil en Assurances</p>
                  <p className="text-[9px] text-gray-700 m-0" style={{ color: '#000000' }}>Tél: {agencyPhone} | Email: {agencyEmail}</p>
                </div>
                <div className="text-right">
                  <span className="border-2 border-black px-2 py-0.5 font-bold text-[10px] uppercase text-black">Attestation Provisoire</span>
                </div>
              </div>
              
              <div>
                <h2 className="text-[16px] font-bold text-center underline uppercase my-2 text-black" style={{ color: '#000000' }}>Attestation d'Assurance Active</h2>
                <p className="text-xs leading-relaxed text-black my-3" style={{ color: '#000000' }}>
                  Nous soussignés, <strong>{agencyName || "AssurIA AI"}</strong>, certifions par la présente que le client désigné ci-dessous fait l'objet d'une couverture d'assurance en vigueur auprès de nos services :
                </p>
              </div>
              
              {(() => {
                // Dynamically extract client profile based on attestationType
                let profile = {};
                let phone = '';
                let details = {};
                let title = 'Assurance';

                if (attestationType === 'quote') {
                  const q = selectedAttestationData;
                  profile = q.conversations?.client_profile || {};
                  phone = q.conversations?.user_identifier || q.user_phone || '';
                  details = q.details || {};
                  title = `Devis d'Assurance ${q.insurance_type || 'Auto'}`;
                } else if (attestationType === 'claim') {
                  const c = selectedAttestationData;
                  profile = c.conversations?.client_profile || {};
                  phone = c.conversations?.user_identifier || c.user_phone || '';
                  details = c.details || {};
                  title = `Déclaration de Sinistre`;
                } else {
                  // client direct
                  profile = selectedAttestationData.client_profile || {};
                  phone = selectedAttestationData.user_identifier || '';
                  details = {};
                  title = 'Dossier Client Actif';
                }

                const personalInfo = {
                  name: profile.name || profile.fullName || selectedAttestationData.contact_name || 'Non renseigné',
                  birthdate: profile.birthdate || profile.dob || profile.date_naissance || 'Non renseigné',
                  cin: profile.cin || profile.id_number || 'Non renseigné',
                  address: profile.address || profile.adresse || 'Non renseigné'
                };

                const v = profile.vehicle || details.vehicle || {};
                const brand = v.brand || v.make || v.marque || null;
                const model = v.model || v.modele || null;
                const year = v.year || v.annee || null;
                const plate = v.registration || v.plate || v.immatriculation || null;
                const vin = v.vin || null;

                const p = profile.property || details.property || {};
                const propType = p.type || p.property_type || null;
                const propAddr = p.address || p.adresse || null;
                const propSurface = p.surface || p.area || p.superficie || null;

                const h = profile.health || details.health || {};
                const healthInfo = h.conditions || h.details || h.coverage || null;

                return (
                  <>
                    <div className="grid grid-cols-2 gap-y-2 border border-black p-3 bg-gray-50 rounded animate-none" style={{ borderColor: '#000000', backgroundColor: '#f9fafb' }}>
                      <div><span className="text-[9px] font-bold uppercase text-gray-700 block">Nom du titulaire :</span><strong className="text-black text-xs">{personalInfo.name}</strong></div>
                      <div><span className="text-[9px] font-bold uppercase text-gray-700 block">Numéro CIN :</span><strong className="text-black text-xs">{personalInfo.cin}</strong></div>
                      <div><span className="text-[9px] font-bold uppercase text-gray-700 block">Date de naissance :</span><strong className="text-black text-xs">{personalInfo.birthdate}</strong></div>
                      <div><span className="text-[9px] font-bold uppercase text-gray-700 block">Téléphone ID :</span><strong className="text-black text-xs">+{phone}</strong></div>
                      <div className="col-span-2"><span className="text-[9px] font-bold uppercase text-gray-700 block">Adresse :</span><strong className="text-black text-xs">{personalInfo.address}</strong></div>
                    </div>
                    
                    <div className="border border-black p-3 bg-gray-50 rounded animate-none" style={{ borderColor: '#000000', backgroundColor: '#f9fafb' }}>
                      <span className="text-[9px] font-bold uppercase text-gray-700 block mb-1">Détails du risque / dossier ({title}) :</span>
                      {brand || model || plate ? (
                        <div className="grid grid-cols-3 gap-md text-xs text-black" style={{ color: '#000000' }}>
                          <div><strong>Marque / Modèle:</strong> {brand || 'N/A'} {model || ''}</div>
                          <div><strong>Immatriculation:</strong> {plate || 'N/A'}</div>
                          <div><strong>Année / VIN:</strong> {year || 'N/A'} • {vin || 'N/A'}</div>
                        </div>
                      ) : propType || propAddr ? (
                        <div className="grid grid-cols-2 gap-md text-xs text-black" style={{ color: '#000000' }}>
                          <div><strong>Type de bien:</strong> {propType || 'N/A'} ({propSurface ? `${propSurface} m²` : 'N/A'})</div>
                          <div><strong>Lieu du bien:</strong> {propAddr || 'N/A'}</div>
                        </div>
                      ) : healthInfo ? (
                        <div className="text-xs text-black" style={{ color: '#000000' }}>
                          <strong>Informations santé:</strong> {healthInfo}
                        </div>
                      ) : (
                        <div className="text-xs text-black leading-relaxed" style={{ color: '#000000' }}>
                          <strong>Description :</strong> {selectedAttestationData.description || selectedAttestationData.details?.user_input || 'Aucun bien ou détail spécifique enregistré.'}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
              
              <div className="mt-2 text-[11px] leading-relaxed text-black" style={{ color: '#000000' }}>
                <p className="m-0">Cette attestation provisoire est valable pour une durée de 30 jours à compter de sa date d'émission.</p>
                <p className="m-0 mt-1">Fait à Casablanca, le <strong>{safeFormat(new Date().toISOString(), 'd MMMM yyyy', { locale: fr })}</strong></p>
              </div>
              
              <div className="flex justify-between items-end mt-4 pt-3 border-t border-dashed border-black" style={{ borderColor: '#000000' }}>
                <div className="text-[8px] text-gray-500">Document généré automatiquement par le Portail AssurIA AI.</div>
                <div className="text-center font-bold text-[10px] uppercase text-black border-2 border-black px-3 py-1.5 bg-gray-100" style={{ borderColor: '#000000', backgroundColor: '#f3f4f6' }}>
                  Signature & Cachet
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex gap-4">
              <button 
                onClick={() => {
                  let name = 'Client';
                  let phone = '';
                  let detailsStr = '';
                  if (attestationType === 'quote') {
                    name = selectedAttestationData.conversations?.client_profile?.name || selectedAttestationData.conversations?.contact_name || 'Client';
                    phone = selectedAttestationData.conversations?.user_identifier || '';
                    detailsStr = JSON.stringify(selectedAttestationData.details || {});
                  } else if (attestationType === 'claim') {
                    name = selectedAttestationData.conversations?.client_profile?.name || selectedAttestationData.conversations?.contact_name || 'Client';
                    phone = selectedAttestationData.conversations?.user_identifier || '';
                    detailsStr = selectedAttestationData.description || '';
                  } else {
                    name = selectedAttestationData.client_profile?.name || selectedAttestationData.contact_name || 'Client';
                    phone = selectedAttestationData.user_identifier || '';
                    detailsStr = JSON.stringify(selectedAttestationData.client_profile || {});
                  }

                  const textToCopy = `
========================================
             ${(agencyName || "AssurIA AI Maroc").toUpperCase()}
   Courtage & Conseil en Assurances
========================================
ATTESTATION PROVISOIRE D'ASSURANCE ACTIVE

Désigné : ${name}
WhatsApp ID : +${phone}
Détails : ${detailsStr}

Fait à Casablanca, le ${safeFormat(new Date().toISOString(), 'd MMMM yyyy', { locale: fr })}
Document certifié par ${agencyName || "AssurIA AI"}.
                  `;
                  navigator.clipboard.writeText(textToCopy.trim());
                  setCopiedAttestation(true);
                  setTimeout(() => setCopiedAttestation(false), 2000);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold transition-all text-body-sm cursor-pointer border ${copiedAttestation ? 'bg-primary text-on-primary border-primary' : 'bg-transparent text-on-surface border-outline-variant hover:bg-surface-container-high'}`}
              >
                <span className="material-symbols-outlined text-[18px]">{copiedAttestation ? 'check' : 'content_copy'}</span>
                {copiedAttestation ? 'Copié !' : 'Copier tout'}
              </button>
              
              <button 
                onClick={() => {
                  window.print();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-primary text-on-primary-container rounded-xl font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer border-none"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function StatCard({ label, value, subtitle, icon, color = 'text-on-surface-variant' }) {
  return (
    <div className="glass-card p-md rounded-xl flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <span className="text-on-surface-variant font-label-md text-label-md">{label}</span>
        {icon && <span className={`material-symbols-outlined ${color}`}>{icon}</span>}
      </div>
      <div>
        <div className="text-display-lg font-display-lg leading-none text-on-surface">{value}</div>
        {subtitle && (
          <div className="text-primary text-body-sm font-body-sm mt-xs flex items-center gap-xs">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
