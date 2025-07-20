// Summarizer API: https://developer.chrome.com/docs/ai/summarizer-api
export const useSummarizerApi = async (textSelection: string): Promise<string | Error> => {
  const options: SummarizerCreateCoreOptions = {
    type: 'tldr',
    format: 'plain-text',
    length: 'medium',
  }

  if ('Summarizer' in self) {
    try {
      const summarizer = await Summarizer.create(options);
      return await summarizer.summarize(textSelection);
    } catch (e) {
        return new Error('Could not create or use summarizer.')
    }
  }

  return new Error('Summarizer API is not supported in this environment.');
}