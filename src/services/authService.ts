import { supabase } from '../lib/supabase';
import { AuthSession } from '../types';

/**
 * Registers a new user with Supabase.
 */
export async function registerUser(name: string, email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) {
    if (error.message.includes('Email rate limit exceeded')) {
      throw new Error('Limite de envio de e-mails excedido. Por favor, aguarde alguns minutos ou configure um serviço de SMTP próprio no Supabase.');
    }
    throw new Error(error.message);
  }
}

/**
 * Authenticates a user with Supabase.
 */
export async function loginUser(email: string, password: string, rememberMe: boolean = false): Promise<AuthSession> {
  console.log('Tentando login para:', email);
  
  if (!supabase || !supabase.auth || typeof supabase.auth.signInWithPassword !== 'function') {
    console.error('Supabase client ou Auth não inicializado corretamente.', {
      supabase: !!supabase,
      auth: !!(supabase && supabase.auth),
      signInWithPassword: !!(supabase && supabase.auth && supabase.auth.signInWithPassword)
    });
    throw new Error('Erro de configuração do Supabase.');
  }

  console.log('Chamando supabase.auth.signInWithPassword...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  console.log('Resposta do signInWithPassword recebida.');

  if (error) {
    if (error.message.includes('Email rate limit exceeded')) {
      throw new Error('Limite de tentativas excedido. Por favor, aguarde alguns minutos ou configure um serviço de SMTP próprio no Supabase.');
    }
    throw new Error('E-mail ou senha incorretos.');
  }

  if (!data.user || !data.session) {
    throw new Error('Falha na autenticação.');
  }

  // Map Supabase session to our AuthSession type
  const session: AuthSession = {
    user: {
      id: data.user.id,
      name: data.user.user_metadata.name || 'Usuário',
      email: data.user.email || '',
    },
    token: data.session.access_token,
    expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
  };

  return session;
}

/**
 * Gets the current active session from Supabase.
 */
export async function getSession(): Promise<AuthSession | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) return null;

  return {
    user: {
      id: session.user.id,
      name: session.user.user_metadata.name || 'Usuário',
      email: session.user.email || '',
    },
    token: session.access_token,
    expiresAt: new Date(session.expires_at! * 1000).toISOString(),
  };
}

/**
 * Clears the current session with Supabase.
 */
export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}
