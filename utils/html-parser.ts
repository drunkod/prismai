import DOMPurify from 'dompurify';
import type TurndownService from 'turndown';
import TurndownServiceJoplin from '@joplin/turndown';
import * as turndownPluginGfm from '@joplin/turndown-plugin-gfm';
import { Readability, isProbablyReaderable } from '@mozilla/readability';

export namespace HtmlParser {
  export const createTurndownService = (): TurndownService => {
    const turndownService: TurndownService = new TurndownServiceJoplin({
      codeBlockStyle: 'fenced',
    });
    turndownService.use(turndownPluginGfm.gfm);
    turndownService.addRule('fencedCodeBlock', {
      filter: (node: any, options: any) => {
        return (
          options.codeBlockStyle === 'fenced' &&
          node.nodeName === 'PRE' &&
          node.querySelector('code')
        );
      },
      replacement: (_: any, node: any, options: any) => {
        const language = (
          node
            .querySelector('code')
            .className.match(/language-(\S+)/) || [null, '']
        )[1];

        return (
          '\n\n' +
          options.fence +
          language +
          '\n' +
          node.textContent +
          '\n' +
          options.fence +
          '\n\n'
        );
      },
    });
    turndownService.addRule('stripElements', {
      filter: ['figure', 'picture', 'sup', 'style', 'script'],
      replacement: () => '',
    });
    return turndownService;
  };

  const removeMarkdownImages = (text: string) => {
    const withoutImages = text.replace(/!\[(.*?)\]\((.*?)\)/g, '');
    return withoutImages.replace(/\n{3,}/g, '\n\n');
  };

  export const parse = async (html: string): Promise<string | undefined> => {
    const turndownService = createTurndownService();

    try {
      const parser = new DOMParser();
      // Sanitize before parsing to prevent script execution
      const doc = parser.parseFromString(DOMPurify.sanitize(html), 'text/html');

      if (!isProbablyReaderable(doc)) {
        console.log('Page is not readerable.');
        return undefined;
      }
      const article = new Readability(doc, { keepClasses: true }).parse();
      if (article && article.content) {
        let content = turndownService.turndown(article.content);
        content = removeMarkdownImages(content);
        return content.trim();
      }
    } catch (error) {
      console.error('Error parsing HTML:', error);
      return undefined;
    }
  };
}
