'use client';

import { useState } from 'react';
import { Crown, User, Mail, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CountrySelect } from '@/components/ui/country-select';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    country: ''
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation côté client
    if (!formData.username.trim()) {
      toast.error('Veuillez entrer un nom d\'utilisateur');
      return;
    }

    if (formData.username.length < 3) {
      toast.error('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      return;
    }

    if (formData.username.length > 20) {
      toast.error('Le nom d\'utilisateur ne peut pas dépasser 20 caractères');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      toast.error('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    if (!formData.password.trim()) {
      toast.error('Veuillez entrer un mot de passe');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Création de votre compte...');

    try {
      // 1. Vérifier si le pseudo est déjà utilisé
      const { data: existingUser, error: checkError } = await supabase
        .from('user_public')
        .select('pseudo')
        .eq('pseudo', formData.username.trim())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = pas de données trouvées, c'est OK
        throw new Error('Erreur lors de la vérification du pseudo');
      }

      if (existingUser) {
        toast.dismiss(loadingToast);
        toast.error('Ce nom d\'utilisateur est déjà utilisé');
        setLoading(false);
        return;
      }

      // 2. Créer l'utilisateur avec Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            username: formData.username.trim(),
            country: formData.country || null
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // 3. Insérer les données dans user_public
      const { error: insertError } = await supabase
        .from('user_public')
        .insert({
          id: authData.user.id,
          email: formData.email.trim(),
          pseudo: formData.username.trim(),
          country: formData.country || null,
          created_at: new Date().toISOString(),
          last_connection: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Erreur insertion user_public:', insertError);
        throw new Error('Erreur lors de la sauvegarde des données utilisateur');
      }

      // 4. Créer l'entrée dans user_ranking avec les bonnes valeurs par défaut
      const { error: rankingError } = await supabase
        .from('user_ranking')
        .insert({
          user_id: authData.user.id,
          games_played: 0,
          games_won: 0,
          games_lost: 0,
          elo_rating: 400 // Valeur par défaut à 400 comme demandé
        });

      if (rankingError) {
        console.error('Erreur insertion user_ranking:', rankingError);
        // On ne fait pas échouer l'inscription pour ça, le trigger se chargera de créer l'entrée
      }

      toast.dismiss(loadingToast);

      // 5. Vérifier le statut de l'utilisateur et agir en conséquence
      if (authData.session) {
        // L'utilisateur est automatiquement connecté (email confirmé automatiquement)
        toast.success('Compte créé avec succès ! Redirection vers le dashboard...');
        // Redirection manuelle en plus de celle du hook useAuth
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else if (authData.user && !authData.user.email_confirmed_at) {
        // L'utilisateur doit confirmer son email
        toast.success('Compte créé ! Vérifiez votre email pour vous connecter.');
        setTimeout(() => {
          router.push('/auth/login?message=check-email');
        }, 2000);
      } else {
        // Cas de fallback - rediriger vers login
        toast.success('Compte créé ! Veuillez vous connecter.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 1500);
      }

    } catch (error: any) {
      toast.dismiss(loadingToast);
      
      // Gestion des erreurs spécifiques
      if (error.message?.includes('User already registered')) {
        toast.error('Un compte existe déjà avec cet email');
      } else if (error.message?.includes('Password should be at least')) {
        toast.error('Le mot de passe doit contenir au moins 6 caractères');
      } else if (error.message?.includes('Invalid email')) {
        toast.error('Adresse email invalide');
      } else if (error.message?.includes('duplicate key value violates unique constraint')) {
        if (error.message.includes('pseudo')) {
          toast.error('Ce nom d\'utilisateur est déjà utilisé');
        } else if (error.message.includes('email')) {
          toast.error('Un compte existe déjà avec cet email');
        } else {
          toast.error('Ces informations sont déjà utilisées');
        }
      } else {
        toast.error(error.message || 'Une erreur inattendue s\'est produite');
      }
      
      console.error('Erreur inscription:', error);
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
              Créer un compte
            </CardTitle>
            <CardDescription className="text-slate-400">
              Rejoignez la communauté ChessMaster
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-200">
                  Nom d'utilisateur
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Votre nom d'utilisateur"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    disabled={loading}
                    autoComplete="username"
                    maxLength={20}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  3-20 caractères, lettres, chiffres et underscores uniquement
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-200">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-slate-200">
                  Pays
                </Label>
                <CountrySelect
                  value={formData.country}
                  onChange={(country) => setFormData({ ...formData, country })}
                  disabled={loading}
                />
                <p className="text-xs text-slate-500">
                  Optionnel - Permet d'afficher votre drapeau dans les classements
                </p>
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
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Au moins 6 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-200">
                  Confirmer le mot de passe
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirmez votre mot de passe"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full chess-gradient hover:opacity-90 transition-all hover-lift py-6 text-lg font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  'Créer mon compte'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Déjà un compte ?{' '}
                <Link 
                  href="/auth/login" 
                  className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  Se connecter
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