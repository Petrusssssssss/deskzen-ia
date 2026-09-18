import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabase';

/**
 * Serviço para lidar com imagens no Supabase Storage.
 */
export const storageService = {
  /**
   * Comprime uma imagem seguindo os limites de performance.
   */
  async compressImage(file: File): Promise<File> {
    const options = {
      maxSizeMB: 1.0,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };
    return await imageCompression(file, options);
  },

  /**
   * Faz upload de uma imagem já processada para o Supabase Storage.
   */
  async uploadAuditImage(file: File, userId: string, type: 'before' | 'after'): Promise<string> {
    if (!userId) {
      throw new Error('Usuário não identificado para upload.');
    }

    const isPlaceholder = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').includes('placeholder') || !process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (isPlaceholder) {
      throw new Error('Supabase não configurado. Adicione as chaves no seu .env.local');
    }

    try {
      // O nome do arquivo usa UUID para segurança e evitar colisões
      const safeFileName = `audit-${Date.now()}-${crypto.randomUUID()}.jpg`;
      const safePath = `${userId}/${type}-${safeFileName}`;
      
      const { error } = await supabase.storage
        .from('fotos')
        .upload(safePath, file, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('fotos')
        .getPublicUrl(safePath);
      
      return publicUrl;
    } catch (error: any) {
      console.error('Erro no upload da imagem para o Supabase:', error);
      throw new Error(error.message || 'Não foi possível processar a imagem.');
    }
  }
};
