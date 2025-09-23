import {getRequestConfig} from 'next-intl/server';

// Provides messages for the current request/locale
export default getRequestConfig(async ({locale}) => {
  const supported = ['en','de','fr','it'] as const;
  const current = (supported as readonly string[]).includes(locale as string) ? (locale as string) : 'en';
  
  // Debug logging
  console.log('i18n - Requested locale:', locale);
  console.log('i18n - Using locale:', current);
  
  try {
    const messages = (await import(`./messages/${current}.json`)).default;
    console.log('i18n - Loaded messages for:', current, 'Keys:', Object.keys(messages));
    return {locale: current, messages};
  } catch (error) {
    console.error('i18n - Failed to load messages for:', current, error);
    const messages = (await import(`./messages/en.json`)).default;
    return {messages, locale: 'en'};
  }
});
