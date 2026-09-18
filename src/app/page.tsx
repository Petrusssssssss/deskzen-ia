'use client';

import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  UploadCloud, 
  CheckCircle2, 
  RotateCcw, 
  AlertTriangle, 
  TrendingUp, 
  Camera, 
  Loader2,
  Clock,
  ShieldCheck,
  Zap,
  Target,
  Lightbulb,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Award,
  Flame
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
  const [ambienteTipo, setAmbienteTipo] = useState("mesa");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado do Desafio dos 3 Minutos (Timer)
  const [timerAtivo, setTimerAtivo] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(180); // 3 minutos

  // Estado do Som Ambiente de Foco (Web Audio API)
  const [somAtual, setSomAtual] = useState<"nenhum" | "chuva" | "marrom">("nenhum");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Timer de 3 minutos
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerAtivo && segundosRestantes > 0) {
      interval = setInterval(() => {
        setSegundosRestantes((prev) => prev - 1);
      }, 1000);
    } else if (segundosRestantes === 0) {
      setTimerAtivo(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerAtivo, segundosRestantes]);

  // Controle de Som Ambiente de Concentração
  const toggleSom = (tipo: "chuva" | "marrom") => {
    if (somAtual === tipo) {
      pararSom();
      return;
    }
    pararSom();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      if (tipo === "marrom") {
        // Ruído Marrom para foco profundo
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 2.8;
        }
      } else {
        // Som de Chuva Suave (Ruído rosa filtrado)
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          data[i] = (b0 + b1 + b2 + white * 0.05) * 0.35;
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      noise.connect(gain);
      gain.connect(ctx.destination);
      noise.start();

      noiseNodeRef.current = noise;
      setSomAtual(tipo);
    } catch (e) {
      console.error("Web Audio error:", e);
    }
  };

  const pararSom = () => {
    if (noiseNodeRef.current) {
      try {
        (noiseNodeRef.current as any).stop?.();
        noiseNodeRef.current.disconnect();
      } catch (e) {}
      noiseNodeRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch (e) {}
      audioCtxRef.current = null;
    }
    setSomAtual("nenhum");
  };

  useEffect(() => {
    return () => {
      pararSom();
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
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
        setTimerAtivo(false);
        setSegundosRestantes(180);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error("Erro ao comprimir imagem:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUri(reader.result as string);
        setResultado(null);
        setPassosConcluidos([]);
        setTimerAtivo(false);
        setSegundosRestantes(180);
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

      if (!res.success || !res.data) {
        alert(res.error || "Houve uma instabilidade ao analisar a foto. Tente novamente.");
        return;
      }

      setResultado(res.data);
      setSegundosRestantes(180);
      setTimerAtivo(false);
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

  const resetar = () => {
    setPhotoUri(null);
    setResultado(null);
    setPassosConcluidos([]);
    setTimerAtivo(false);
    setSegundosRestantes(180);
    pararSom();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Cálculo de Score dinâmico conforme os passos são concluídos!
  const scoreBase = resultado?.score_foco || 0;
  const pontosExtras = passosConcluidos.length * 15;
  const scoreAtual = Math.min(100, scoreBase + pontosExtras);

  const formatarTempo = (seg: number) => {
    const m = Math.floor(seg / 60).toString().padStart(2, "0");
    const s = (seg % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const getCorScore = (score: number) => {
    if (score >= 85) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 60) return "text-blue-400 border-blue-500/30 bg-blue-500/10";
    if (score >= 40) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-rose-400 border-rose-500/30 bg-rose-500/10";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-4 sm:p-6 md:p-8">
      {/* Header */}
      <header className="w-full max-w-2xl flex items-center justify-between py-4 border-b border-slate-800/80 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              DeskZen IA
            </h1>
            <p className="text-[11px] text-purple-400 uppercase tracking-wider font-semibold">
              Auditor de Foco & Produtividade
            </p>
          </div>
        </div>

        <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs px-2.5 py-1">
          <Zap className="w-3.5 h-3.5 mr-1 text-purple-400 animate-pulse" />
          Gemini 3.6 Multimodal
        </Badge>
      </header>

      {/* Hero / Upload Card */}
      <div className="w-full max-w-2xl space-y-6">
        {!resultado && (
          <div className="text-center space-y-2 mb-4">
            <Badge className="bg-purple-600/20 text-purple-300 border-purple-500/30 text-xs py-0.5">
              Raio-X de Produtividade em 1 Foto
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Sua mesa está roubando o seu foco?
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Envie 1 foto da sua mesa. A IA analisa o ambiente em 5 segundos, calcula seu <b>Índice de Foco (0 a 100)</b> e entrega a missão de 3 minutos para destravar seu dia.
            </p>
          </div>
        )}

        {/* Card Principal */}
        <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-sm overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Seletor de Tipo de Ambiente */}
            {!resultado && (
              <div className="flex items-center justify-center gap-2 pb-2">
                {[
                  { id: "mesa", label: "Mesa de Trabalho" },
                  { id: "home-office", label: "Home Office" },
                  { id: "quarto", label: "Quarto / Canto" },
                  { id: "bancada", label: "Bancada" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setAmbienteTipo(item.id)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      ambienteTipo === item.id
                        ? "bg-purple-600 text-white font-medium shadow-md shadow-purple-600/30"
                        : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            {/* Pré-visualização ou Dropzone */}
            {!photoUri ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-purple-950/10 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                  <Camera className="w-8 h-8" />
                </div>
                <h3 className="text-base font-semibold text-slate-200 mb-1">
                  Tirar foto ou carregar imagem
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Fotografe sua mesa agora do jeito que ela está. Formatos JPG, PNG ou WEBP.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-purple-400 font-medium">
                  <UploadCloud className="w-4 h-4" />
                  Clique para selecionar
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 max-h-80 bg-slate-950 flex items-center justify-center">
                  <img
                    src={photoUri}
                    alt="Espaço a ser auditado"
                    className="w-full h-full object-cover max-h-80"
                  />
                  {!loading && (
                    <button
                      onClick={resetar}
                      className="absolute top-3 right-3 bg-slate-950/80 hover:bg-slate-900 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 transition-all shadow-lg"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Trocar foto
                    </button>
                  )}
                </div>

                {!resultado && (
                  <Button
                    onClick={handleAnalisar}
                    disabled={loading}
                    className="w-full py-6 text-base font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 shadow-xl shadow-purple-600/25 transition-all"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2.5">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{loadingStep}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-200" />
                        <span>Gerar Raio-X de Foco com IA</span>
                      </div>
                    )}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ÁREA DE RESULTADOS */}
        {resultado && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Score & Diagnóstico */}
            <Card className="border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-purple-400" />
                      Diagnóstico do Ambiente
                    </span>
                    <h3 className="text-xl font-bold text-white mt-0.5">
                      {passosConcluidos.length === 3 ? "Estado Zen Alcançado! 🧘‍♂️" : resultado.nivel_rotulo}
                    </h3>
                  </div>

                  {/* Medidor de Score Dinâmico com Gamificação */}
                  <div className={`px-4 py-2 rounded-2xl border flex flex-col items-center justify-center transition-all ${getCorScore(scoreAtual)}`}>
                    <span className="text-2xl font-black tracking-tight">{scoreAtual}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">
                      {passosConcluidos.length > 0 ? "Score Atual" : "Score Inicial"}
                    </span>
                  </div>
                </div>

                {/* Barra de Progresso do Score */}
                <div className="w-full bg-slate-800 rounded-full h-2 mt-4 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-purple-500 via-indigo-400 to-emerald-400 h-2 rounded-full transition-all duration-700"
                    style={{ width: `${scoreAtual}%` }}
                  />
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <blockquote className="text-sm text-slate-300 italic border-l-2 border-purple-500 pl-3.5 py-1">
                  "{resultado.diagnostico}"
                </blockquote>

                {/* Distrações Detectadas */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Vilões do foco detectados na foto:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {resultado.distracoes_detectadas.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-3 py-1.5 rounded-lg"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dica Ergonômica de Ouro & Tempo Economizado */}
            <Card className="border-amber-500/30 bg-amber-500/5 shadow-lg">
              <CardContent className="p-5 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-400 mt-0.5">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-amber-300">Dica Ergonômica & Biohacking</h4>
                    <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px] px-2 py-0">
                      {resultado.tempo_economizado}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {resultado.dica_ergonomica_ouro}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Desafio dos 3 Minutos: Missão de Limpeza com Timer */}
            <Card className="border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-slate-800/80 flex flex-row items-center justify-between">
                <div>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] px-2 py-0.5 mb-1">
                    Missão Relâmpago
                  </Badge>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    3 Passos para Destravar a Mesa
                  </CardTitle>
                  <CardDescription className="text-xs text-emerald-400 font-medium">
                    {resultado.ganho_produtividade}
                  </CardDescription>
                </div>

                {/* Cronômetro de 3 Minutos */}
                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <span className={`font-mono text-sm font-bold ${segundosRestantes < 30 ? "text-rose-400 animate-pulse" : "text-slate-200"}`}>
                    {formatarTempo(segundosRestantes)}
                  </span>
                  <button
                    onClick={() => setTimerAtivo(!timerAtivo)}
                    className="ml-1 p-1 hover:bg-slate-800 rounded text-purple-400 hover:text-purple-300 transition-all"
                    title={timerAtivo ? "Pausar" : "Iniciar Timer"}
                  >
                    {timerAtivo ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-3">
                <p className="text-xs text-slate-400">
                  Marque cada ação conforme concluir para subir seu Score na hora:
                </p>

                <div className="space-y-2.5">
                  {resultado.plano_3_passos.map((item, idx) => {
                    const concluido = passosConcluidos.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => alternarPasso(idx)}
                        className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                          concluido
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-200"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                            concluido
                              ? "bg-emerald-500 border-emerald-500 text-slate-950 font-bold"
                              : "border-slate-600 bg-slate-900"
                          }`}
                        >
                          {concluido && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <p className={`text-xs font-medium leading-relaxed ${concluido ? "line-through opacity-75" : ""}`}>
                            {item.acao}
                          </p>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Tempo estimado: {item.tempo_estimado}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {passosConcluidos.length === 3 && (
                  <div className="mt-3 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center space-y-1 animate-in zoom-in-95 duration-300">
                    <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-400" />
                      Parabéns! Sua mesa atingiu o Estado Zen!
                    </p>
                    <p className="text-[11px] text-slate-300">
                      Sua área de trabalho está limpa e seu cérebro pronto para foco absoluto.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Modo Foco Zen: Player de Sons de Concentração */}
            <Card className="border-slate-800 bg-slate-900/90 shadow-xl">
              <CardHeader className="p-5 pb-2 border-b border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    <CardTitle className="text-sm font-bold text-white">
                      Modo Foco Profundo (Sons Relaxantes)
                    </CardTitle>
                  </div>
                  {somAtual !== "nenhum" && (
                    <Badge variant="outline" className="border-purple-500/40 text-purple-300 text-[10px] animate-pulse">
                      Tocando agora
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs text-slate-400">
                  Música ou ruído sintetizado para abafar distrações enquanto você produz na sua mesa limpa:
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSom("chuva")}
                  className={`text-xs px-4 py-2 rounded-xl transition-all border ${
                    somAtual === "chuva"
                      ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  🌧️ Chuva Suave
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleSom("marrom")}
                  className={`text-xs px-4 py-2 rounded-xl transition-all border ${
                    somAtual === "marrom"
                      ? "bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30"
                      : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  ☕ Ruído Marrom (Foco)
                </Button>

                {somAtual !== "nenhum" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={pararSom}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3"
                  >
                    <VolumeX className="w-3.5 h-3.5 mr-1" />
                    Silêncio
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Botão de Nova Análise */}
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                onClick={resetar}
                className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs px-6 py-2 rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Auditar outra mesa ou espaço
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="w-full max-w-2xl text-center py-8 text-slate-500 text-xs space-y-1">
        <p>DeskZen IA • Inspirado na filosofia Lean 5S adaptada para alta performance pessoal.</p>
        <p className="text-[10px] text-slate-600">Processamento em nuvem com Gemini 3.6 Flash. Nenhuma imagem pessoal é retida.</p>
      </footer>
    </main>
  );
}
