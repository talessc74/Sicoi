---
name: _local-adr-policy-123-resiliencia-fase-4-error-boundary-e-tolerancia-nic
description: Resiliência e tolerância a falhas na Fase 4 (Curadoria Forense), introduzindo Error Boundary de fase, tolerância a identificadores NIC curtos (ex: COI-004) e inicialização defensiva de indivíduos, inventários e perfis biológicos.
apply-to: src/components/Phase4Curadoria.tsx, src/components/PhaseErrorBoundary.tsx, src/App.tsx, src/components/OdontogramViewer.tsx
valid-from: 2026-11-03
---

# _local-adr-policy-123: Resiliência da Fase 4, Error Boundary e Tolerância a Formatos de NIC

## Context and Problem Statement

Ao navegar nas abas da Fase 4 (Curadoria Forense) para conjuntos com identificadores no formato simplificado `COI-XXX` (como `COI-004`), ocorria travamento e interrupção na renderização.
A investigação revelou as seguintes causas raízes:
1. **Quebra de suposição no parser de NIC**: Funções internas presumiam `collection.nic.split('-')[2]`, válido para formatos legados de 3 partes (`NIC-2026-0001`), mas gerando `undefined` para `COI-004` (2 partes). Isso produzia identificadores corrompidos como `IND-undefined-01`.
2. **Propriedades não inicializadas em coleções novas**: Coleções recém-criadas iniciam com `individuals: []`, `osteologicalInventory: undefined` e sem foto de montagem oficial. O acesso direto a métodos em propriedades ausentes (`curationVersionStatus.toUpperCase()`, `teeth.find()`, `ind.biologicalProfile.sexEstimate.value`) causava exceções não tratadas no ciclo de vida do React.
3. **Ausência de isolamento de erros por componente**: Qualquer exceção não capturada em abas ou subcomponentes provocava o desmonte total da árvore do React, resultando em tela em branco para o usuário.

## Decision Outcome

1. **Criação do Componente `PhaseErrorBoundary` (`src/components/PhaseErrorBoundary.tsx`)**:
   - Captura erros de renderização em nível de fase sem desmontar a aplicação global (menu superior, seletor de coleções e barra lateral permanecem funcionais).
   - Exibe mensagem amigável ao perito com opção de reexecução e detalhes técnicos para depuração.
   - Envolve tanto `<Phase4Curadoria>` na raiz do `App.tsx` quanto a renderização interna da Fase 4.

2. **Parser Tolerante de Formatos de NIC**:
   - Extrai o sufixo numérico de maneira dinâmica: `const nicParts = (collection.nic || 'COI-01').split('-'); const nicCode = nicParts.length > 2 ? nicParts[2] : (nicParts[1] || '01');`.
   - Gera códigos consistentes tanto para `NIC-2026-0841` quanto para `COI-004` (`IND-004-01`).

3. **Inicialização Defensiva e Safe Chaining**:
   - `ensureBioProfile(ind)`: garante que qualquer hipótese individual possua perfil biológico completo com métodos e valores padrão (`Phenice 1969`, `Suchey-Brooks 1990`, etc.).
   - `activeInd.odontogram || generateInitialOdontogram()` e salvaguarda em `OdontogramViewer.tsx` (`safeTeeth = Array.isArray(teeth) ? teeth : []`), impedindo exceções ao navegar para a aba Odontograma em conjuntos vazios.
   - Acesso seguro a fotos de montagem aprovadas e justificativas via `collection.phase4?.completeAssemblyPhotoApproved` e `collection.phase4?.assemblyPhotoJustification`.

## References

- Arquivos modificados: `src/components/Phase4Curadoria.tsx`, `src/components/PhaseErrorBoundary.tsx`, `src/App.tsx`, `src/components/OdontogramViewer.tsx`, `src/components/OsteologicalInventoryViewer.tsx`
