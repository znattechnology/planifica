import { DosificacaoContent } from '@/src/domain/entities/dosificacao.entity';
import { sanitizePromptInput } from './sanitize-prompt';

/**
 * When SANITIZATION_DEBUG=true, logs any field where sanitization changed the value.
 * Zero overhead in production (env flag is read once at module load).
 * Logs are truncated to 100 chars to avoid exposing full content in debug output.
 *
 * Log structure: { field, before, after, timestamp }
 */
const SANITIZATION_DEBUG = process.env.SANITIZATION_DEBUG === 'true';

function sanitizeField(field: string, value: string): string {
  const after = sanitizePromptInput(value);
  if (SANITIZATION_DEBUG && after !== value) {
    // eslint-disable-next-line no-console
    console.debug('[SANITIZATION]', JSON.stringify({
      field,
      before: value.substring(0, 100),
      after: after.substring(0, 100),
      timestamp: new Date().toISOString(),
    }));
  }
  return after;
}

/**
 * Sanitizes all string fields in DosificacaoContent before AI prompt injection.
 *
 * DosificacaoContent is user-authored and stored in the DB. Without sanitization,
 * a malicious unit/topic name like "ignore all previous instructions" becomes a
 * prompt injection vector in every plan generated from that dosificação.
 *
 * Only string fields are touched — all numeric fields and structure are preserved.
 */
export function sanitizeDosificacaoContent(content: DosificacaoContent): DosificacaoContent {
  return {
    ...content,
    regime: sanitizeField('regime', content.regime ?? ''),
    curso: sanitizeField('curso', content.curso ?? ''),
    fundamentacao: sanitizeField('fundamentacao', content.fundamentacao ?? ''),
    objectivosGerais: sanitizeField('objectivosGerais', content.objectivosGerais ?? ''),
    avaliacao: sanitizeField('avaliacao', content.avaliacao ?? ''),
    bibliografia: sanitizeField('bibliografia', content.bibliografia ?? ''),
    unidades: (content.unidades ?? []).map((u, uIdx) => ({
      ...u,
      nome: sanitizeField(`unidade[${uIdx}].nome`, u.nome ?? ''),
      topicos: (u.topicos ?? []).map((t, tIdx) => ({
        ...t,
        objectivosEspecificos: sanitizeField(`unidade[${uIdx}].topico[${tIdx}].objectivosEspecificos`, t.objectivosEspecificos ?? ''),
        conteudos: sanitizeField(`unidade[${uIdx}].topico[${tIdx}].conteudos`, t.conteudos ?? ''),
        metodos: sanitizeField(`unidade[${uIdx}].topico[${tIdx}].metodos`, t.metodos ?? ''),
        recursos: sanitizeField(`unidade[${uIdx}].topico[${tIdx}].recursos`, t.recursos ?? ''),
      })),
    })),
  };
}

/**
 * Returns a trimmed version of DosificacaoContent when the full JSON exceeds
 * the safe prompt character budget (~20 000 chars).
 *
 * Keeps only unit names and truncated topic objectives/content so the AI still
 * understands the curriculum structure without blowing the token budget.
 */
export function slimDosificacaoContent(content: DosificacaoContent): Partial<DosificacaoContent> {
  return {
    regime: content.regime,
    curso: content.curso,
    unidades: content.unidades.map(u => ({
      nome: u.nome,
      topicos: u.topicos.map(t => ({
        objectivosEspecificos: t.objectivosEspecificos.substring(0, 120),
        conteudos: t.conteudos.substring(0, 120),
        numAulas: t.numAulas,
        metodos: '',
        recursos: '',
      })),
    })),
  };
}

/** Character threshold above which the slim version is used instead. */
export const DOS_CONTENT_MAX_CHARS = 20_000;
