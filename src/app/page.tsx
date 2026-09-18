'use client';

import React, { useState, useRef } from "react";
import { 
  Sparkles, 
  UploadCloud, 
  CheckCircle2, 
  Share2, 
  RotateCcw, 
  AlertTriangle, 
  TrendingUp, 
  Copy, 
  Check, 
  Camera, 
  Loader2,
  Clock,
  ShieldCheck,
  Zap,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import imageCompression from "browser-image-compression";
import { analisarFocoAmbiente, type AnalisarFocoOutput } from "@/ai/flows/analisar-foco-ambiente";

export default function DeskZenPage() {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("Iniciando análise...");
  const [resultado, setResultado] = useState<AnalisarFocoOutput | null>(null);
  const [passosConcluidos, setPassosConcluidos] = useState<number[]>([]);
  const [copiado, setCopiado] = useState(false);
  const [ambienteTipo, setAmbienteTipo] = useState("mesa");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Compressão client-side leve e rápida
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1400,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUri(reader.result as string);
        setResultado(null);
        setPassosConcluidos([]);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error("Erro ao comprimir imagem:", err);
      // Fallback para arquivo original
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUri(reader.result as string);
        setResultado(null);
        setPassosConcluidos([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalisar = async () => {
    if (!photoUri) return;

    setLoading(true);
    setLoadingStep("Identificando objetos e ergonomia visual...");

    const t1 = setTimeout(() => setLoadingStep("Calculando índice de foco e pontos de desordem..."), 1500);
    const t2 = setTimeout(() => setLoadingStep("Construindo seu plano de ação de 3 minutos..."), 3200);

    try {
      const res = await analisarFocoAmbiente({
        photoUri,
        ambienteTipo,
      });
      setResultado(res);
    } catch (error: any) {
      console.error("Erro na análise da IA:", error);
      alert("Houve uma instabilidade ao analisar a foto. Tente novamente em instantes.");
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
    }
  };

  const alternarPasso = (idx: number) => {
    if (passosConcluidos.includes(idx)) {
      setPassosConcluidos(passosConcluidos.filter((i) => i !== idx));
    } else {
      setPassosConcluidos([...passosConcluidos, idx]);
    }
  };

  const copiarTextoLinkedIn = () => {
    if (!resultado?.texto_linkedin) return;
    navigator.clipboard.writeText(resultado.texto_linkedin);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const resetar = () => {
    setPhotoUri(null);
    setResultado(null);
    setPassosConcluidos([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const scoreProgressColor = (score: number) => {
    if (score >= 90) return "bg-emerald-500";
    if (score >= 70) return "bg-blue-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      {/* 1. HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
              🧘
            </div>
            <div>
              <span className="font-extrabold tracking-tight text-slate-900 text-base sm:text-lg block leading-none">
                DeskZen IA
              </span>
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block mt-0.5">
                Auditor de Foco & Organização
              </span>
            </div>
          </div>

          <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-indigo-50 border-indigo-200 text-indigo-700 hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            IA de Visão Computacional
          </Badge>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* HERO */}
        <div className="text-center space-y-3">
          <Badge className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 border-none shadow-xs">
            Raio-X de Produtividade em 1 Foto
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Sua mesa está roubando o seu foco?
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Envie <strong>1 foto da sua mesa de trabalho</strong>. A IA avalia a poluição visual em 5 segundos, calcula seu <strong>Índice de Foco (0 a 100)</strong> e entrega a rota exata de 3 minutos para destravar seu rendimento.
          </p>
        </div>

        {/* 3. ÁREA DE UPLOAD E ANÁLISE */}
        {!resultado && (
          <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
            <CardContent className="p-6 space-y-6">
              {/* Seleção do Tipo de Ambiente */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs font-semibold text-slate-500 mr-1">Espaço:</span>
                {[
                  { id: "mesa", label: "Mesa de Trabalho" },
                  { id: "homeoffice", label: "Home Office" },
                  { id: "quarto", label: "Quarto" },
                  { id: "bancada", label: "Bancada / Oficina" },
                ].map((tipo) => (
                  <button
                    key={tipo.id}
                    onClick={() => setAmbienteTipo(tipo.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      ambienteTipo === tipo.id
                        ? "bg-slate-900 text-white shadow-xs font-bold"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    {tipo.label}
                  </button>
                ))}
              </div>

              {/* Upload Dropzone */}
              {!photoUri ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/20 transition-all rounded-2xl p-8 sm:p-12 text-center cursor-pointer space-y-4 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-800">
                      Clique para tirar ou escolher 1 foto
                    </p>
                    <p className="text-xs text-slate-400">
                      JPG, PNG ou foto direto da câmera do celular/computador
                    </p>
                  </div>
                  <Button variant="outline" className="rounded-xl font-bold text-xs gap-2">
                    <Camera className="w-4 h-4 text-indigo-600" />
                    Selecionar Imagem
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 max-h-96 flex items-center justify-center">
                    <img
                      src={photoUri}
                      alt="Foto da mesa"
                      className="w-full max-h-96 object-contain"
                    />
                    <button
                      onClick={resetar}
                      className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-xl backdrop-blur-md transition-colors"
                    >
                      Trocar foto
                    </button>
                  </div>

                  <Button
                    onClick={handleAnalisar}
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md gap-2 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {loadingStep}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        Gerar Raio-X de Foco com IA
                      </>
                    )}
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </CardContent>
          </Card>
        )}

        {/* 4. RESULTADOS DA ANÁLISE */}
        {resultado && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Card Principal: Score de Foco */}
            <Card className="border-slate-200 shadow-lg rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Diagnóstico do Ambiente
                    </span>
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-black text-slate-900">
                    {resultado.nivel_rotulo}
                  </CardTitle>
                </div>

                {/* Badge do Score Grande */}
                <div className={`flex flex-col items-center px-4 py-2 rounded-2xl border ${scoreColor(resultado.score_foco)}`}>
                  <span className="text-2xl sm:text-3xl font-black leading-none">
                    {resultado.score_foco}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    Score / 100
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* Barra de Progresso Visual */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Índice de Foco Visual</span>
                    <span>{resultado.score_foco}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${scoreProgressColor(resultado.score_foco)} transition-all duration-1000 ease-out`}
                      style={{ width: `${resultado.score_foco}%` }}
                    />
                  </div>
                </div>

                {/* Diagnóstico Curto */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-slate-800 text-sm font-medium leading-relaxed">
                  "{resultado.diagnostico}"
                </div>

                {/* Distrações Detectadas */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Vilões do Foco Detectados na Foto:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {resultado.distracoes_detectadas.map((distracao, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="bg-red-50 text-red-700 border-red-200/80 px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 rounded-lg"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        {distracao}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card: Plano de Ação em 3 Minutos */}
            <Card className="border-slate-200 shadow-md rounded-3xl overflow-hidden bg-white">
              <CardHeader className="p-6 pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Badge className="bg-amber-500 text-white font-bold text-[11px] px-2.5 py-0.5 border-none">
                      <Clock className="w-3 h-3 mr-1 inline" /> Desafio de 3 Minutos
                    </Badge>
                    <CardTitle className="text-lg font-bold text-slate-900 pt-1">
                      3 Passos Imediatos para Destravar seu Foco
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Marque cada ação conforme concluir:
                    </CardDescription>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    {resultado.ganho_produtividade}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-6 pt-2 space-y-3">
                {resultado.plano_3_passos.map((item, idx) => {
                  const feito = passosConcluidos.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => alternarPasso(idx)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        feito
                          ? "bg-emerald-50/50 border-emerald-300 text-slate-700"
                          : "bg-slate-50/80 hover:bg-slate-100 border-slate-200 text-slate-900"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          feito ? "bg-emerald-600 text-white" : "border-2 border-slate-300 bg-white"
                        }`}
                      >
                        {feito && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <p className={`text-sm font-semibold leading-snug ${feito ? "line-through text-slate-400" : "text-slate-900"}`}>
                          {item.acao}
                        </p>
                        <span className="text-[11px] text-slate-400 font-medium block">
                          Tempo estimado: {item.tempo_estimado}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Card: Viralidade no LinkedIn */}
            <Card className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-none shadow-xl rounded-3xl overflow-hidden p-6 sm:p-7 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    Post Pronto para o LinkedIn
                  </span>
                </div>
                <Button
                  onClick={copiarTextoLinkedIn}
                  size="sm"
                  className="bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs rounded-xl gap-1.5 shadow-sm"
                >
                  {copiado ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar Texto
                    </>
                  )}
                </Button>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 font-mono text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                {resultado.texto_linkedin}
              </div>

              <p className="text-[11px] text-slate-400">
                💡 <strong>Dica para viralizar:</strong> Tire um print do seu Score de Foco acima ou da sua mesa, copie o texto com o botão e publique no LinkedIn!
              </p>
            </Card>

            {/* Botão de Refazer Análise */}
            <div className="text-center pt-2">
              <Button
                variant="outline"
                onClick={resetar}
                className="rounded-xl font-bold text-xs gap-2 border-slate-300 hover:bg-slate-100"
              >
                <RotateCcw className="w-4 h-4 text-slate-600" />
                Analisar Outra Mesa ou Espaço
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
