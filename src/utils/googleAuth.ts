import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Calendar scopes
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const savedToken = localStorage.getItem('cattimer-google-token');
  if (savedToken) {
    cachedAccessToken = savedToken;
  }
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Try loading from localStorage
        const token = localStorage.getItem('cattimer-google-token');
        if (token) {
          cachedAccessToken = token;
          if (onAuthSuccess) onAuthSuccess(user, token);
        } else {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) {
    console.warn('Google sign-in is already in progress.');
    return null;
  }
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('cattimer-google-token', cachedAccessToken);
    // Store custom flag in localStorage that user has connected calendar
    localStorage.setItem('cattimer-google-connected', 'true');
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.warn('El usuario cerró o canceló la ventana de autenticación de Google.');
      throw error; // Re-throw so App.tsx can show a lovely custom notification to the user
    }
    console.error('Error al iniciar sesión en Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('cattimer-google-token');
  }
  return cachedAccessToken;
};

export const getAccessTokenSync = (): string | null => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('cattimer-google-token');
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('cattimer-google-connected');
  localStorage.removeItem('cattimer-google-token');
};
