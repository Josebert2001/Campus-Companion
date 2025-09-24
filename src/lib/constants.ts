export const APP_CONFIG = {
  name: 'Campus Companion',
  description: 'Your AI-powered study companion for better time management and academic success',
  version: '1.0.0',
  author: 'Campus Companion Team',
  university: 'University of Uyo',
} as const;

export const API_CONFIG = {
  timeout: 30000,
  retries: 3,
} as const;

export const UI_CONFIG = {
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  breakpoints: {
    mobile: 640,
    tablet: 768,
    desktop: 1024,
  },
} as const;