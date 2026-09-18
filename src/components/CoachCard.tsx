"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoachCardProps {
  disciplineLevel: number;
  feedbackMessage: string;
  coachTone: 'strict' | 'motivational' | 'neutral';
}

export function CoachCard({ disciplineLevel, feedbackMessage, coachTone }: CoachCardProps) {
  const toneColor = coachTone === 'strict' ? 'text-destructive' : 'text-primary';

  return (
    <Card className="relative overflow-hidden border-2 border-primary/20 shadow-2xl bg-card rounded-3xl transition-transform hover:scale-[1.01] duration-300">
      <div className="absolute -top-10 -right-10 p-4 opacity-5 pointer-events-none">
        <Shield size={240} className="text-primary" />
      </div>
      
      <CardHeader className="pb-2 md:pb-4">
        <div className="flex justify-between items-center mb-2">
          <Badge variant="outline" className="border-primary text-primary font-headline text-[9px] md:text-[11px] px-3 py-1">
            STATUS: ATIVO
          </Badge>
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground font-bold">
            <TrendingUp size={14} />
            <span className="uppercase tracking-tighter">Foco Operacional</span>
          </div>
        </div>
        <CardTitle className="text-2xl md:text-4xl font-headline font-bold text-primary flex items-center gap-2">
          Coach 5S
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 md:space-y-8">
        <div className="space-y-3">
          <div className="flex justify-between text-xs md:text-sm font-bold uppercase tracking-tight">
            <span className="flex items-center gap-2 text-foreground/70">
              Nível de Disciplina
            </span>
            <span className="font-headline font-black text-primary text-lg md:text-2xl">{disciplineLevel}%</span>
          </div>
          <Progress value={disciplineLevel} className="h-4 rounded-full bg-muted/30" />
          <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black text-center md:text-left">
            {disciplineLevel < 50 ? "DESEMPENHO INSATISFATÓRIO" : "RUMO À ALTA PERFORMANCE"}
          </p>
        </div>

        <div className="bg-primary/[0.03] rounded-2xl p-6 border border-primary/10 relative shadow-inner group">
          <Quote className="absolute -top-3 -left-2 text-primary/10 group-hover:scale-110 transition-transform" size={48} />
          <p className={cn(
            "text-base md:text-xl italic font-medium leading-relaxed relative z-10 text-center md:text-left",
            toneColor
          )}>
            "{feedbackMessage}"
          </p>
          <div className="mt-5 flex items-center justify-center md:justify-start gap-3 border-t border-primary/5 pt-4">
            <div className="w-8 h-8 rounded-xl bg-primary shadow-lg flex items-center justify-center text-xs text-white font-black">5S</div>
            <span className="text-[10px] md:text-xs font-black uppercase text-muted-foreground tracking-widest">A ORDEM É O CAMINHO</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
