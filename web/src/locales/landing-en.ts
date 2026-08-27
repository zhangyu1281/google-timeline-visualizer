/** English marketing / landing copy for index.html */
export const landingEn = {
  pageTitle: 'Timeline Visualizer — Free Google Timeline to Travel Video',
  ogTitle: 'Timeline Visualizer — Free Google Timeline to Travel Video',
  ogDescription:
    'Turn your Google Maps Timeline.json into an animated travel recap MP4. Free preview in your browser — download for $2.59.',
  navHowItWorks: 'How it works',
  navHowToExport: 'How to export',
  navFaq: 'FAQ',
  navGetStarted: 'Get started',
  heroEyebrow: 'Free preview · Private · Browser-based',
  heroHeading: 'Turn Google Timeline into a Travel Video',
  heroHeadingSeo: 'Google Timeline Visualizer — location history to animated travel recap',
  heroTagline: 'Your year on a map. One video. Zero upload.',
  heroSubtitle:
    'Upload your exported Google Maps Timeline.json, preview your travel recap for free, and download a shareable MP4 for $2.59 — processed entirely on your device.',
  heroCta: 'Create your video',
  heroTryDemo: 'Try demo — no file needed',
  heroVideoAriaLabel: 'Animated map route preview',
  stickyCreateVideo: 'Create video',
  tryDemoShort: 'Try demo',
  dropZoneHint: 'Drop your file here, or browse',
  browseFilesLabel: 'Browse files',
  exportHelpPrompt: 'Need to export first?',
  exportHelpLink: 'See the export guide',
  adLabel: 'Advertisement',
  howItWorksTitle: 'How Timeline Visualizer Works',
  howItWorksLead:
    'Three steps from Google Timeline export to shareable travel video — no account, no install.',
  howStep1Title: 'Export your Timeline',
  howStep1Body:
    'Google Maps stores location history on your phone. Export it as Timeline.json from iPhone or Android.',
  howStep1Link: 'Export guide →',
  howStep2Title: 'Upload in your browser',
  howStep2Body:
    'Drop your file here or browse. Your data stays on your device — we never receive your location history.',
  howStep2Link: 'Upload Timeline.json →',
  howStep3Title: 'Download your MP4',
  howStep3Body:
    'Pick dates, camera style, and format (Portrait for Reels, Landscape for YouTube). Preview for free, then download your recap for $2.59.',
  whyTitle: 'Why Use Timeline Visualizer?',
  whyPrivateTitle: 'Private by design',
  whyPrivateBody:
    'Your Timeline.json is parsed locally. Nothing is uploaded to our servers — only map tile coordinates go to Esri.',
  whyFreeTitle: 'Free preview, pay to download',
  whyFreeBody:
    'Create and preview your video for free. Download and share your MP4 for $2.59 — no account or subscription.',
  whyDevicesTitle: 'Works on phone & desktop',
  whyDevicesBody:
    'Export on your phone, create the video in Safari or Chrome. Portrait and landscape formats included.',
  whyShareTitle: 'Shareable MP4 output',
  whyShareBody:
    'H.264 video ready for Instagram, TikTok, YouTube, or messaging apps. Preview before you export.',
  exportSectionTitle: 'Export Your Timeline First',
  exportSectionLead:
    'Choose your platform for step-by-step instructions on getting Timeline.json from Google Maps.',
  exportCardIphoneTitle: 'iPhone',
  exportCardIphoneBody:
    'Export via Google Maps → Settings → Personal content → Export Timeline data.',
  exportCardIphoneLink: 'iPhone guide →',
  exportCardAndroidTitle: 'Android',
  exportCardAndroidBody:
    'Export from Google Maps or Android settings — two methods depending on your device.',
  exportCardAndroidLink: 'Android guide →',
  faqPreviewTitle: 'Frequently Asked Questions',
  faqPreviewQ1: 'Is my location data uploaded?',
  faqPreviewA1:
    'No. Timeline Visualizer reads your file locally in the browser. Map tiles are fetched from Esri, which may receive coordinates for areas in your journey.',
  faqPreviewQ2: 'Which browsers can create MP4 video?',
  faqPreviewA2:
    'Safari 16.4+ on iPhone and recent Chrome or Edge on desktop support WebCodecs H.264 encoding. Other browsers can load data but may not export video.',
  faqPreviewQ3: 'Does Google Takeout still work for Timeline?',
  faqPreviewA3:
    'For newer on-device Timeline data, export directly from Google Maps on your phone. Takeout no longer includes the same data for many users.',
  faqPreviewQ4: 'Is this an official Google product?',
  faqPreviewA4:
    'No. Timeline Visualizer is an unofficial third-party tool and is not affiliated with Google.',
  faqPreviewQ5: 'How much does MP4 download cost?',
  faqPreviewA5:
    'Creating and previewing your video is free. Downloading and sharing the MP4 costs $2.59 USD per video (plus any applicable tax at checkout). Payments are processed securely by Waffo Pancake.',
  faqPreviewReadAll: 'Read all FAQ →',
  finalCtaTitle: 'Ready to visualize your timeline?',
  finalCtaBody: 'Try the demo journey first — no file needed — or upload your own Timeline.json.',
  footerHowToExport: 'How to export',
  footerFaq: 'FAQ',
  footerPrivacy: 'Privacy',
  footerTerms: 'Terms',
  footerAbout: 'About',
  footerOpenSource: 'Open source',
  footerSupport: 'Support',
} as const;

export type LandingStrings = { readonly [K in keyof typeof landingEn]: string };
