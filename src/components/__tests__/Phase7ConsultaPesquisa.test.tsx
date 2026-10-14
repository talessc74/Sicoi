// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Phase7ConsultaPesquisa } from '../Phase7ConsultaPesquisa';
import { createEmptyPhase1Data, createEmptyPhase2Data } from '../../data/phaseDefaults';
import {
  OsteologicalCollection,
  UserProfile,
  ResearchAuthorization,
  IndividualHypothesis
} from '../../types/sgccco';
import { friendlyMessage } from '../../utils/errorMessages';

function mockFetchOnce() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ commit: null })
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function baseIndividual(code: string): IndividualHypothesis {
  return {
    id: `ind-${code}`,
    code,
    confidence: 'alto',
    biologicalProfile: {
      sexEstimate: {
        value: 'masculino',
        methodCode: 'm1',
        bibliographicRef: 'ref',
        notes: ''
      },
      ageCategory: {
        value: 'adulto_medio',
        estimatedRangeYears: '30-40',
        methodCode: 'm2',
        bibliographicRef: 'ref'
      },
      statureCm: {
        estimatedValue: 170,
        methodCode: 'm3',
        bibliographicRef: 'ref'
      },
      ancestryIndication: {
        traitsObserved: '',
        methodCode: '',
        bibliographicRef: ''
      }
    },
    odontogram: []
  };
}

function baseCollection(nic: string): OsteologicalCollection {
  return {
    nic,
    currentPhase: 7,
    createdAt: new Date().toISOString(),
    createdByTechnician: 'Técnico de Teste',
    signatures: [],
    custodyChain: [],
    legalOrigin: { originInstitution: 'Instituto X' } as OsteologicalCollection['legalOrigin'],
    phase1: createEmptyPhase1Data(),
    phase2: createEmptyPhase2Data(),
    phase3: { boxLocations: [] } as OsteologicalCollection['phase3'],
    phase4: {
      curationVersionNumber: 1,
      curationVersionStatus: 'aprovada',
      curatorAuthor: 'Curadora de Teste',
      individuals: [baseIndividual(`IND-${nic}`)],
      skeletalElements: []
    },
    phase5: {
      pathologies: [],
      complementaryExams: [],
      physicalBoneMarking: { techniqueUsed: 'x', completed: false, elementsMarkedCount: 0 },
      finalPackagingInertMaterial: { materialUsed: 'x', boxesCompletedCount: 0 }
    },
    phase6: { finalLocations: [], publicQrActive: false } as OsteologicalCollection['phase6']
  } as unknown as OsteologicalCollection;
}

function baseAuthorization(overrides: Partial<ResearchAuthorization> = {}): ResearchAuthorization {
  return {
    id: 'auth-1',
    title: 'Projeto de Antropologia Forense',
    principalInvestigator: 'Dra. Pesquisadora',
    investigatorEmail: 'pesquisadora@uni.edu',
    institution: 'Universidade X',
    cepEthicsApprovalNumber: 'CEP-123',
    status: 'ativa',
    validFrom: '2026-01-01',
    validUntil: '2027-01-01',
    ...overrides
  } as ResearchAuthorization;
}

function curadorUser(): UserProfile {
  return {
    id: 'u1',
    name: 'Dra. Helena Rios',
    role: 'curador',
    institution: 'INC/DITEC/PF',
    email: 'helena.rios@inc.pf.gov.br'
  };
}

function pesquisadorUser(): UserProfile {
  return {
    id: 'u2',
    name: 'Dra. Pesquisadora',
    role: 'pesquisador',
    institution: 'Universidade X',
    email: 'pesquisadora@uni.edu'
  };
}

function administradorUser(): UserProfile {
  return {
    id: 'u3',
    name: 'Admin',
    role: 'administrador',
    institution: 'INC/DITEC/PF',
    email: 'admin@inc.pf.gov.br'
  };
}

function tecnicoUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'u4',
    name: 'Técnico de Laboratório',
    role: 'tecnico',
    institution: 'INC/DITEC/PF',
    email: 'tecnico@inc.pf.gov.br',
    ...overrides
  };
}

