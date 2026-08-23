export type UiLocale = {
    code: string;
    nativeName: string;
    languageCode: string;
    script?: string;
    fontFamily?: string;
    fontFamilyBold?: string;
  };
  
  export const FALLBACK_LOCALE = "en";
  
  export const SYSTEM_LOCALE = "system";
  
  export const UI_LOCALES: readonly UiLocale[] = [
    {
      code: "en",
      nativeName: "English",
      languageCode: "en",
    },
    {
      code: "pa",
      nativeName: "ਪੰਜਾਬੀ",
      languageCode: "pa",
      fontFamily: "NotoSansGurmukhi",
      fontFamilyBold: "NotoSansGurmukhi-Bold",
    },
  ];
  
  export const SUPPORTED_LOCALE_CODES = UI_LOCALES.map((locale) => locale.code);