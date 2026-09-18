'use server';
/**
 * @fileOverview Fluxo Genkit para análise visual de 1 foto de espaço de trabalho.
 * Calcula o Score de Foco, diagnostica poluição visual e gera plano de 3 passos de ação.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";


const AnalisarFocoInputSchema = z.object({
  photoUri: z.string().describe("Data URI da foto em base64."),
  ambienteTipo: z.string().optional().describe("Tipo de ambiente: mesa, home office, quarto, bancada."),
  observacoes: z.string().optional().describe("Observações opcionais do usuário."),
});
export type AnalisarFocoInput = z.infer<typeof AnalisarFocoInputSchema>;

const PassoAcaoSchema = z.object({
  passo: z.number().describe("Número de 1 a 3"),
  acao: z.string().describe("Instrução acionável e direta (ex: Guarde os copos e jogue papéis no lixo)"),
  tempo_estimado: z.string().describe("Tempo estimado (ex: 30 segundos, 1 minuto)"),
});

const AnalisarFocoOutputSchema = z.object({
  score_foco: z.number().int().min(0).max(100).describe("Índice de Foco e Clareza Visual do ambiente de 0 a 100."),
  nivel: z.enum(["critico", "atencao", "bom", "zen"]).describe("Classificação do nível de foco."),
  nivel_rotulo: z.string().describe("Rótulo amigável (ex: Alerta de Distração, Razoável, Espaço Otimizado, Estado Zen)."),
  diagnostico: z.string().describe("Diagnóstico direto em 2 frases sobre o impacto visual do espaço no cérebro."),
  distracoes_detectadas: z.array(z.string()).describe("Lista de 3 a 5 itens físicos reais detectados na foto que roubam atenção."),
  plano_3_passos: z.array(PassoAcaoSchema).describe("Exatamente 3 passos práticos para arrumar a mesa em 3 minutos."),
  ganho_produtividade: z.string().describe("Estimativa de ganho de foco ao concluir (ex: +35% de clareza mental)."),
  texto_linkedin: z.string().describe("Texto pronto e engajador para o usuário copiar e postar no LinkedIn com o print."),
});
export type AnalisarFocoOutput = z.infer<typeof AnalisarFocoOutputSchema>;

interface AnalisarFocoResult {
  success: boolean;
  data?: AnalisarFocoOutput;
  error?: string;
}

const prompt = ai.definePrompt({
  name: "analisarFocoAmbientePrompt",
  input: { schema: AnalisarFocoInputSchema },
  output: { schema: AnalisarFocoOutputSchema },
  prompt: `Você é uma IA especialista em Ergonomia Cognitiva, Psicologia Ambiental e Produtividade Pessoal no estilo DeskZen.
Sua missão é analisar uma ÚNICA FOTO de um espaço de trabalho (mesa, home office, bancada ou quarto) e avaliar o nível de foco vs poluição visual.

Tipo de Ambiente informado: {{{ambienteTipo}}}
Observações do usuário: {{{observacoes}}}

INSTRUÇÕES DE ANÁLISE VISUAL:
1. Examine a foto minuciosamente:
   - Identifique objetos espalhados, louças, copos, fios soltos, excesso de papéis, pilhas, lixo visível e embalagens.
   - Avalie a ergonomia: teclado, mouse, monitor e área livre para os braços.
   - Avalie a iluminação, harmonia e ordem.

2. CÁLCULO DO SCORE DE FOCO (0 a 100):
   - 0 a 40 (critico - Alerta de Distração): Espaço com muita desordem, poluição visual alta, objetos aleatórios competindo pela atenção.
   - 41 a 69 (atencao - Razoável): Funcional, mas com itens fora do lugar roubando energia mental sutilmente.
   - 70 a 89 (bom - Espaço Otimizado): Organizado, poucos itens desnecessários, boa área livre de trabalho.
   - 90 a 100 (zen - Estado Zen): Minimalista, limpo, inspirador, foco total e fluidez.

3. DISTRAÇÕES DETECTADAS:
   - Liste 3 a 5 itens específicos e reais visíveis na foto (ex: "Copos ou garrafas acumulados", "Cabos enrolados visíveis", "Folhas e anotações espalhadas", "Objetos pessoais fora de uso").

4. PLANO DE 3 MINUTOS (3 Passos):
   - Três passos cirúrgicos e ultrarrápidos para o usuário fazer AGORA:
     Passo 1: Descarte imediato (o que jogar no lixo ou tirar da visão).
     Passo 2: Agrupamento lógico (alinhar teclado/mouse, cabos ou guardar miudezas).
     Passo 3: Liberação da zona primária de foco (área onde as mãos descansam).

5. TEXTO PARA O LINKEDIN:
   - Crie um post magnético e inspirador, com quebras de linha e emojis, pronto para a pessoa colar no LinkedIn mostrando o seu Score de Foco na mesa e como o ambiente afeta a produtividade.

FOTO DO ESPAÇO: {{media url=photoUri}}`,
});

const analisarFocoFlow = ai.defineFlow(
  {
    name: "analisarFocoFlow",
    inputSchema: AnalisarFocoInputSchema,
    outputSchema: AnalisarFocoOutputSchema,
  },
  async (input) => {
    const response = await prompt(input);
    if (!response.output) {
      throw new Error("Não foi possível processar a imagem do ambiente.");
    }
    return response.output;
  }
);

export async function analisarFocoAmbiente(input: AnalisarFocoInput): Promise<AnalisarFocoResult> {
  try {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key) {
      return {
        success: false,
        error: "Chave GEMINI_API_KEY não configurada na Vercel. Adicione a variável em Settings > Environment Variables e refaça o Deploy.",
      };
    }
    const output = await analisarFocoFlow(input);
    return { success: true, data: output };
  } catch (err: any) {
    console.error("Erro na análise do DeskZen:", err);
    return {
      success: false,
      error: err?.message || "Erro desconhecido ao processar a análise com a IA.",
    };
  }
}
