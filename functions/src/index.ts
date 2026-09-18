/**
 * @fileOverview Cloud Functions v2 para Coach 5S.
 * Foco em Multi-tenancy (Claims) e Agregação de Analytics (Event-driven).
 */

import { onDocumentWritten, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

admin.initializeApp();

/**
 * Sincroniza Custom Claims (empresaId e role) sempre que o perfil é alterado no Firestore.
 * Garante que o isolamento multi-tenant seja validado pelo token JWT.
 */
export const processarCustomClaims = onDocumentWritten("users/{userId}", async (event) => {
  const data = event.data?.after.data();
  if (!data) return;

  const { empresaId, role } = data;
  const uid = event.params.userId;

  try {
    await admin.auth().setCustomUserClaims(uid, {
      empresaId: empresaId || null,
      role: role || 'user'
    });
    console.log(`Claims atualizados para o usuário: ${uid}`);
  } catch (error) {
    console.error(`Erro ao atualizar Claims para ${uid}:`, error);
  }
});

/**
 * Agregador de Analytics Mensal.
 * Detecta a transição de status para 'concluida' e atualiza métricas.
 */
export const agregarAnalyticsMensal = onDocumentUpdated("audits/{auditId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();

  if (!before || !after) return;

  // Só executa se a auditoria acabou de ser marcada como concluída
  if (before.status !== "concluida" && after.status === "concluida") {
    const { scoreTotal, timestamp, empresaId } = after;
    
    // Formatação de Document ID para Analytics (empresaId_MM-YYYY)
    const date = timestamp.toDate();
    const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
    const docId = `${empresaId}_${monthYear}`;

    const analyticsRef = admin.firestore().collection("analytics_mensal").doc(docId);

    try {
      await analyticsRef.set({
        empresaId,
        monthYear,
        totalAudits: admin.firestore.FieldValue.increment(1),
        totalScore: admin.firestore.FieldValue.increment(scoreTotal),
        lastUpdate: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log(`Analytics atualizado para ${docId}`);
    } catch (error) {
      console.error(`Erro ao agregar analytics para ${docId}:`, error);
    }
  }
});