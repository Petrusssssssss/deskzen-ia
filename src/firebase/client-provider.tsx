'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

export const FirebaseClientProvider = ({ children }: { children: ReactNode }) => {
  const [instances, setInstances] = useState<{
    app: FirebaseApp;
    db: Firestore;
    auth: Auth;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const firebase = initializeFirebase();
    if (firebase.app && firebase.app.name) {
      setInstances(firebase);
    }
  }, []);

  if (!mounted || !instances) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <FirebaseProvider 
      firebaseApp={instances.app} 
      firestore={instances.db} 
      auth={instances.auth}
    >
      {children}
    </FirebaseProvider>
  );
};
