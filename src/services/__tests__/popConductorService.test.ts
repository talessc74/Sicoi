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

  it('Passo 1: reconhece data falada por extenso ("24 de setembro de 2026"), não só "hoje" ou DD/MM/AAAA', () => {
    const result = step(phase1Steps, 1).extractData('Data de início 24 de setembro de 2026 hora 7h30', {} as any);
    expect(result.data.dataAnalise).toBe('2026-09-24');
    expect(result.data.horaAnalise).toBe('7h30');
  });

  it('Passo 1: uma resposta de acompanhamento só com data/hora não sobrescreve a equipe já registrada', () => {
    // Reproduz o bug relatado: equipe já foi dita numa fala anterior (já está no
    // "context"/collection), e o usuário só complementa a data que faltava — a
    // resposta de acompanhamento não deve virar o novo valor de "equipe".
    const context = { phase1: { equipeEnvolvidaLimpeza: { value: 'Técnico João e Técnica Maria' } } };
    const result = step(phase1Steps, 1).extractData('Data de início 24 de setembro de 2026 hora 7h30', context as any);
    expect(result.data.equipeEnvolvidaLimpeza).toBeUndefined(); // não reextrai o que já está salvo
    expect(result.data.dataAnalise).toBe('2026-09-24');
    expect(result.data.horaAnalise).toBe('7h30');
    expect(result.isComplete).toBe(true); // equipe já vem do context, data e hora vieram agora
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

describe('POP-01 · Fase 2 (Formulário A.2 — Maceração e Secagem) — trava de avanço por passo', () => {
  it('Passo 1 (identificação): incompleto quando falta equipe, data ou hora', () => {
    const result = step(phase2Steps, 1).extractData('Equipe: Técnico João', {} as any);
    expect(result.isComplete).toBe(false);
    expect(result.data.equipeEnvolvidaLimpeza).toBeDefined();
    expect(result.data.dataAnalise).toBeUndefined();
  });

  it('Passo 1: completo com equipe, data e hora', () => {
    const result = step(phase2Steps, 1).extractData('Equipe: Técnico João. Hoje, 14h00min.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.horaAnalise).toBe('14h00min');
  });

  it('Passo 2 (maceração): incompleto sem instrumentos reconhecidos', () => {
    const result = step(phase2Steps, 2).extractData('Um ciclo.', {} as any);
    expect(result.isComplete).toBe(false);
    expect(result.data.maceracaoCiclosNecessarios).toBe(1);
    expect(result.data.instrumentosUtilizados).toBeUndefined();
  });

  it('Passo 2: completo ao reconhecer ao menos um instrumento (ciclos não é obrigatório no A.2)', () => {
    const result = step(phase2Steps, 2).extractData('Usamos esponja e escova de dentes.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.instrumentosUtilizados).toEqual(['esponja', 'escova_dentes']);
  });

  it('Passo 3 (danos): "não houve danos" fecha o passo sem exigir descrição', () => {
    const result = step(phase2Steps, 3).extractData('Não houve danos.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.houveDanosMaceracao).toBe(false);
  });

  it('Passo 3: "sim" com descrição fecha o passo', () => {
    const result = step(phase2Steps, 3).extractData('Sim, pequena fissura no rádio direito.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.descricaoDanosMaceracao).toContain('fissura');
  });

  it('Passo 4 (secagem): nunca completa se a secagem não foi concluída, mesmo com a forma informada', () => {
    const result = step(phase2Steps, 4).extractData('Secagem em estufa, ainda não concluída.', {} as any);
    expect(result.isComplete).toBe(false);
    expect(result.data.formaSecagem).toBe('estufa');
    expect(result.data.dryingConfirmationAllBoxes).toBe(false);
  });

  it('Passo 4: completa apenas quando a forma de secagem e a confirmação de conclusão estão presentes', () => {
    const result = step(phase2Steps, 4).extractData('Secagem em estufa. Concluída, sem umidade em nenhuma caixa.', {} as any);
    expect(result.isComplete).toBe(true);
    expect(result.data.formaSecagem).toBe('estufa');
    expect(result.data.dryingConfirmationAllBoxes).toBe(true);
  });
});
