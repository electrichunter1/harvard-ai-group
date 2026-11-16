import { bindings, defineConfig } from 'cf/config';

export default defineConfig(({ mode }) => {
  const values = {
    DB: process.env.HAG_D1_ID,
    ACCESS_ISSUER: process.env.HAG_ACCESS_ISSUER,
    ACCESS_AUD: process.env.HAG_ACCESS_AUD,
    OWNER_EMAIL: process.env.HAG_OWNER_EMAIL,
    PORTAL_ORIGIN: process.env.HAG_PORTAL_ORIGIN,
    PUBLIC_SITE: 'https://electrichunter1.github.io/harvard-ai-group/',
  };
  if (mode === 'production' && Object.values(values).some(value => !value)) {
    throw new Error('Set the Harvard AI Group portal environment variables before deployment.');
  }
  return {
    worker: {
      name: 'harvard-ai-group-portal',
      entrypoint: './worker.mjs',
      compatibilityDate: '2026-06-01',
      env: {
        ...(values.DB && { DB: bindings.d1({ id: values.DB }) }),
        ...Object.fromEntries(Object.entries(values).filter(([key, value]) => key !== 'DB' && value)
          .map(([key, value]) => [key, { type: 'text', value }])),
      },
      workersDev: true,
      previewUrls: false,
    },
  };
});
