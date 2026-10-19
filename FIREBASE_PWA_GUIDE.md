# Firebase Integration & PWA Installation Guide

This document provides a comprehensive technical guide on how this project implements **Firebase Authentication**, **Cloud Firestore with Real-Time & Offline Sync**, and **Progressive Web App (PWA) Installation**. 

You can use this exact blueprint to recreate this architecture in any React + Vite application.

---

## 📐 1. Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │                      React App                          │
 └────────────────────────────┬────────────────────────────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│     Authentication      │       │     State & Storage     │
│   (useAuth.js Hook)     │       │   (useStore.js Hook)    │
└────────────┬────────────┘       └────────────┬────────────┘
             │                                 │
             ▼                                 ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│  Firebase Auth (Google) │       │      useFirestore       │
└─────────────────────────┘       └────────────┬────────────┘
                                               │
                                 ┌─────────────┴─────────────┐
                                 ▼                           ▼
                      ┌────────────────────┐      ┌────────────────────┐
                      │  Local Storage     │      │ Cloud Firestore DB │
                      │  (Offline Cache)   │      │ (Real-Time Listener│
                      │                    │      │ & IndexedDB Sync)  │
                      └────────────────────┘      └────────────────────┘
```

---

## 🔑 2. Firebase Setup & Environment Configuration

### Step A: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project.
3. Enable **Google Authentication** under **Build → Authentication → Sign-in method**.
4. Create a **Cloud Firestore Database** under **Build → Firestore Database** in Production or Test mode.
5. Register a Web App inside your Firebase Project to obtain your API configuration credentials.

### Step B: Environment Variables (`.env`)
Store your Firebase credentials in `.env` at the root of your project. In Vite, environment variables exposed to the client must start with `VITE_`.

```env
VITE_FIREBASE_API_KEY=AIzaSyABroyDHrEGDIiigmM1jLG7OoznbtxmQXE
VITE_FIREBASE_AUTH_DOMAIN=b1-app-1624.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=b1-app-1624
VITE_FIREBASE_STORAGE_BUCKET=b1-app-1624.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=742229288573
VITE_FIREBASE_APP_ID=1:742229288573:web:27a2d5d25f43c0bb1ef314
```

> 💡 **Firebase Config snippet (`configObjext.txt`) Reference:**
> ```javascript
> const firebaseConfig = {
>   apiKey: "AIzaSyABroyDHrEGDIiigmM1jLG7OoznbtxmQXE",
>   authDomain: "b1-app-1624.firebaseapp.com",
>   projectId: "b1-app-1624",
>   storageBucket: "b1-app-1624.firebasestorage.app",
>   messagingSenderId: "742229288573",
>   appId: "1:742229288573:web:27a2d5d25f43c0bb1ef314"
> };
> ```

---

## ⚙️ 3. Firebase SDK Initialization (`src/firebase.js`)

Create `src/firebase.js` to initialize Firebase services, enable offline persistence, and export the instances.

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// 1. Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 2. Export Auth & Firestore instances
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);

// 3. Enable Offline Persistence (IndexedDB)
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open — offline persistence disabled');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support offline persistence');
  }
});
```

---

## 🔒 4. Authentication Hook (`src/hooks/useAuth.js`)

A custom React hook that tracks user session state and provides simple `signIn` and `signOut` actions.

```javascript
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, provider } from '../firebase';

export function useAuth() {
  const [user, setUser]       = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    // Listen for authentication changes automatically
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn() {
    setError(null);
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      setError(e.message);
    }
  }

  async function signOutUser() {
    await signOut(auth);
  }

  return { user, loading, error, signIn, signOut: signOutUser };
}
```

---

## 🔄 5. Real-Time Firestore Sync & Offline Fallback (`src/hooks/useFirestore.js`)

This hook connects a user's unique UID to their dedicated Firestore document at path `users/{uid}/data/{docId}` (`main` for Personal profile, `business` for Business profile).

Key characteristics:
1. **Multi-Profile Isolation**: Personal data lives in `users/{uid}/data/main` (cached under `b1-v2`), while Business data lives in `users/{uid}/data/business` (cached under `b1-v2-business`). Switching profiles re-initializes listeners with zero cross-profile leakage.
2. **Real-time Listener (`onSnapshot`)**: Automatically synchronizes data whenever remote Firestore updates occur.
3. **Local Cache Backup (`localStorage`)**: Saves state locally per profile so data loads instantly even before network response or offline startup.
4. **Optimistic Updates (`update`)**: Mutates UI state immediately and schedules a Firestore `setDoc` call in the background.

### 🛡️ Recommended Firestore Security Rules
> ⚠️ **IMPORTANT**: If your Firebase rules were previously restricted to `.../data/main`, update them to use `{docId}` so the `business` document can be read and written:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

