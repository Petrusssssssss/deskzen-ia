"use client";

export const dynamic = 'force-dynamic';

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  useFirestore, 
  useUser, 
  useCollection, 
  useAuth 
} from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";
import { 
  ArrowLeft, 
  History as HistoryIcon, 
  Calendar, 
  Search, 
  MessageSquare,
  Loader2,
  Download // <- Ícone novo adicionado aqui
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AuthComponent } from "@/components/Auth";
import Image from "next/image";

// Importação da nossa nova função de PDF
// (Se o seu Next.js reclamar desse caminho, você pode trocar por "../lib/export-pdf")
import { exportToPDF } from "@/lib/export-pdf";

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Consulta Isolada: Garante que o usuário NUNCA veja auditorias de outros.
   * O filtro 'where' por auditorId é obrigatório por Segurança e Tenant Isolation.
   */
  const auditsQuery = useMemo(() => {
    if (!mounted || !db || !user || !user.uid) return null;
    return query(
      collection(db, 'audits'),
      where('auditorId', '==', user.uid), // Isolamento Nível P0
      orderBy('createdAt', 'desc')
    );
  }, [db, user, mounted]);

  const { data: audits, loading: auditsLoading } = useCollection(auditsQuery);

  const filteredAudits = useMemo(() => {
    if (!audits) return [];
    return audits.filter(audit => 
      audit.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [audits, searchTerm]);

  if (!mounted || userLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-sm font-medium">Recuperando seus registros...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthComponent auth={auth} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b border-primary/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => router.push('/')}
            className="rounded-full"
          >
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-sm font-headline font-bold uppercase tracking-widest text-primary">Seu Memorial Privado</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
            <Input 
              placeholder="Buscar em suas auditorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl bg-muted/30 border-none focus:ring-2 focus:ring-primary/20 text-base"
            />
          </div>

          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {filteredAudits.length} Registros encontrados para sua sessão
            </p>
          </div>
        </section>

        <section className="space-y-6">
          {auditsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin text-primary/30" size={40} />
            </div>
          ) : filteredAudits.length > 0 ? (
            filteredAudits.map((audit) => (
              <Card 
  key={audit.id} 
  onClick={() => router.push(`/history/${audit.id}`)}
  className="rounded-[2rem] border-2 border-primary/5 hover:border-primary/20 transition-all overflow-hidden shadow-sm group cursor-pointer"
>
                <CardHeader className="p-6 pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-primary" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          {audit.createdAt?.toDate ? audit.createdAt.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Data não registrada'}
                        </span>
                      </div>
                      <CardTitle className="text-xl font-headline font-bold group-hover:text-primary transition-colors">
                        {audit.titulo || "Operação Sem Título"}
                      </CardTitle>
                    </div>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 rounded-full font-black text-sm">
                      {audit.result}%
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6 pt-0 space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-primary/5">
                      {audit.beforeImage && (
                        <Image src={audit.beforeImage} alt="Antes" fill className="object-cover" />
                      )}
                      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-[8px] text-white font-bold px-2 py-0.5 rounded-full uppercase">Antes</div>
                    </div>
                    <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-primary/10">
                      {audit.afterImage && (
                        <Image src={audit.afterImage} alt="Depois" fill className="object-cover" />
                      )}
                      <div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-sm text-[8px] text-white font-bold px-2 py-0.5 rounded-full uppercase">Depois</div>
                    </div>
                  </div>

                  {audit.coachFeedback && (
                    <div className="bg-muted/40 p-5 rounded-2xl border-l-4 border-primary space-y-2 relative">
                      <MessageSquare className="absolute top-4 right-4 opacity-5 text-primary" size={32} />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Veredito do Coach</p>
                      <p className="text-sm font-medium italic leading-relaxed text-foreground/80">
                        "{audit.coachFeedback}"
                      </p>
                    </div>
                  )}

                  {/* NOVO: Botão de Exportar PDF injetado aqui */}
                  <div className="pt-2 flex justify-end">
                  <Button 
    variant="outline" 
    size="sm" 
    className="gap-2 rounded-full border-primary/20 hover:bg-primary/10 text-primary transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      exportToPDF(audit);
    }}
  >
                      <Download size={16} />
                      Exportar PDF
                    </Button>
                  </div>

                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-32 space-y-4">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
                <HistoryIcon size={40} />
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Nenhum registro privado</p>
              <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
                Suas auditorias são estritamente pessoais e aparecerão aqui assim que forem concluídas.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}