describe('Phase7ConsultaPesquisa', () => {
  it('com papel amplo (curador), ambos os conjuntos aparecem disponíveis para busca', () => {
    mockFetchOnce();
    const collections = [baseCollection('NIC-2026-0001'), baseCollection('NIC-2026-0002')];
    const authorizations: ResearchAuthorization[] = [];

    render(
      <Phase7ConsultaPesquisa
        collections={collections}
        currentUser={curadorUser()}
        authorizations={authorizations}
        onUpdateAuthorizations={vi.fn()}
        onUpdateCollections={vi.fn()}
      />
    );

    expect(screen.getByText('NIC-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('NIC-2026-0002')).toBeInTheDocument();
    expect(screen.getByText(/Busca Estruturada & IA \(2 resultados\)/)).toBeInTheDocument();
  });

  it('pesquisador com autorização restrita a um NIC não consegue ver o conjunto fora do escopo', () => {
    mockFetchOnce();
    const collections = [baseCollection('NIC-2026-0001'), baseCollection('NIC-2026-0002')];
    const authorizations: ResearchAuthorization[] = [
      baseAuthorization({
        principalInvestigator: 'Dra. Pesquisadora',
        institution: 'Universidade X',
        scope: {
          allowedAnatomicalElements: [],
          allowedCollectionsNic: ['NIC-2026-0001'],
          allowedVariables: [],
          allowedMediaTypes: [],
          exportFormatAllowed: []
        } as ResearchAuthorization['scope']
      })
    ];

    render(
      <Phase7ConsultaPesquisa
        collections={collections}
        currentUser={pesquisadorUser()}
        authorizations={authorizations}
        onUpdateAuthorizations={vi.fn()}
        onUpdateCollections={vi.fn()}
      />
    );

    expect(screen.getByText('NIC-2026-0001')).toBeInTheDocument();
    expect(screen.queryByText('NIC-2026-0002')).not.toBeInTheDocument();
    expect(screen.getByText(/Busca Estruturada & IA \(1 resultados\)/)).toBeInTheDocument();

    // Banner de escopo ABAC deve estar visível para o pesquisador
    expect(screen.getByText(/Escopo de Pesquisa Delimitado por ABAC/)).toBeInTheDocument();
  });

  it('exibe as autorizações existentes na aba de Gestão ABAC', async () => {
    mockFetchOnce();
    const user = userEvent.setup();
    const collections = [baseCollection('NIC-2026-0001')];
    const authorizations: ResearchAuthorization[] = [
      baseAuthorization({
        title: 'Projeto Restrito ao NIC-2026-0001',
        scope: {
          allowedAnatomicalElements: [],
          allowedCollectionsNic: ['NIC-2026-0001'],
          allowedVariables: [],
          allowedMediaTypes: [],
          exportFormatAllowed: []
        } as ResearchAuthorization['scope']
      })
    ];
    const onUpdateAuthorizations = vi.fn();

    render(
      <Phase7ConsultaPesquisa
        collections={collections}
        currentUser={curadorUser()}
        authorizations={authorizations}
        onUpdateAuthorizations={onUpdateAuthorizations}
        onUpdateCollections={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Gestão ABAC de Autorizações/i }));

    expect(screen.getByText('Projeto Restrito ao NIC-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('NIC-2026-0001')).toBeInTheDocument();
  });

  it('Administrador: botão "Criar Autorização" fica desabilitado sem NICs autorizados', async () => {
    mockFetchOnce();
    const user = userEvent.setup();

    render(
      <Phase7ConsultaPesquisa
        collections={[]}
        currentUser={administradorUser()}
        authorizations={[]}
        onUpdateAuthorizations={vi.fn()}
        onUpdateCollections={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Gestão ABAC de Autorizações/i }));
    await user.click(screen.getByRole('button', { name: /Nova Autorização/i }));

    await user.type(screen.getByPlaceholderText('Título do projeto'), 'Projeto Y');
    await user.type(screen.getByPlaceholderText('Pesquisador principal'), 'Dr. Y');
    await user.type(screen.getByPlaceholderText('E-mail do pesquisador'), 'y@uni.edu');
    await user.type(screen.getByPlaceholderText('Instituição'), 'Universidade Y');
    await user.type(screen.getByPlaceholderText('Número de aprovação do CEP'), 'CEP-999');
    await user.type(screen.getByLabelText('Válida de:'), '2026-01-01');
    await user.type(screen.getByLabelText('Válida até:'), '2026-12-31');

    const createButton = screen.getByRole('button', { name: /Criar Autorização/i });
    expect(createButton).toBeDisabled();

    await user.type(screen.getByPlaceholderText(/NICs autorizados/), 'NIC-2026-0001');
    expect(createButton).toBeEnabled();
  });

  it('Administrador: revogar uma autorização limpa um erro anterior de criação', async () => {
    const user = userEvent.setup();
    const authToRevoke = baseAuthorization({ id: 'auth-revoke', title: 'Projeto a Revogar' });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url === '/api/version') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ commit: null }) });
        }
        if (url === '/api/research-authorizations' && init?.method === 'POST') {
          return Promise.resolve({ ok: false, status: 409, json: async () => ({ error: 'Já existe uma autorização com esse id.', code: 'AUTORIZACAO_ID_DUPLICADO' }) });
        }
        if (url === `/api/research-authorizations/${authToRevoke.id}` && init?.method === 'PUT') {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ authorization: { ...authToRevoke, status: 'revogada' } }) });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
      })
    );

    const onUpdateAuthorizations = vi.fn();
    render(
      <Phase7ConsultaPesquisa
        collections={[]}
        currentUser={administradorUser()}
        authorizations={[authToRevoke]}
        onUpdateAuthorizations={onUpdateAuthorizations}
        onUpdateCollections={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /Gestão ABAC de Autorizações/i }));
    await user.click(screen.getByRole('button', { name: /Nova Autorização/i }));
    await user.type(screen.getByPlaceholderText('Título do projeto'), 'Projeto Duplicado');
    await user.type(screen.getByPlaceholderText('Pesquisador principal'), 'Dr. Y');
    await user.type(screen.getByPlaceholderText('E-mail do pesquisador'), 'y@uni.edu');
    await user.type(screen.getByPlaceholderText('Instituição'), 'Universidade Y');
    await user.type(screen.getByPlaceholderText('Número de aprovação do CEP'), 'CEP-999');
    await user.type(screen.getByPlaceholderText(/NICs autorizados/), 'NIC-2026-0001');
    await user.type(screen.getByLabelText('Válida de:'), '2026-01-01');
    await user.type(screen.getByLabelText('Válida até:'), '2026-12-31');
    await user.click(screen.getByRole('button', { name: /Criar Autorização/i }));

    expect(await screen.findByText(friendlyMessage('AUTORIZACAO_ID_DUPLICADO'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Revogar/i }));

    await screen.findByText('Revogar');
    expect(screen.queryByText(friendlyMessage('AUTORIZACAO_ID_DUPLICADO'))).not.toBeInTheDocument();
  });

  it('Técnico sem acesso de Exportação Científica (padrão do papel, §13) vê o botão desabilitado', () => {
    mockFetchOnce();
    const collections = [baseCollection('NIC-2026-0001')];

    render(
      <Phase7ConsultaPesquisa
        collections={collections}
        currentUser={tecnicoUser()}
        authorizations={[]}
        onUpdateAuthorizations={vi.fn()}
        onUpdateCollections={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Exportação Reprodutível/i })).toBeDisabled();
  });

  it('Técnico com o ajuste de acesso ligado (§13) consegue exportar mesmo sem ser Curador/Administrador/Pesquisador', async () => {
    mockFetchOnce();
    const user = userEvent.setup();
    const collections = [baseCollection('NIC-2026-0001')];

    render(
      <Phase7ConsultaPesquisa
        collections={collections}
        currentUser={tecnicoUser({ exportAccess: true })}
        authorizations={[]}
        onUpdateAuthorizations={vi.fn()}
        onUpdateCollections={vi.fn()}
      />
    );

    const exportButton = screen.getByRole('button', { name: /Exportação Reprodutível/i });
    expect(exportButton).not.toBeDisabled();
    await user.click(exportButton);
    expect(screen.getByText(/Exportação Reprodutível do Acervo/i)).toBeInTheDocument();
  });

  it('Curador continua com Exportação Científica liberada por padrão', () => {
    mockFetchOnce();
    const collections = [baseCollection('NIC-2026-0001')];

    render(
      <Phase7ConsultaPesquisa
        collections={collections}
        currentUser={curadorUser()}
        authorizations={[]}
        onUpdateAuthorizations={vi.fn()}
        onUpdateCollections={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Exportação Reprodutível/i })).not.toBeDisabled();
  });
});
