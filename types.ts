// ============ Channel Types ============

export type Channel = 'email' | 'push' | 'inapp';
export type JourneyStatus = 'draft' | 'archived';
export type InAppMessageType = 'modal' | 'banner' | 'fullscreen';

// ============ Brief ============

export interface JourneyBrief {
  audience: string;
  goal: string;
  durationWeeks: number;
  featureFocus?: string;
  lifecycleStage?: string;
  additionalContext?: string;
}

// ============ Channel-Specific Content ============

export interface EmailContent {
  subject: string;
  preheader: string;
  headline: string;
  body: string;
  bullets: string[];
  primaryCtaText: string;
  primaryCtaUrl: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
}

export interface PushContent {
  title: string;
  body: string;
  deepLink?: string;
}

export interface InAppContent {
  messageType: InAppMessageType;
  title: string;
  body: string;
  buttonText: string;
  buttonAction: string;
}

export type TouchpointContent = EmailContent | PushContent | InAppContent;

// ============ Touchpoint ============

export interface Touchpoint {
  id: string;
  journeyId: string;
  sequence: number;
  day: number;
  channel: Channel;
  name: string;
  condition: string;
  reasoning: string;
  content: TouchpointContent;
  createdAt: string;
  updatedAt: string;
}

// ============ Journey ============

export interface Journey {
  id: string;
  name: string;
  brief: string;
  audience: string;
  goal: string;
  durationWeeks: number;
  featureFocus?: string;
  lifecycleStage?: string;
  touchpointCount: number;
  status: JourneyStatus;
  touchpoints: Touchpoint[];
  createdAt: string;
  updatedAt: string;
}

export interface JourneySummary {
  id: string;
  name: string;
  audience: string;
  goal: string;
  touchpointCount: number;
  status: JourneyStatus;
  createdAt: string;
  updatedAt: string;
}

// ============ AI Generation ============

export interface JourneyGenerationResult {
  journeyName: string;
  journeySummary: string;
  totalTouchpoints: number;
  durationDays: number;
  touchpoints: GeneratedTouchpoint[];
}

export interface GeneratedTouchpoint {
  sequence: number;
  day: number;
  channel: Channel;
  name: string;
  condition: string;
  reasoning: string;
  content: TouchpointContent;
}

// ============ Journey Analysis ============

export interface AnalysisItem {
  touchpointId?: number;  // sequence number for linking to UI
  detail: string;
  severity?: 'critical' | 'warning' | 'info';
}

export interface JourneyAnalysis {
  overallScore: number;
  overallAssessment: string;
  goalAlignment: { score: number; assessment: string; gaps: string[] };
  strengths: string[];
  issues: AnalysisItem[];
  criticalProblems: AnalysisItem[];
  channelStrategy: { score: number; assessment: string; findings: AnalysisItem[] };
  cadenceTiming: { score: number; assessment: string; findings: AnalysisItem[] };
  copyQuality: { score: number; assessment: string; findings: AnalysisItem[] };
  featureProgression: { score: number; assessment: string; findings: AnalysisItem[] };
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    detail: string;
    touchpointIds?: number[];
  }>;
}

