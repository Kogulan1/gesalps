import {getRequestConfig} from 'next-intl/server';

// Provides messages for the current request/locale
export default getRequestConfig(async ({locale}) => {
  const supported = ['en','de','fr','it'] as const;
  const current = (supported as readonly string[]).includes(locale as string) ? (locale as string) : 'en';
  try {
    const messages = (await import(`./messages/${current}.json`)).default;
    return {locale: current, messages};
  } catch {
    const messages = (await import(`./messages/en.json`)).default;
    return {messages, locale: 'en'};
  }
});
