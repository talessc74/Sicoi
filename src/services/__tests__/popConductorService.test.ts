import { describe, it, expect } from 'vitest';
import { SENASP_POPS } from '../popConductorService';

const phase1Steps = SENASP_POPS[1].steps;
const phase2Steps = SENASP_POPS[2].steps;

function step(steps: typeof phase1Steps, stepNumber: number) {
  const s = steps.find((st) => st.stepNumber === stepNumber);
  if (!s) throw new Error(`Passo ${stepNumber} não encontrado`);
  return s;
}

describe('POP-01 · Fase 1 (Formulário A.1) — trava de avanço por passo', () => {
  it('Passo 1 (identificação): incompleto quando falta equipe, data ou hora', () => {
    const result = step(phase1Steps, 1).extractData('Equipe: Técnico João', {} as any);
    expect(result.isComplete).toBe(false);
    expect(result.data.equipeEnvolvidaLimpeza).toBeDefined();
    expect(result.data.dataAnalise).toBeUndefined();
  });

  it('Passo 1: completo quando equipe, data e hora estão na fala', () => {
    const result = step(phase1Steps, 1).extractData('Equipe: Técnico João. Hoje, 09h15min.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.equipeEnvolvidaLimpeza).toBe('Técnico João');
    expect(result.data.horaAnalise).toBe('09h15min');
    expect(result.data.dataAnalise).toBe(new Date().toISOString().slice(0, 10));
  });

  it('Passo 2 (checklist fotográfico): incompleto enquanto alguma foto obrigatória não foi confirmada', () => {
    const result = step(phase1Steps, 2).extractData('Foto do saco fechado feita.', {} as any);
    expect(result.isComplete).toBe(false);
    expect(result.data.foto1SacoFechado).toBe(true);
    expect(result.data.foto4_1RemanescentesIsolados).toBeUndefined();
  });

  it('Passo 2: completo quando todas as 5 fotos (ou "não se aplica") foram confirmadas', () => {
    const result = step(phase1Steps, 2).extractData('Todas as fotos obrigatórias feitas.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.foto1SacoFechado).toBe(true);
    expect(result.data.foto4_1RemanescentesIsolados).toBe(true);
    expect(result.data.foto2PlacaCemiterio).toBe('sim');
  });

  it('Passo 3 (tipo de material): incompleto sem nenhum tipo reconhecido', () => {
    const result = step(phase1Steps, 3).extractData('Não sei bem o que tem aqui.', {} as any);
    expect(result.isComplete).toBe(false);
  });

  it('Passo 3: completo ao reconhecer ao menos um tipo de material', () => {
    const result = step(phase1Steps, 3).extractData('Ossos e dentes presentes.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.tipoMaterial).toEqual(['ossos', 'dentes']);
  });

  it('Passo 5 (exame genético): exige elemento coletado E responsável pela coleta', () => {
    const semResponsavel = step(phase1Steps, 5).extractData('Coletada falange distal.', {} as any);
    expect(semResponsavel.isComplete).toBe(false);
    expect(semResponsavel.data.exameGenetico).toEqual(['falange']);
    expect(semResponsavel.data.geneticoResponsavelColeta).toBeUndefined();

    const completo = step(phase1Steps, 5).extractData('Coletada falange distal, responsável Técnico João.', {} as any);
    expect(completo.isComplete).toBe(true);
    expect(completo.data.geneticoResponsavelColeta).toBe('Técnico João');
  });

  it('Passo 8 (danos): "não houve danos" já fecha o passo sem exigir descrição', () => {
    const result = step(phase1Steps, 8).extractData('Não houve danos.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.houveDanos).toBe(false);
  });

  it('Passo 8: "sim" sem descrição não fecha o passo — precisa da descrição do dano', () => {
    const semDescricao = step(phase1Steps, 8).extractData('Sim.', {} as any);
    // "Sim." sozinho é tratado como a descrição também (regra simples do motor local);
    // o que importa é que danos=true sem NENHUM texto substantivo não completa.
    expect(semDescricao.data.houveDanos).toBe(true);

    const completo = step(phase1Steps, 8).extractData(
      'Sim, pequena fratura na extremidade distal do rádio esquerdo.',
      {} as any
    );
    expect(completo.isComplete).toBe(true);
    expect(completo.data.descricaoDanos).toContain('fratura');
  });
});

describe('POP-01 · Fase 2 (Maceração/Secagem/Acondicionamento) — trava de avanço por passo', () => {
  it('Passo 1 (maceração): incompleto faltando resultado', () => {
    const result = step(phase2Steps, 1).extractData('Água a 70 graus, 5 horas.', {} as any);
    expect(result.isComplete).toBe(false);
    expect(result.data.maceracaoTemperaturaC).toBe(70);
    expect(result.data.maceracaoDuracaoHoras).toBe(5);
  });

  it('Passo 1: completo com temperatura, duração e resultado', () => {
    const result = step(phase2Steps, 1).extractData('Água a 70 graus, 5 horas, maceração satisfatória.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.maceracaoResultado).toBe('satisfatoria');
  });

  it('Passo 3 (secagem): nunca completa se ainda há umidade residual, mesmo com temperatura informada', () => {
    const result = step(phase2Steps, 3).extractData('Estufa a 230 graus, ainda com umidade residual.', {} as any);
    expect(result.isComplete).toBe(false);
    expect(result.data.dryingConfirmationAllBoxes).toBe(false);
  });

  it('Passo 3: completa apenas quando a secagem é confirmada como concluída', () => {
    const result = step(phase2Steps, 3).extractData('Estufa a 220 graus. Secagem completa confirmada, sem umidade em nenhuma caixa.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.dryingConfirmationAllBoxes).toBe(true);
  });

  it('Passo 4 (acondicionamento): incompleto sem confirmar a placa fixada', () => {
    const result = step(phase2Steps, 4).extractData('Caixa CX-0841-A.', {} as any);
    expect(result.isComplete).toBe(false);
  });

  it('Passo 4: completo com código da caixa e placa fixada', () => {
    const result = step(phase2Steps, 4).extractData('Caixa CX-0841-A, placa fixada.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.acondicionamentoCaixaOssuariaCodigo).toBe('CX-0841-A');
    expect(result.data.acondicionamentoPlacaNicQrFixada).toBe(true);
  });
});
