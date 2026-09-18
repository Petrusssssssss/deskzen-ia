"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Save } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { auditService } from "@/app/lib/audit-service";
import { storageService } from "@/app/lib/storage-service";
import { useToast } from "@/hooks/use-toast";
import { generateCoachFeedback } from "@/ai/flows/generate-coach-feedback";
import { useFirestore, useUser } from "@/firebase";
import { cn } from "@/lib/utils";
import imageCompression from 'browser-image-compression';

interface AuditCaptureProps {
  onComplete: () => void;
  currentDisciplineLevel: number;
  auditsCount?: number;
}

function readExifString(view: DataView, offset: number, maxLen: number): string {
  let str = "";
  for (let i = 0; i < maxLen; i++) {
    if (offset + i >= view.byteLength) break;
    const charCode = view.getUint8(offset + i);
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  return str.trim();
}

/**
 * Função Cagueta Inteligente: Lê os metadados EXIF reais da foto (data exata em que
 * a câmera do celular capturou a imagem), similar ao Instagram Stories, com fallback
 * para a data de modificação original do arquivo no celular.
 */
async function extractPhotoCaptureDate(file: File): Promise<{ date: Date; isArchived: boolean }> {
  let photoDate: Date | null = null;

  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);

    // Valida se é um arquivo JPEG (SOI: 0xFFD8)
    if (view.byteLength > 4 && view.getUint16(0, false) === 0xFFD8) {
      let offset = 2;
      const length = view.byteLength;

      while (offset < length - 4) {
        if (view.getUint8(offset) !== 0xFF) break;
        const marker = view.getUint8(offset + 1);

        // Marcador APP1 (0xFFE1) onde residem os metadados EXIF
        if (marker === 0xFFE1) {
          if (view.getUint32(offset + 4, false) === 0x45786966 && view.getUint16(offset + 8, false) === 0x0000) {
            const tiffOffset = offset + 10;
            const isLittleEndian = view.getUint16(tiffOffset, false) === 0x4949;

            const ifd0Offset = tiffOffset + view.getUint32(tiffOffset + 4, isLittleEndian);
            if (ifd0Offset < length - 2) {
              const numEntries = view.getUint16(ifd0Offset, isLittleEndian);
              let subIfdOffset = 0;
              let dateStr = "";

              for (let i = 0; i < numEntries; i++) {
                const entry = ifd0Offset + 2 + i * 12;
                if (entry + 12 > length) break;
                const tag = view.getUint16(entry, isLittleEndian);

                if (tag === 0x8769) {
                  subIfdOffset = tiffOffset + view.getUint32(entry + 8, isLittleEndian);
                } else if (tag === 0x0132) {
                  const valOff = tiffOffset + view.getUint32(entry + 8, isLittleEndian);
                  dateStr = readExifString(view, valOff, 20);
                }
              }

              if (subIfdOffset > 0 && subIfdOffset < length - 2) {
                const subEntries = view.getUint16(subIfdOffset, isLittleEndian);
                for (let i = 0; i < subEntries; i++) {
                  const entry = subIfdOffset + 2 + i * 12;
                  if (entry + 12 > length) break;
                  const tag = view.getUint16(entry, isLittleEndian);

                  // 0x9003: DateTimeOriginal (momento do clique da câmera)
                  if (tag === 0x9003 || tag === 0x9004) {
                    const valOff = tiffOffset + view.getUint32(entry + 8, isLittleEndian);
                    const orig = readExifString(view, valOff, 20);
                    if (orig) {
                      dateStr = orig;
                      break;
                    }
                  }
                }
              }

              if (dateStr && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
                const [dPart, tPart] = dateStr.split(" ");
                const [y, m, d] = dPart.split(":").map(Number);
                const [h, min, s] = tPart.split(":").map(Number);
                photoDate = new Date(y, m - 1, d, h, min, s);
              }
            }
          }
          break;
        } else {
          const markerLen = view.getUint16(offset + 2, false);
          offset += 2 + markerLen;
        }
      }
    }
  } catch (e) {
    console.warn("Aviso: Falha ao inspecionar EXIF da foto:", e);
  }

  // Fallback para lastModified do arquivo no dispositivo (se disponível)
  if (!photoDate || isNaN(photoDate.getTime())) {
    if (file.lastModified && file.lastModified > 0) {
      photoDate = new Date(file.lastModified);
    } else {
      photoDate = new Date();
    }
  }

  // Identifica se a foto foi tirada há mais de 12 horas (foto antiga de arquivo)
  const diffHours = (Date.now() - photoDate.getTime()) / (1000 * 60 * 60);
  const isArchived = diffHours > 12;

  return { date: photoDate, isArchived };
}

/**
 * Função "Cagueta": Carimba a data e hora REAL em que a foto foi tirada
 * (direto do EXIF/Celular) antes de enviar para o servidor.
 */
