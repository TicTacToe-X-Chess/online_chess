'use client';

import { useState } from 'react';
import { Crown, User, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  // Afficher un message si on vient de l'inscription
  const message = searchParams?.get('message');
  if (message === 'check-email') {
    toast.info('Vérifiez votre email pour activer votre compte');
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    if (!password.trim()) {
      toast.error('Veuillez entrer votre mot de passe');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Connexion en cours...');

    try {
      // Connexion avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erreur de connexion');
      }

      toast.dismiss(loadingToast);
      toast.success('Connexion réussie ! Redirection...');
      
      // Redirection manuelle en plus de celle du hook useAuth
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (error: any) {
      toast.dismiss(loadingToast);
      
      // Gestion des erreurs spécifiques
      if (error.message?.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Veuillez confirmer votre email avant de vous connecter');
      } else if (error.message?.includes('Too many requests')) {
        toast.error('Trop de tentatives de connexion. Veuillez réessayer plus tard');
      } else if (error.message?.includes('User not found')) {
        toast.error('Aucun compte trouvé avec cet email');
      } else {
        toast.error(error.message || 'Erreur de connexion');
      }
      
      console.error('Erreur connexion:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-indigo-600/10 blur-3xl" />
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Crown className="h-10 w-10 text-blue-400" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ChessMaster
            </span>
          </Link>
        </div>

        <Card className="glass-effect border-white/10 shadow-2xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-white">
              Connexion
            </CardTitle>
            <CardDescription className="text-slate-400">
              Connectez-vous à votre compte pour jouer
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-200">
                  Email
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-200">
                  Mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Lien mot de passe oublié */}
              <div className="text-right">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full chess-gradient hover:opacity-90 transition-all hover-lift py-6 text-lg font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Pas encore de compte ?{' '}
                <Link 
                  href="/auth/register" 
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Créer un compte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-sm text-slate-400 hover:text-blue-400 transition-colors"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}