```javascript
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

function emptyData() {
  return { months: {}, categories: [], recurring: [], radar: [] };
}

function userDocRef(uid) {
  return doc(db, 'users', uid, 'data', 'main');
}

export function useFirestore(uid) {
  const [data, setData]       = useState(null);
  const [ready, setReady]     = useState(false);
  const [syncing, setSyncing] = useState(false);

  // 1. Subscribe to Firestore Document Changes
  useEffect(() => {
    if (!uid) return;
    const ref = userDocRef(uid);
    
    const unsub = onSnapshot(ref, snap => {
      if (snap.exists()) {
        const d = snap.data();
        setData(d);
      } else {
        const empty = emptyData();
        setDoc(ref, empty);
        setData(empty);
      }
      setReady(true);
    }, err => {
      console.warn('Firestore snapshot error:', err.code);
      // Fallback to local storage if offline or error occurs
      try {
        const raw = localStorage.getItem('app-cache');
        setData(raw ? JSON.parse(raw) : emptyData());
      } catch { 
        setData(emptyData()); 
      }
      setReady(true);
    });

    return unsub;
  }, [uid]);

  // 2. Save function with local backup & remote setDoc
  const save = useCallback(async (newData) => {
    if (!uid) return;
    setSyncing(true);
    localStorage.setItem('app-cache', JSON.stringify(newData));
    try {
      await setDoc(userDocRef(uid), newData);
    } catch (e) {
      console.warn('Firestore write queued (offline):', e.code);
    } finally {
      setSyncing(false);
    }
  }, [uid]);

  // 3. Helper for clean state mutations
  const update = useCallback((fn) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev || emptyData()));
      fn(next);
      save(next);
      return next;
    });
  }, [save]);

  return { data, ready, syncing, update };
}
```

---

## 📱 6. PWA Setup (Installing the Web Application as an App)

To make the web application installable on Mobile (iOS / Android) and Desktop (Chrome / Edge), follow these 4 steps:

### 1. Web App Manifest (`public/manifest.webmanifest`)
Define application details, colors, display mode, and icon sizes.

```json
{
  "name": "B1 — Keep It Simple",
  "short_name": "B1",
  "description": "Your personal expense tracker",
  "theme_color": "#0a0a0f",
  "background_color": "#0a0a0f",
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "icons": [
    { "src": "pwa-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "pwa-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### 2. HTML Meta Tags (`index.html`)
Include meta tags in `<head>` for native iOS Safari and Android Chrome behavior:

```html
<!-- Mobile viewport styling -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#0a0a0f" />

<!-- PWA Manifest link -->
<link rel="manifest" href="/manifest.webmanifest" />

<!-- Apple iOS specific meta tags -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="B1" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### 3. Vite PWA Plugin (`vite.config.js`)
Install `vite-plugin-pwa` to auto-generate Service Workers for offline caching:

```bash
npm install vite-plugin-pwa -D
```

Configure `vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'B1 — Keep It Simple',
        short_name: 'B1',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
      }
    })
  ],
});
```

---

## 📲 How to Install as an App on User Devices

### On iOS (iPhone / iPad - Safari)
1. Open the web app URL in **Safari**.
2. Tap the **Share** icon (square with an up arrow) at the bottom.
3. Scroll down and tap **Add to Home Screen**.
4. The app will install and run in full-screen standalone mode without any browser URL bars.

### On Android (Chrome / Edge)
1. Open the web app URL in **Chrome**.
2. Tap the **Three Dots (Menu)** in the top-right corner.
3. Tap **Install App** (or **Add to Home Screen**).
4. An app icon will be created on the home screen/app drawer.

### On Desktop (Chrome / Brave / Edge)
1. Open the website.
2. Click the **Install Icon** (computer icon with an arrow) in the address bar.
3. Click **Install**. The app opens in its own window.

---

## 📋 Summary Checklist for New Projects

To replicate this exact setup in another project:

- [ ] **Install Dependencies**: `npm install firebase react-router-dom` and `npm install -D vite-plugin-pwa`
- [ ] **Environment File**: Create `.env` containing `VITE_FIREBASE_*` credentials.
- [ ] **Firebase Setup**: Copy `src/firebase.js` with `initializeApp`, `getAuth`, and `enableIndexedDbPersistence`.
- [ ] **Auth Hook**: Copy `src/hooks/useAuth.js` for Google login & auth monitoring.
- [ ] **Firestore Sync Hook**: Copy `src/hooks/useFirestore.js` to manage real-time `onSnapshot` & optimistic state mutations.
- [ ] **PWA Configuration**: Add `manifest.webmanifest`, `pwa-192.png`, `pwa-512.png` into `public/`, and add meta tags to `index.html`.
