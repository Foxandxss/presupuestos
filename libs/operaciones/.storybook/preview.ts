import type { Preview } from '@storybook/angular';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'app',
      values: [
        { name: 'app', value: '#f8fafc' },
        { name: 'card', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
    a11y: {
      element: '#storybook-root',
      config: {},
      options: {},
      manual: false,
    },
  },
  globalTypes: {
    tema: {
      description: 'Tema (light / dark)',
      defaultValue: 'light',
      toolbar: {
        title: 'Tema',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (storyFn, context) => {
      const tema = context.globals['tema'] ?? 'light';
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('app-dark', tema === 'dark');
        document.body.style.backgroundColor =
          tema === 'dark' ? '#0f172a' : '#f8fafc';
        document.body.style.color = tema === 'dark' ? '#f1f5f9' : '#0f172a';
        document.body.style.fontFamily =
          "'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
        document.body.style.fontSize = '14px';
      }
      return storyFn();
    },
  ],
};

export default preview;
