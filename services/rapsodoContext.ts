// Rapsodo product context, Iterable fields, events — injected into AI prompts

export const ITERABLE_USER_FIELDS = {
  behavioral: [
    { field: 'mlm2numSessions', type: 'long', desc: 'Total sessions played' },
    { field: 'mlm2shotcount', type: 'long', desc: 'Total shots hit' },
    { field: 'total_training_sessions', type: 'long', desc: 'Practice sessions count' },
    { field: 'total_course_sessions', type: 'long', desc: 'Course rounds played' },
    { field: 'Date-MLM2 Last Played', type: 'date', desc: 'Last session date' },
    { field: 'last_mlm2_shot_date', type: 'date', desc: 'Last shot date' },
  ],
  modes: [
    { field: 'PRACTICE', type: 'string', desc: 'Practice mode usage' },
    { field: 'COMBINE', type: 'string', desc: 'Combine mode usage' },
    { field: 'SIM_RANGE', type: 'string', desc: 'Sim Range usage' },
    { field: 'SIM_RAPSODO_COURSES', type: 'string', desc: 'Courses mode usage' },
    { field: 'TARGET_TOTAL', type: 'string', desc: 'Target mode usage' },
    { field: 'SPEED', type: 'string', desc: 'Speed mode usage' },
  ],
  subscription: [
    { field: 'sub_status', type: 'string', desc: 'Subscription status' },
    { field: 'renewal_status', type: 'string', desc: 'Renewal status' },
    { field: 'MLM2 Latest Subscription Type', type: 'string', desc: 'Subscription tier' },
    { field: 'MLM2 Latest Subscription Start', type: 'date', desc: 'Sub start date' },
    { field: 'MLM2 Latest Subscription Expire', type: 'date', desc: 'Sub expire date' },
  ],
};

export const MIXPANEL_EVENTS = [
  { event: 'Hit Shot', volume: '1.12M', properties: ['Club Type', 'Play Type', 'Practice Mode', 'Shot success/fail'] },
  { event: 'Shot Hit Result', volume: '1.24M', properties: ['Game Mode', 'Shot success/fail', 'Club Type', 'MLM Device Type'] },
  { event: 'View Session Detail', volume: '78.9K', properties: ['Play mode', 'Number of shots', 'Clubs used', 'Number of clubs', 'Session location'] },
  { event: 'View Stats History', volume: '65.9K', properties: ['Club Filter', 'Time Filter'] },
  { event: 'Performance Combine', volume: '11.8K', properties: ['Combine Completed?', 'Stage (0-24)', 'Distance Selection'] },
  { event: 'Export Video', volume: '7.4K', properties: ['Export Result'] },
  { event: 'View Session Insights', volume: '6.3K', note: 'Low adoption = huge positive signal', properties: ['Club Types', 'Plan Type'] },
];

export const SERVER_EVENTS = [
  { event: 'Play Session v2', properties: ['Play Mode', '# of Shots Hit', '# of Successful Shots', '# of Failed Shots', 'Duration of Play Session', 'Course Name', 'Ball Type', 'Algo Mode'] },
  { event: 'Subscription Type Change MLM2', properties: ['Action', 'Previous Subscription Type', 'New Subscription Type', 'Previous/New Start/Expire/Cancellation Dates'] },
  { event: 'Complete Sign-Up', properties: ['Source', 'Registration Method', 'Operating System'] },
  { event: 'Sync Session', properties: ['Play Mode', '# of Shots/Swings', 'Duration', 'Sync Result'] },
  { event: 'In App Feedback', properties: ['Type', 'Category', 'Content', 'Plan Type'] },
];

export const RCLOUD_EVENTS = [
  { event: 'RCloud - Log in', properties: ['Redirect to Stripe', 'mlm2SubscriptionType'] },
  { event: 'RCloud - Watch Video', properties: ['Session Type', 'Algo Mode', 'Video Type'] },
  { event: 'RCloud - Subscription Success', properties: ['Subscription Type'] },
  { event: 'RCloud - Subscription Cancelation', properties: ['Cancelation Reason', 'Cancelation Details', 'Issues Encountered', 'Other Feedback'] },
  { event: 'RCloud - Session Detail', properties: ['Play Session'] },
  { event: 'RCloud - Export Video', properties: ['Export Success', 'Export Format'] },
  { event: 'RCloud - Export CSV', properties: ['Session Type'] },
];

export const LIFECYCLE_STAGES = [
  'Pre-Activation', 'Activated', 'Early Engagement', 'Progressing', 'Loyal', 'At-Risk', 'Churned'
];

export const ITERABLE_CHANNEL_IDS = {
  marketingEmail: 81836,
  transactionalEmail: 81837,
  push: 133028,
  inApp: 133085,
};

export const ITERABLE_FOLDER_ID = 1340586;

export const DEEP_LINKS = [
  'rapsodo://practice',
  'rapsodo://courses',
  'rapsodo://stats',
  'rapsodo://combine',
  'rapsodo://session-review',
  'rapsodo://session-insights',
  'rapsodo://settings',
  'rapsodo://my-bag',
  'rapsodo://target-mode',
  'rapsodo://export-video',
  'rapsodo://subscription',
];

export const WEB_URLS = {
  appDownloads: 'https://rapsodo.com/pages/app-downloads',
  learningCenter: 'https://rapsodo.com/pages/golf-learning-center',
  premiumMembership: 'https://rapsodo.com/pages/rapsodo-golf-mlm2pro-premium-membership',
  manageMembership: 'https://golf-cloud.rapsodo.com/profile/membership',
  rCloud: 'https://r-cloud.rapsodo.com',
  productPage: 'https://rapsodo.com/pages/mlm2pro-golf-simulator',
  simulation: 'https://rapsodo.com/pages/mlm2pro-golf-simulator-anywhere-anytime',
  faq: 'https://rapsodo.com/pages/frequently-asked-golf-questions-golf-faq',
  quickConnect: 'https://rapsodo.com/blogs/golf/mlm2pro-quick-connect-guide',
  premiumExplainer: 'https://rapsodo.com/blogs/golf/what-is-a-rapsodo-premium-membership',
  community: 'https://rapsodo.com/pages/rapsodo-golf-community',
  youtube: 'https://www.youtube.com/@Rapsodo',
};
