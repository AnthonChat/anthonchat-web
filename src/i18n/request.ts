import {getRequestConfig} from 'next-intl/server';
import {defaultLocale} from './routing';

// Simple request config that doesn't interfere with our layout-based message loading
export default getRequestConfig(async ({requestLocale}) => {
  const locale = await requestLocale || defaultLocale;
  
  return {
    locale,
    messages: {}
  };
});