const addWatermark = async (file: File): Promise<{ file: File; preview: string; isArchived: boolean }> => {
  const { date: captureDate, isArchived } = await extractPhotoCaptureDate(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          reject(new Error("Falha ao processar imagem"));
          return;
        }

        // Desenha a imagem original
        ctx.drawImage(img, 0, 0);

        // Configura o tamanho da fonte proporcional ao tamanho da foto
        const fontSize = Math.max(26, Math.floor(img.width * 0.028));
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";

        const formattedDate = captureDate.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

        // Carimbo inteligente: se for foto antiga de arquivo, alerta explicitamente
        const text = isArchived 
          ? `⚠️ Foto de Arquivo: ${formattedDate}`
          : `Foto Tirada em: ${formattedDate}`;

        const padding = Math.max(10, Math.floor(img.width * 0.02));
        const x = canvas.width - padding;
        const y = canvas.height - padding;

        // Fundo com destaque (vermelho escuro se for foto antiga, preto se for recente)
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        ctx.fillStyle = isArchived ? "rgba(180, 40, 40, 0.85)" : "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(
          x - textWidth - padding,
          y - fontSize - (padding / 2),
          textWidth + (padding * 2),
          fontSize + padding
        );

        // Desenha o texto do carimbo
        ctx.fillStyle = "white";
        ctx.fillText(text, x, y);

        // Converte o Canvas de volta para um arquivo File e DataURL
        const mimeType = file.type || "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, 0.92);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Falha na conversão da imagem"));
            return;
          }
          const newFile = new File([blob], file.name, {
            type: mimeType,
            lastModified: captureDate.getTime(),
          });
          resolve({ file: newFile, preview: dataUrl, isArchived });
        }, mimeType, 0.92);
      };
      img.onerror = () => reject(new Error("Falha ao carregar a imagem"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
};

export function AuditCapture({ onComplete, currentDisciplineLevel, auditsCount = 0 }: AuditCaptureProps) {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [step, setStep] = useState<'before' | 'after'>('before');
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>("");
  
  const [titulo, setTitulo] = useState("");
  const [comentario, setComentario] = useState("");

  const beforeInputRef = useRef<HTMLInputElement>(null);
  const afterInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Passa a foto pelo "Cagueta" para carimbar a data real da câmera
      const { file: watermarkedFile, preview, isArchived } = await addWatermark(file);

      if (type === 'before') {
        setBeforePreview(preview);
        setBeforeFile(watermarkedFile);
      } else {
        setAfterPreview(preview);
        setAfterFile(watermarkedFile);
      }

      if (isArchived) {
        toast({
          variant: "destructive",
          title: "⚠️ Evidência de Arquivo",
          description: "Foto antiga detectada da galeria. O Coach 5S avaliará a data da captura!",
        });
      }
    } catch (error) {
      console.error("Erro no carimbo:", error);
      toast({
        variant: "destructive",
        title: "Erro de Imagem",
        description: "Não foi possível processar a foto. Tente novamente.",
      });
    }
  };

  const handleSave = async () => {
    // A) PREVENÇÃO DE CLIQUE DUPLO (Garante que não executa 2x)
    if (isProcessing) return;
  
    // B) VALIDAÇÕES PRÉVIAS RÍGIDAS
    if (!user || !user.uid) {
      toast({
        variant: "destructive",
        title: "Sessão Expirada",
        description: "Usuário não identificado. Faça login novamente.",
      });
      return;
    }
  
    if (!beforeFile || !afterFile) {
      toast({
        variant: "destructive",
        title: "Fotos Obrigatórias",
        description: "As evidências do 'Antes' e 'Depois' são obrigatórias.",
      });
      return;
    }
  
    if (!titulo.trim()) {
      toast({
        variant: "destructive",
        title: "Título Obrigatório",
        description: "O título da tarefa é obrigatório.",
      });
      return;
    }
  
    setIsProcessing(true);
  
    try {
      setProcessStatus("Otimizando evidências...");
  
      const compressedBefore = await storageService.compressImage(beforeFile);
      const compressedAfter = await storageService.compressImage(afterFile);
  
      const MAX_SIZE = 1.5 * 1024 * 1024;
  
      if (compressedBefore.size > MAX_SIZE || compressedAfter.size > MAX_SIZE) {
        throw new Error("A imagem é muito grande mesmo após compressão. Tente uma foto com menos detalhes.");
      }
  
      setProcessStatus("Obtendo credenciais...");
      const idToken = await user.getIdToken();

      if (!idToken) {
        throw new Error("token_missing");
      }
  
      setProcessStatus("Preparando análise IA...");
      const beforeBase64 = await imageCompression.getDataUrlFromFile(compressedBefore);
      const afterBase64 = await imageCompression.getDataUrlFromFile(compressedAfter);
  
      setProcessStatus("Análise da IA (Coach 5S)...");
  
      const aiResponse = await generateCoachFeedback({
        idToken,
        disciplineLevel: currentDisciplineLevel,
        titulo: titulo.trim(),
        comentario: comentario.trim(),
        beforePhotoUri: beforeBase64,
        afterPhotoUri: afterBase64,
      });
  
      const ai = aiResponse as any;
  
      const rawScore = ai.score ?? ai.nota ?? 0;
      const finalScore = Number.isFinite(Number(rawScore))
        ? Math.max(0, Math.min(100, Math.round(Number(rawScore))))
        : 0;
  
      const finalFeedback =
        ai.coachFeedback ??
        ai.feedback_gamificado ??
        "Auditoria registrada, mas o Coach não retornou feedback detalhado.";
  
      const finalTone =
        ai.coachTone === "strict" ||
        ai.coachTone === "motivational" ||
        ai.coachTone === "neutral"
          ? ai.coachTone
          : "neutral";
  
      setProcessStatus("Registrando auditoria...");
  
      const [beforeUrl, afterUrl] = await Promise.all([
        storageService.uploadAuditImage(compressedBefore, user.uid, "before"),
        storageService.uploadAuditImage(compressedAfter, user.uid, "after"),
      ]);
  
      await auditService.saveAudit(
        db,
        {
          auditorId: user.uid,
          auditorEmail: user.email || "",
          beforeImage: beforeUrl,
          afterImage: afterUrl,
          beforeImageUrl: beforeUrl,
          afterImageUrl: afterUrl,
          result: finalScore,
          score: finalScore,
          notes: comentario.trim(),
          titulo: titulo.trim(),
          comentario: comentario.trim(),
          coachFeedback: finalFeedback,
          coachTone: finalTone,
          analise_5s: ai.analise_5s,
        } as any
      );
  
      toast({
        title: "Protocolo Finalizado",
        description: `Desempenho: ${finalScore}%`,
      });
  
      onComplete();
      router.refresh();
  
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      console.error("Erro na auditoria:", error);
  
      // C) TRATAMENTO DE ERROS (UX) MELHORADO
      const errorMessage = error?.message?.toLowerCase() || "";
      let userFriendlyMessage = "Ocorreu um erro inesperado ao salvar. Tente novamente em instantes.";
  
      if (errorMessage.includes("limite")) {
        userFriendlyMessage = "Limite atingido: Você já utilizou as 3 auditorias do plano de teste gratuito.";
      } else if (errorMessage.includes("unauthorized") || errorMessage.includes("token") || errorMessage.includes("token_missing")) {
        userFriendlyMessage = "Sua sessão expirou. Por favor, recarregue a página e tente novamente.";
      } else if (errorMessage.includes("upload") || errorMessage.includes("storage") || errorMessage.includes("network")) {
        userFriendlyMessage = "Falha ao salvar as imagens. Verifique sua conexão de internet.";
      } else if (errorMessage.includes("genkit") || errorMessage.includes("ai") || errorMessage.includes("timeout") || errorMessage.includes("fetch")) {
        userFriendlyMessage = "A IA demorou para responder ou falhou. Tente submeter novamente.";
      } else if (errorMessage.includes("grande")) {
        userFriendlyMessage = error.message; // Aproveita o erro de tamanho que já tratamos no try
      }
  
      toast({
        variant: "destructive",
        title: "Falha no Processo",
        description: userFriendlyMessage,
      });
    } finally {
      setIsProcessing(false);
      setProcessStatus("");
    }
  };

  if (auditsCount >= 3) {
    return (
      <div className="text-center py-10 px-4 space-y-5">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
          <CheckCircle2 size={36} />
        </div>
        <h3 className="text-xl md:text-2xl font-headline font-bold text-foreground">
          Limite de Avaliações Atingido
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Você já realizou as <strong>3 auditorias gratuitas</strong> do plano de testes do Coach 5S. Seu memorial de vistorias está preservado no histórico.
        </p>
        <Button onClick={onComplete} className="rounded-full px-8 bg-primary hover:bg-primary/90">
          Voltar ao Painel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-4">
      {/* capture="environment" foi removido dos dois inputs */}
      <input 
        type="file" accept="image/*" 
        className="hidden" ref={beforeInputRef} 
        onChange={(e) => handleFileChange(e, 'before')} 
      />
      <input 
        type="file" accept="image/*" 
        className="hidden" ref={afterInputRef} 
        onChange={(e) => handleFileChange(e, 'after')} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className={cn(
          "rounded-2xl overflow-hidden border-2 transition-all duration-300",
          step === 'before' ? "border-primary shadow-lg ring-4 ring-primary/10" : "border-border/40 opacity-60 scale-[0.98]"
        )}>
          <div className="p-3 md:p-4 bg-muted text-[10px] md:text-xs font-black uppercase tracking-widest flex justify-between items-center">
            <span>PASSO 1: ESTADO INICIAL</span>
            {beforePreview && <CheckCircle2 size={16} className="text-green-500 animate-in zoom-in" />}
          </div>
          <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[220px] md:min-h-[280px] relative bg-background/50">
            {beforePreview ? (
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border shadow-inner">
                <Image src={beforePreview} alt="Antes" fill className="object-cover" />
                <Button 
                  variant="secondary" size="sm" className="absolute bottom-3 right-3 opacity-90 font-bold rounded-lg shadow-xl"
                  onClick={() => beforeInputRef.current?.click()}
                  disabled={isProcessing}
                >Refazer</Button>
              </div>
            ) : (
              <Button 
                onClick={() => beforeInputRef.current?.click()} 
                disabled={step !== 'before' || isProcessing}
                className="w-full h-16 rounded-xl md:h-24 flex flex-col gap-2 font-bold uppercase tracking-tighter"
              >
                <Camera size={24} /> 
                <span className="text-[10px] md:text-xs">Capturar Antes</span>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={cn(
          "rounded-2xl overflow-hidden border-2 transition-all duration-300",
          step === 'after' ? "border-primary shadow-lg ring-4 ring-primary/10" : "border-border/40 opacity-60 scale-[0.98]"
        )}>
          <div className="p-3 md:p-4 bg-muted text-[10px] md:text-xs font-black uppercase tracking-widest flex justify-between items-center">
            <span>PASSO 2: EXECUÇÃO 5S</span>
            {afterPreview && <CheckCircle2 size={16} className="text-green-500 animate-in zoom-in" />}
          </div>
          <CardContent className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[220px] md:min-h-[280px] relative bg-background/50">
            {afterPreview ? (
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border shadow-inner">
                <Image src={afterPreview} alt="Depois" fill className="object-cover" />
                <Button 
                  variant="secondary" size="sm" className="absolute bottom-3 right-3 opacity-90 font-bold rounded-lg shadow-xl"
                  onClick={() => afterInputRef.current?.click()}
                  disabled={isProcessing}
                >Refazer</Button>
              </div>
            ) : (
              <Button 
                onClick={() => afterInputRef.current?.click()} 
                disabled={step !== 'after' || !beforePreview || isProcessing}
                className="w-full h-16 rounded-xl md:h-24 flex flex-col gap-2 font-bold uppercase tracking-tighter"
              >
                <Camera size={24} /> 
                <span className="text-[10px] md:text-xs">Capturar Depois</span>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {step === 'after' && afterPreview && (
        <div className="space-y-5 animate-in slide-in-from-top-4 duration-500">
          <div className="space-y-2">
            <Label htmlFor="titulo" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary">Identificação da Tarefa</Label>
            <Input 
              id="titulo"
              placeholder="Ex: Bancada de Testes, Arquivo Morto..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              disabled={isProcessing}
              className="bg-muted/30 border-primary/10 rounded-xl h-12 md:h-14 font-medium px-4 focus:ring-primary/20"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comentario" className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary">Detalhamento da Melhoria</Label>
            <Textarea 
              id="comentario"
              placeholder="Quais desperdícios foram eliminados?"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              disabled={isProcessing}
              className="bg-muted/30 border-primary/10 rounded-xl min-h-[100px] md:min-h-[140px] font-medium p-4 focus:ring-primary/20 resize-none"
            />
          </div>
        </div>
      )}

      <div className="sticky bottom-0 pt-4 bg-background/95 backdrop-blur-sm border-t border-primary/5">
        <div className="flex gap-3 md:gap-4">
          {step === 'before' ? (
            <Button 
              disabled={!beforePreview || isProcessing} 
              onClick={() => setStep('after')} 
              className="w-full h-12 md:h-14 rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg group"
            >
              Próximo <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep('before')} 
                disabled={isProcessing}
                className="rounded-xl h-12 md:h-14 font-bold border-2 hover:bg-muted transition-colors"
              >
                <ArrowLeft size={18} />
              </Button>
              <Button 
                disabled={!afterPreview || isProcessing || !titulo.trim()} 
                onClick={handleSave} 
                className={cn(
                  "flex-1 h-12 md:h-14 rounded-xl font-bold uppercase tracking-widest text-xs bg-accent hover:bg-accent/90 shadow-[0_5px_20px_rgba(249,115,22,0.3)] transition-all flex flex-col items-center justify-center",
                  isProcessing && "opacity-80 scale-[0.98] pointer-events-none"
                )}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> 
                      <span>Processando...</span>
                    </div>
                    <span className="text-[8px] opacity-70 font-medium lowercase tracking-normal">{processStatus}</span>
                  </div>
                ) : (
                  <><Save size={18} className="mr-2" /> Submeter</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}