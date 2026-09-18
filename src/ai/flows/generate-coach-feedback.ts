'use server';
/**
 * @fileOverview Fluxo Genkit para análise visual de auditoria 5S com segurança server-side.
 * O Coach 5S avalia as fotos e o contexto textual, validando a autenticidade do usuário
 * e aplicando controle de cota FinOps (máximo 3 auditorias no plano de teste).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

// Inicializa o Firebase Admin SDK apenas uma vez no servidor
if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const GenerateCoachFeedbackInputSchema = z.object({
  idToken: z.string().describe('Token de ID do Firebase para autenticação.'),
  disciplineLevel: z.number().describe('Nível atual de disciplina do usuário (0-100).'),
  titulo: z.string().describe('Título da tarefa de auditoria.'),
  comentario: z.string().describe('Comentário do usuário sobre o que foi feito.'),
  beforePhotoUri: z.string().describe("Data URI da foto 'Antes' (base64)."),
  afterPhotoUri: z.string().describe("Data URI da foto 'Depois' (base64)."),
});
export type GenerateCoachFeedbackInput = z.infer<typeof GenerateCoachFeedbackInputSchema>;

const PilarSchema = z.object({
  nota: z.number().optional().describe('Nota do pilar de 0 a 10.'),
  diagnostico: z.string().optional().describe('Diagnóstico do que foi observado no ambiente.'),
  recomendacao: z.string().optional().describe('Recomendação prática de melhoria.'),
});

const GenerateCoachFeedbackOutputSchema = z.object({
  nota: z.number().int().min(0).max(100).describe('Nota final geral da auditoria baseada na melhoria observada (0-100).'),
  feedback_gamificado: z.string().describe('Mensagem ríspida ou motivacional do Coach 5S.'),
  coachTone: z.enum(['strict', 'motivational', 'neutral']).describe('Tom predominante da resposta.'),
  
  // ESTRUTURA COMPLETA DOS 5 PILARES (5S)
  analise_5s: z.object({
    seiri: PilarSchema.optional().describe('1S - Seiri (Utilização / Descarte).'),
    seiton: PilarSchema.optional().describe('2S - Seiton (Organização / Ordenação).'),
    seiso: PilarSchema.optional().describe('3S - Seiso (Limpeza / Inspeção).'),
    seiketsu: PilarSchema.optional().describe('4S - Seiketsu (Padronização / Asseio / Saúde).'),
    shitsuke: PilarSchema.optional().describe('5S - Shitsuke (Disciplina / Autocontrole).'),
  }).optional().describe('Análise estruturada dos 5 pilares do 5S.'),
});
export type GenerateCoachFeedbackOutput = z.infer<typeof GenerateCoachFeedbackOutputSchema>;

/**
 * Função auxiliar para aplicar timeout em promises.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

/**
 * Função wrapper exportada para ser chamada pelo frontend.
 */
export async function generateCoachFeedback(
  input: GenerateCoachFeedbackInput
): Promise<GenerateCoachFeedbackOutput> {
  const output = await generateCoachFeedbackFlow(input);
  revalidatePath('/');
  return output;
}

const prompt = ai.definePrompt({
  name: 'generateCoachFeedbackPrompt',
  input: {schema: GenerateCoachFeedbackInputSchema},
  output: {schema: GenerateCoachFeedbackOutputSchema},
  prompt: `Você é o 'Coach 5S', um mestre experiente em disciplina industrial e metodologia 5S japonesa. Sua missão é analisar visualmente as fotos de Antes e Depois e o contexto de uma auditoria.

CONTEXTO DA TAREFA:
Título: {{{titulo}}}
O que o aluno diz: {{{comentario}}}
Nível de Disciplina Atual: {{{disciplineLevel}}}

INSTRUÇÕES PRINCIPAIS:
1. Compare a foto de ANTES e a de DEPOIS minuciosamente.
2. Inspecione atentamente o carimbo no canto inferior direito de cada foto (data de captura real da câmera):
   - Se o carimbo acusar "⚠️ Foto de Arquivo" ou se as datas indicarem que o aluno usou uma foto antiga para fingir melhoria recente (o clássico golpe do 'depois limpo para sempre'), REPREENDA com severidade máxima! Use frases como "Auditoria 5S é disciplina no presente, não museu de fotos antigas!".
   - O intervalo entre o Antes e o Depois deve fazer sentido com o trabalho realizado.
3. Use o Título e o Comentário para entender se o aluno realmente atacou o problema certo.
4. Avalie a aplicação dos 5 sensos industriais.
4. Seja RÍSPIDO e DIRETO se a bagunça persistir ou se a melhoria for superficial. Frases de impacto como "A bagunça de hoje é o prejuízo de amanhã" ou "Meio-termo é fracasso disfarçado".
5. Se houver melhora expressiva, elogie a postura, mas lembre que "manter o padrão exige vigilância diária".
6. Mencione elementos específicos do título ("{{{titulo}}}") no seu feedback gamificado para comprovar que você analisou detalhadamente o caso.

ANÁLISE ESTRUTURADA DOS 5 PILARES (analise_5s):
Avalie os 5 sensos para enriquecer o diagnóstico:
- seiri (Descarte): Itens desnecessários foram removidos? Sobrou apenas o útil?
- seiton (Organização): O que ficou está ordenado, acessível e com identificação lógica?
- seiso (Limpeza): O chão, bancada e superfícies foram limpos e desobstruídos?
- seiketsu (Padronização): Há sinalização, etiquetas, demarcações visuais ou padrão evidente de conservação?
- shitsuke (Disciplina): O trabalho demonstra cuidado, comprometimento e atenção aos detalhes operacionais?

Para cada pilar, atribua uma nota (0 a 10), um diagnóstico objetivo e uma recomendação acionável.

Foto ANTES: {{media url=beforePhotoUri}}
Foto DEPOIS: {{media url=afterPhotoUri}}`,
});

const generateCoachFeedbackFlow = ai.defineFlow(
  {
    name: 'generateCoachFeedbackFlow',
    inputSchema: GenerateCoachFeedbackInputSchema,
    outputSchema: GenerateCoachFeedbackOutputSchema,
  },
  async (input) => {
    // 1. Validação de Segurança Nível P0
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(input.idToken);
    } catch (error) {
      throw new Error('Não autorizado: Falha na verificação do token de segurança.');
    }

    // 2. Trava FinOps: Limite de 3 auditorias no plano de teste gratuito (com bypass VIP para Admin)
    try {
      const adminDb = getFirestore();
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.exists ? userDoc.data() : null;
      const email = (decodedToken.email || '').toLowerCase();
      const isAdmin = userData?.role === 'admin' || (decodedToken as any).admin === true || email.includes('consultor.pedro1') || email.includes('pedro');

      if (!isAdmin) {
        const auditsCount = userData?.auditsCount ?? 0;
        if (auditsCount >= 3) {
          throw new Error('Limite atingido: Você já utilizou suas 3 auditorias de teste gratuitas.');
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Limite atingido')) {
        throw err;
      }
      // Se falhar ao ler o perfil, permite prosseguir defensivamente
      console.warn('Aviso FinOps: Não foi possível verificar contador de auditorias:', err);
    }

    // 3. Chamada da IA com timeout de 25 segundos para controle de custos
    const output = await withTimeout(
      prompt(input).then(res => res.output),
      25000,
      'Tempo limite excedido na análise da IA'
    );

    if (!output) {
      throw new Error('Falha ao gerar feedback do mestre Coach.');
    }
    return output;
  }
);
