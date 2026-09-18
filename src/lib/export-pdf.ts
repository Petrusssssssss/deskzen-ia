import { jsPDF } from "jspdf";

/**
 * Converte uma URL de imagem (como Supabase Storage) para Data URL Base64
 * para ser desenhada diretamente dentro do documento jsPDF.
 */
function getBase64Image(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        console.warn("Falha ao converter imagem via Canvas para PDF:", e);
        resolve(null);
      }
    };
    img.onerror = () => {
      // Fallback via fetch se o crossOrigin direto falhar
      fetch(url)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        })
        .catch(() => resolve(null));
    };
    img.src = url;
  });
}

export const exportToPDF = async (audit: any) => {
  const doc = new jsPDF();
  
  // Definições de layout e dimensões da página
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Função auxiliar para gerenciar quebra de página automática de forma limpa
  const checkPageBreak = (spaceNeeded: number) => {
    if (cursorY + spaceNeeded > pageHeight - 20) { // Margem de segurança inferior de 20mm
      doc.addPage();
      cursorY = margin; // Reseta o cursor para o topo da nova página
    }
  };

  // Tratamento seguro dos dados (antigos e novos)
  const title = audit.titulo || "Auditoria 5S";
  const score = audit.score ?? audit.result ?? 0;
  const feedback = audit.coachFeedback || audit.feedback_gamificado || "Sem feedback registrado.";
  const notes = audit.notes || audit.comentario || "Nenhum comentário adicional.";
  
  // Campos extras
  const auditor = audit.auditor || audit.usuario || null;
  const status = audit.status || "Finalizado";

  // Tratamento da data
  let dateStr = new Date().toLocaleDateString("pt-BR");
  if (audit.createdAt) {
    if (typeof audit.createdAt.toDate === "function") {
      dateStr = audit.createdAt.toDate().toLocaleDateString("pt-BR");
    } else if (typeof audit.createdAt === "string" || typeof audit.createdAt === "number") {
      dateStr = new Date(audit.createdAt).toLocaleDateString("pt-BR");
    }
  }

  // --- A) CABEÇALHO PROFISSIONAL ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("Relatório Coach 5S", margin, cursorY);
  cursorY += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`Tarefa: ${title}`, margin, cursorY);
  cursorY += 7;
  doc.text(`Data da Auditoria: ${dateStr}`, margin, cursorY);
  cursorY += 15;

  // --- B) RESUMO DA AUDITORIA ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Resumo da Auditoria", margin, cursorY);
  cursorY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  
  doc.text(`Nota / Desempenho Geral: ${score}%`, margin, cursorY);
  cursorY += 7;
  doc.text(`Status: ${status}`, margin, cursorY);
  cursorY += 7;
  
  if (auditor) {
    doc.text(`Auditor Responsável: ${auditor}`, margin, cursorY);
    cursorY += 7;
  }
  cursorY += 10;

  // --- C) EVIDÊNCIAS FOTOGRÁFICAS (ANTES E DEPOIS) ---
  const beforeUrl = audit.beforeImage || audit.beforeImageUrl;
  const afterUrl = audit.afterImage || audit.afterImageUrl;

  if (beforeUrl || afterUrl) {
    checkPageBreak(85);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Evidências Fotográficas (Antes e Depois)", margin, cursorY);
    cursorY += 8;

    const [beforeB64, afterB64] = await Promise.all([
      beforeUrl ? getBase64Image(beforeUrl) : null,
      afterUrl ? getBase64Image(afterUrl) : null,
    ]);

    const colWidth = (maxWidth - 10) / 2;
    const colHeight = colWidth * 0.75; // Proporção padrão 4:3

    if (beforeB64) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(140, 40, 40);
      doc.text("EVIDÊNCIA: ANTES", margin, cursorY);
      try {
        doc.addImage(beforeB64, "JPEG", margin, cursorY + 3, colWidth, colHeight);
      } catch (e) {
        console.warn("Erro ao renderizar foto Antes:", e);
      }
    }

    if (afterB64) {
      const xRight = margin + colWidth + 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40, 130, 60);
      doc.text("EVIDÊNCIA: DEPOIS", xRight, cursorY);
      try {
        doc.addImage(afterB64, "JPEG", xRight, cursorY + 3, colWidth, colHeight);
      } catch (e) {
        console.warn("Erro ao renderizar foto Depois:", e);
      }
    }

    if (beforeB64 || afterB64) {
      cursorY += colHeight + 14;
    }
  }

  // --- D) SEÇÃO DE ANOTAÇÕES ---
  checkPageBreak(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Anotações do Auditor:", margin, cursorY);
  cursorY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  
  const splitNotes = doc.splitTextToSize(notes, maxWidth);
  splitNotes.forEach((line: string) => {
    checkPageBreak(6);
    doc.text(line, margin, cursorY);
    cursorY += 6;
  });
  cursorY += 10;

  // --- E) DIAGNÓSTICO DO COACH 5S ---
  checkPageBreak(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 40);
  doc.text("Diagnóstico do Coach", margin, cursorY);
  cursorY += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  
  const splitFeedback = doc.splitTextToSize(feedback, maxWidth);
  splitFeedback.forEach((line: string) => {
    checkPageBreak(6);
    doc.text(line, margin, cursorY);
    cursorY += 6;
  });
  cursorY += 10;

  // --- F) ANÁLISE DETALHADA POR PILAR 5S ---
  if (audit?.analise_5s) {
    checkPageBreak(25);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Análise por Pilar 5S", margin, cursorY);
    cursorY += 8;

    const pilares = [
      { key: "seiri", titulo: "1S Seiri / Descarte" },
      { key: "seiton", titulo: "2S Seiton / Organização" },
      { key: "seiso", titulo: "3S Seiso / Limpeza" },
      { key: "seiketsu", titulo: "4S Seiketsu / Padronização" },
      { key: "shitsuke", titulo: "5S Shitsuke / Disciplina" }
    ] as const;

    pilares.forEach((pilar) => {
      const dadosPilar = audit.analise_5s[pilar.key];
      if (dadosPilar) {
        checkPageBreak(18);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);

        let tituloComNota = pilar.titulo;
        if (dadosPilar.nota !== undefined) {
          tituloComNota += ` (Nota: ${dadosPilar.nota}/10)`;
        }
        doc.text(tituloComNota, margin, cursorY);
        cursorY += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(80, 80, 80);

        if (dadosPilar.diagnostico) {
          const diagText = `Diagnóstico: ${dadosPilar.diagnostico}`;
          const splitDiag = doc.splitTextToSize(diagText, maxWidth);
          splitDiag.forEach((line: string) => {
            checkPageBreak(6);
            doc.text(line, margin, cursorY);
            cursorY += 6;
          });
        }

        if (dadosPilar.recomendacao) {
          const recText = `Recomendação: ${dadosPilar.recomendacao}`;
          const splitRec = doc.splitTextToSize(recText, maxWidth);
          splitRec.forEach((line: string) => {
            checkPageBreak(6);
            doc.text(line, margin, cursorY);
            cursorY += 6;
          });
        }
        cursorY += 4;
      }
    });
  }

  // --- G) RODAPÉ EM TODAS AS PÁGINAS ---
  const pageCount = (doc.internal as any).getNumberOfPages();
  const exportDate = new Date().toLocaleString("pt-BR");

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    
    const footerText = `Gerado pelo Coach 5S  |  Exportado em: ${exportDate}  |  Página ${i} de ${pageCount}`;
    const textWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);
  }

  // Download do arquivo
  const fileName = `auditoria-${title.replace(/\s+/g, "-").toLowerCase()}.pdf`;
  doc.save(fileName);
};
