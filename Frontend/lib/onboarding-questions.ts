export const ONBOARDING_QUESTIONS = {
  businessType: {
    id: 'businessType',
    question: 'What type of business are you?',
    description: 'This helps us understand your context better',
    type: 'single-select' as const,
    required: true,
  },
  targetAudience: {
    id: 'targetAudience',
    question: 'Who is your primary audience?',
    description: 'Select what best describes your customer base',
    type: 'single-select' as const,
    required: true,
  },
  brandStyle: {
    id: 'brandStyle',
    question: 'How should the brand communicate? (Select all that apply)',
    description: 'These define how AI represents your brand in messages',
    type: 'multi-select' as const,
    required: true,
  },
  responsePreference: {
    id: 'responsePreference',
    question: 'What\'s your preferred response style?',
    description: 'This affects how detailed or concise AI-generated content will be',
    type: 'single-select' as const,
    required: true,
  },
  languageAndRegion: {
    id: 'languageAndRegion',
    question: 'Language & Region',
    description: 'Select your preferred language and operational region',
    type: 'select-pair' as const,
    required: true,
  },
  complianceNotes: {
    id: 'complianceNotes',
    question: 'Any compliance or safety guidelines? (Optional)',
    description: 'E.g., "No pricing discussion", "No medical claims", "No emojis"',
    type: 'text' as const,
    required: false,
  },
}
