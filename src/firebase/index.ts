'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  Firestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

/**
 * Inicializa os serviços do Firebase com resiliência para dispositivos móveis e desktop.
 */
export function initializeFirebase() {
  if (typeof window === 'undefined') {
    return { app: {} as any, db: {} as any, auth: {} as any };
  }

  if (!app) {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'undefined') {
      console.error('Firebase API Key está faltando ou é inválida no .env.local');
    }

    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Inicialização resiliente do Firestore para mobile e desktop
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch (err) {
      db = getFirestore(app);
    }
    
    getStorage(app);
  }
  return { app, db, auth };
}
