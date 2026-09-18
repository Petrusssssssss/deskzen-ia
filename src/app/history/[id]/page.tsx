"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useFirestore, useUser, useDoc } from "@/firebase";
import { doc } from "firebase/firestore";
import { 
  ArrowLeft, 
  Calendar, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  Trophy,
  Info,
  Download,
  PlusCircle,
  Layers
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { exportToPDF } from "@/lib/export-pdf";

// Função utilitária (Client-side) para separar diagnóstico e recomendação.
// Não altera o banco, apenas a forma de exibição.
const parseAiFeedback = (feedback: string) => {
  if (!feedback) return { diagnosis: "", recommendation: null };
  
  const keywords = ["Recomendação:", "Ação:", "Prática:", "Sugestão:", "O que melhorar:", "Plano de Ação:"];
  let diagnosis = feedback;
  let recommendation = null;

  for (const keyword of keywords) {
    if (feedback.includes(keyword)) {
      const parts = feedback.split(keyword);
      diagnosis = parts[0].trim();
      recommendation = `${keyword} ${parts[1].trim()}`;
      break;
    }
  }
  return { diagnosis, recommendation };
};

export default function AuditDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const auditId = params?.id as string;
  
  const { user, loading: userLoading } = useUser();
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const auditRef = useMemo(() => {
    if (!mounted || !db || !auditId) return null;
    return doc(db, 'audits', auditId);
  }, [db, auditId, mounted]);

  const { data: audit, loading: auditLoading } = useDoc(auditRef);

  // Verificação de Propriedade (Segurança Nível P0)
  const isOwner = audit && user && audit.auditorId === user.uid;
  const showContent = mounted && !userLoading && !auditLoading && isOwner;
  const notFound = mounted && !userLoading && !auditLoading && (!audit || !isOwner);

  if (!mounted || userLoading || auditLoading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-8 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-24 rounded-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="aspect-square rounded-3xl" />
          <Skeleton className="aspect-square rounded-3xl" />
        </div>
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center space-y-6">
        <div className="bg-destructive/10 p-6 rounded-full">
          <AlertTriangle size={48} className="text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-headline font-bold">Acesso Negado</h2>
          <p className="text-muted-foreground max-w-xs mx-auto">
            Esta auditoria não existe ou você não tem permissão para visualizá-la.
          </p>
        </div>
        <Button onClick={() => router.push('/history')} variant="outline" className="rounded-full px-8">
          Voltar ao Histórico
        </Button>
      </div>
    );
  }

  const toneStyles = {
    strict: "bg-destructive/5 border-destructive/20 text-destructive",
    motivational: "bg-primary/5 border-primary/20 text-primary",
    neutral: "bg-muted/5 border-border text-muted-foreground"
  };

  const currentToneStyle = audit?.coachTone ? toneStyles[audit.coachTone as keyof typeof toneStyles] : toneStyles.neutral;
  
  // Extraindo o texto processado para a Fase 3.2
  const { diagnosis, recommendation } = parseAiFeedback(audit?.coachFeedback || "");

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-primary/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/history')}
            className="rounded-full"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xs font-headline font-bold uppercase tracking-[0.2em] text-primary">Relatório 5S</h1>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/')}
              className="rounded-full text-primary hover:bg-primary/10 transition-colors"
              title="Nova Auditoria"
            >
              <PlusCircle size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                exportToPDF(audit);
              }}
              className="rounded-full text-primary hover:bg-primary/10 transition-colors"
              title="Exportar PDF"
            >
              <Download size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-700">
        {/* Cabeçalho de Título e Score */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar size={14} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {audit?.createdAt?.toDate ? audit.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Data não registrada'}
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground tracking-tight">
              {audit?.titulo || "Operação Sem Título"}
            </h2>
          </div>
          <div className="bg-primary/10 border-2 border-primary/20 p-4 rounded-3xl flex items-center gap-4">
            <div className="bg-primary p-3 rounded-2xl text-white shadow-lg">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Nota Final</p>
              <p className="text-2xl font-headline font-bold text-primary leading-none">{audit?.result || 0}%</p>
            </div>
          </div>
        </section>

        {/* Galeria de Evidências */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Card className="rounded-[2.5rem] overflow-hidden border-2 border-primary/5 bg-card/50">
            <div className="p-4 bg-muted/50 border-b text-[10px] font-black uppercase tracking-widest text-center">Estado: Antes</div>
            <CardContent className="p-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden border shadow-inner">
                {audit?.beforeImage ? (
                  <Image src={audit.beforeImage} alt="Antes" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">Sem Imagem</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] overflow-hidden border-2 border-primary/10 bg-card/50">
            <div className="p-4 bg-primary/5 border-b border-primary/10 text-[10px] font-black uppercase tracking-widest text-center text-primary">Estado: Depois</div>
            <CardContent className="p-4">
              <div className="relative aspect-square rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg">
                {audit?.afterImage ? (
                  <Image src={audit.afterImage} alt="Depois" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">Sem Imagem</div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Comentário do Auditor */}
        { (audit?.comentario || audit?.notes) && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Info size={14} /> Relato do Campo
            </h3>
            <div className="bg-card p-6 rounded-3xl border-2 border-primary/5 shadow-sm">
              <p className="text-sm md:text-base font-medium leading-relaxed text-foreground/80 italic">
                {audit?.comentario || audit?.notes}
              </p>
            </div>
          </section>
        )}

        {/* Veredito do Coach - Diagnóstico Separado */}
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
            <MessageSquare size={14} /> Diagnóstico do Coach 5S
          </h3>
          <Card className={cn("rounded-[2.5rem] border-2 shadow-xl transition-all", currentToneStyle)}>
            <CardContent className="p-8 space-y-6 relative overflow-hidden">
              <MessageSquare className="absolute -top-6 -right-6 opacity-5 scale-[4]" />
              
              <div className="flex items-center gap-3 relative z-10">
                <div className={cn("p-2 rounded-xl shadow-sm", audit?.coachTone === 'strict' ? "bg-destructive text-white" : "bg-primary text-white")}>
                  <CheckCircle2 size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {audit?.coachTone === 'strict' ? "DISCIPLINA RÍGIDA" : "CONSELHO DE MESTRE"}
                </span>
              </div>

              {/* Bloco principal: Diagnóstico */}
              <div className="space-y-6 relative z-10">
                <p className="text-lg md:text-xl font-medium leading-relaxed italic">
                  "{diagnosis || "O Coach preferiu o silêncio desta vez."}"
                </p>

                {/* Bloco destacado: Recomendação / Plano de Ação */}
                {recommendation && (
                  <div className={cn(
                    "p-4 rounded-2xl border bg-background/50 backdrop-blur-sm",
                    audit?.coachTone === 'strict' ? "border-destructive/30" : "border-primary/30"
                  )}>
                    <strong className="block text-xs font-black uppercase tracking-widest mb-2 opacity-80">
                      Plano de Ação Sugerido
                    </strong>
                    <p className="text-sm md:text-base font-medium">{recommendation}</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-current/10 flex items-center gap-2 relative z-10">
                <div className="w-6 h-6 rounded-lg bg-current opacity-10" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Auditoria # {auditId.slice(-6).toUpperCase()}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* FASE 3.6: NOVA SEÇÃO - Análise Detalhada por Pilar 5S */}
        {audit?.analise_5s && (
          <section className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
              <Layers size={14} /> Análise Detalhada por Pilar
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Seiri */}
              {audit.analise_5s.seiri && (
                <Card className="bg-card border-primary/5 rounded-[2rem] shadow-sm">
                  <CardHeader className="pb-2 px-6 pt-6">
                    <CardTitle className="flex justify-between items-center text-base md:text-lg">
                      1S - Seiri / Descarte
                      {audit.analise_5s.seiri.nota !== undefined && (
                        <Badge variant="outline">Nota: {audit.analise_5s.seiri.nota}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Diagnóstico: </strong> 
                      {audit.analise_5s.seiri.diagnostico || "Não informado."}
                    </p>
                    <p>
                      <strong className="text-foreground">Recomendação: </strong> 
                      {audit.analise_5s.seiri.recomendacao || "Não informada."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Seiton */}
              {audit.analise_5s.seiton && (
                <Card className="bg-card border-primary/5 rounded-[2rem] shadow-sm">
                  <CardHeader className="pb-2 px-6 pt-6">
                    <CardTitle className="flex justify-between items-center text-base md:text-lg">
                      2S - Seiton / Organização
                      {audit.analise_5s.seiton.nota !== undefined && (
                        <Badge variant="outline">Nota: {audit.analise_5s.seiton.nota}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Diagnóstico: </strong> 
                      {audit.analise_5s.seiton.diagnostico || "Não informado."}
                    </p>
                    <p>
                      <strong className="text-foreground">Recomendação: </strong> 
                      {audit.analise_5s.seiton.recomendacao || "Não informada."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Seiso */}
              {audit.analise_5s.seiso && (
                <Card className="bg-card border-primary/5 rounded-[2rem] shadow-sm">
                  <CardHeader className="pb-2 px-6 pt-6">
                    <CardTitle className="flex justify-between items-center text-base md:text-lg">
                      3S - Seiso / Limpeza
                      {audit.analise_5s.seiso.nota !== undefined && (
                        <Badge variant="outline">Nota: {audit.analise_5s.seiso.nota}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Diagnóstico: </strong> 
                      {audit.analise_5s.seiso.diagnostico || "Não informado."}
                    </p>
                    <p>
                      <strong className="text-foreground">Recomendação: </strong> 
                      {audit.analise_5s.seiso.recomendacao || "Não informada."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Seiketsu */}
              {audit.analise_5s.seiketsu && (
                <Card className="bg-card border-primary/5 rounded-[2rem] shadow-sm">
                  <CardHeader className="pb-2 px-6 pt-6">
                    <CardTitle className="flex justify-between items-center text-base md:text-lg">
                      4S - Seiketsu / Padronização
                      {audit.analise_5s.seiketsu.nota !== undefined && (
                        <Badge variant="outline">Nota: {audit.analise_5s.seiketsu.nota}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Diagnóstico: </strong> 
                      {audit.analise_5s.seiketsu.diagnostico || "Não informado."}
                    </p>
                    <p>
                      <strong className="text-foreground">Recomendação: </strong> 
                      {audit.analise_5s.seiketsu.recomendacao || "Não informada."}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Shitsuke */}
              {audit.analise_5s.shitsuke && (
                <Card className="bg-card border-primary/5 rounded-[2rem] shadow-sm">
                  <CardHeader className="pb-2 px-6 pt-6">
                    <CardTitle className="flex justify-between items-center text-base md:text-lg">
                      5S - Shitsuke / Disciplina
                      {audit.analise_5s.shitsuke.nota !== undefined && (
                        <Badge variant="outline">Nota: {audit.analise_5s.shitsuke.nota}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-6 space-y-2 text-sm text-muted-foreground">
                    <p>
                      <strong className="text-foreground">Diagnóstico: </strong> 
                      {audit.analise_5s.shitsuke.diagnostico || "Não informado."}
                    </p>
                    <p>
                      <strong className="text-foreground">Recomendação: </strong> 
                      {audit.analise_5s.shitsuke.recomendacao || "Não informada."}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}