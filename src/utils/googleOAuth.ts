import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const REDIRECT_PORT = 34023;

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  email?: string;
}

let cachedAccessToken: string | null = null;
let isSigningIn = false;

function generateCodeVerifier(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => chars[byte % chars.length]).join('');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function readTokenData(): TokenData | null {
  try {
    const raw = localStorage.getItem('cattimer-google-token-data');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveTokenData(data: TokenData) {
  localStorage.setItem('cattimer-google-token-data', JSON.stringify(data));
  localStorage.setItem('cattimer-google-connected', 'true');
  if (data.email) {
    localStorage.setItem('cattimer-google-email', data.email);
  }
}

function clearTokenData() {
  localStorage.removeItem('cattimer-google-token-data');
  localStorage.removeItem('cattimer-google-connected');
  localStorage.removeItem('cattimer-google-email');
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) return null;

    const tokens = await response.json();
    const data = readTokenData();
    const newData: TokenData = {
      access_token: tokens.access_token,
      refresh_token: data?.refresh_token || refreshToken,
      expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
      email: data?.email,
    };

    saveTokenData(newData);
    cachedAccessToken = tokens.access_token;
    return tokens.access_token;
  } catch {
    return null;
  }
}

export const initAuth = (
  onAuthSuccess?: (user: { email: string }, token: string) => void,
  onAuthFailure?: () => void,
) => {
  const data = readTokenData();
  if (data && data.access_token) {
    cachedAccessToken = data.access_token;
    if (onAuthSuccess) onAuthSuccess({ email: data.email || '' }, data.access_token);
  } else {
    cachedAccessToken = null;
    if (onAuthFailure) onAuthFailure();
  }
  return () => {};
};

export const googleSignIn = async (): Promise<{ user: { email: string }; accessToken: string } | null> => {
  if (isSigningIn) {
    console.warn('Google sign-in is already in progress.');
    return null;
  }
  if (!CLIENT_ID) {
    console.error('VITE_GOOGLE_CLIENT_ID no está configurado en .env');
    throw new Error('Falta la configuración de Google OAuth');
  }

  try {
    isSigningIn = true;

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const redirectUri = `http://127.0.0.1:${REDIRECT_PORT}`;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      access_type: 'offline',
      prompt: 'consent',
    })}`;

    const [redirectPath] = await Promise.all([
      invoke<string>('start_auth_server', { port: REDIRECT_PORT }),
      openUrl(authUrl),
    ]);

    const url = new URL(redirectPath, `http://127.0.0.1:${REDIRECT_PORT}`);
    const code = url.searchParams.get('code');
    if (!code) {
      throw new Error('No se recibió el código de autorización de Google');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Error al intercambiar código por tokens: ${errText}`);
    }

    const tokens = await tokenResponse.json();

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = userInfoResponse.ok ? await userInfoResponse.json() : { email: '' };

    const tokenData: TokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in || 3600) * 1000,
      email: userInfo.email || '',
    };

    saveTokenData(tokenData);
    cachedAccessToken = tokens.access_token;

    return { user: { email: userInfo.email || '' }, accessToken: tokens.access_token };
  } catch (error: any) {
    console.error('Error al iniciar sesión en Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const data = readTokenData();
  if (!data) return null;

  if (data.expires_at > Date.now()) {
    cachedAccessToken = data.access_token;
    return cachedAccessToken;
  }

  if (data.refresh_token) {
    return refreshAccessToken(data.refresh_token);
  }

  return null;
};

export const getAccessTokenSync = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  const data = readTokenData();
  if (data && data.expires_at > Date.now()) {
    cachedAccessToken = data.access_token;
    return cachedAccessToken;
  }
  return null;
};

export const logout = async () => {
  cachedAccessToken = null;
  clearTokenData();
};
