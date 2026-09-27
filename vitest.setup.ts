// Setup global dos testes: estende `expect` com os matchers de DOM
// (toBeInTheDocument, toBeDisabled, ...) usados pelos testes de componente.
// Rodar isto para toda a suíte é seguro mesmo nos testes de `db/`/serviços,
// que rodam em ambiente 'node' e nunca chamam esses matchers.
import '@testing-library/jest-dom/vitest';

// vitest.config.ts não usa `globals: true`, então o auto-cleanup do React
// Testing Library (que depende de um `afterEach` global implícito) não se
// registra sozinho — sem isto, o DOM de um teste de componente vaza para o
// próximo no mesmo arquivo (ex.: dois "Reabrir" na tela por causa de dois
// `render()` acumulados).
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
