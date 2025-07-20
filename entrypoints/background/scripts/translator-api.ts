// Language Detector API: https://developer.chrome.com/docs/ai/language-detection
// Translator API: https://developer.chrome.com/docs/ai/translator-api
export const useTranslatorApi = async (targetLanguage: string, textSelection: string): Promise<string | Error> => {
  if (!('LanguageDetector' in self && 'Translator' in self)) {
    return new Error('Language Detector or Translator API are not supported in this environment.');
  }

  const detector = await LanguageDetector.create();
  const detection = await detector.detect(textSelection);
  const sourceLanguage = detection[0].detectedLanguage || 'en';

  if (sourceLanguage == targetLanguage) {
    return 'The source and target languages are the same.';
  }

  const translator = await Translator.create({
    sourceLanguage,
    targetLanguage,
  });

  return await translator.translate(textSelection);
}