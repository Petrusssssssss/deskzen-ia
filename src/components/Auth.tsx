"use client";

import React, { useState } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  Auth 
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Loader2, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AuthComponent({ auth }: { auth: Auth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // Atualiza o estado da rota de forma suave e reativa
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro de Autenticação",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4 md:p-8 bg-background relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent rounded-full blur-[120px]" />
      </div>

      <Card className="w-full max-w-sm md:max-w-md border-2 border-primary/10 shadow-2xl rounded-[2.5rem] bg-card/80 backdrop-blur-sm relative z-10 animate-in fade-in zoom-in duration-700">
        <CardHeader className="text-center pt-10">
          <div className="flex justify-center mb-6">
            <div className="p-5 bg-primary/10 rounded-3xl shadow-inner animate-pulse-slow">
              <Shield className="text-primary" size={40} />
            </div>
          </div>
          <CardTitle className="text-3xl md:text-4xl font-headline font-black text-primary tracking-tight">
            {isLogin ? "Recrutar Auditor" : "Novo Alistamento"}
          </CardTitle>
          <CardDescription className="italic text-sm md:text-base font-medium text-muted-foreground mt-2">
            "Sem disciplina, a excelência é inalcançável."
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-10 px-8">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-4">
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <Input 
                  type="email" 
                  placeholder="E-mail Corporativo" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required
                  className="pl-12 h-14 rounded-2xl bg-muted/30 border-transparent focus:bg-background focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <Input 
                  type="password" 
                  placeholder="Senha de Acesso" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required
                  className="pl-12 h-14 rounded-2xl bg-muted/30 border-transparent focus:bg-background focus:ring-primary/20 transition-all font-medium"
                />
              </div>
            </div>
            
            <Button 
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : (isLogin ? "AUTORIZAR ENTRADA" : "CONFIRMAR ALISTAMENTO")}
            </Button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-muted" />
              <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">OU</span>
              <div className="flex-grow border-t border-muted" />
            </div>

            <Button 
              type="button" 
              variant="ghost" 
              className="w-full text-[10px] uppercase font-black tracking-widest text-muted-foreground hover:text-primary hover:bg-transparent"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "SOLICITAR NOVA CONTA" : "RETORNAR AO LOGIN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
