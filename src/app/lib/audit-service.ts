import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  serverTimestamp, 
  increment,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export interface SensoAnalysis {
  nota?: number;
  diagnostico?: string;
  recomendacao?: string;
}

export interface Analise5S {
  seiri?: SensoAnalysis;
  seiton?: SensoAnalysis;
  seiso?: SensoAnalysis;
  seiketsu?: SensoAnalysis;
  shitsuke?: SensoAnalysis;
}

export interface AuditData {
  auditorId: string;
  auditorEmail: string;
  beforeImage: string;
  afterImage: string;
  
  // Campos extras mapeados no AuditCapture por compatibilidade visual
  beforeImageUrl?: string;
  afterImageUrl?: string;
  
  result: number;
  score?: number;
  
  notes: string;
  titulo?: string;
  comentario?: string;
  coachFeedback?: string;
  coachTone?: 'strict' | 'motivational' | 'neutral';
  
  // Estrutura dos 5 Sensos
  analise_5s?: Analise5S;
}

export const auditService = {
  /**
   * Salva a auditoria garantindo o vínculo com o ID do auditor para isolamento.
   */
  async saveAudit(db: Firestore, auditData: AuditData) {
    if (!auditData.auditorId) {
      throw new Error("Falha Crítica: Sessão de usuário não identificada para o registro.");
    }

    const auditsRef = collection(db, 'audits');
    
    try {
      // Preparação e sanitização defensiva do payload para o Firestore
      const payloadToSave = {
        ...auditData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Se o campo analise_5s chegar como undefined, removemos a chave para evitar erro no Firestore
      if (payloadToSave.analise_5s === undefined) {
        delete payloadToSave.analise_5s;
      }

      // 1. Salva a auditoria principal com o carimbo do dono (auditorId)
      const auditDoc = await addDoc(auditsRef, payloadToSave);

      // 2. Atualiza o perfil do usuário (Nível de Disciplina Atual e contador de auditorias)
      const userRef = doc(db, 'users', auditData.auditorId);
      await setDoc(userRef, {
        lastAuditDate: serverTimestamp(),
        lastCoachFeedback: auditData.coachFeedback,
        lastCoachTone: auditData.coachTone,
        disciplineLevel: auditData.result,
        email: auditData.auditorEmail,
        auditsCount: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      return auditDoc.id;
    } catch (err: any) {
      const error = new FirestorePermissionError({
        path: 'audits',
        operation: 'create',
        requestResourceData: auditData
      });
      errorEmitter.emit('permission-error', error);
      throw err;
    }
  }
};
