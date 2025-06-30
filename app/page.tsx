'use client';

import { Crown, Users, Shield, Zap, Trophy, Play, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Header } from '@/components/header';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function HomePage() {
  const { user } = useAuth();

  const features = [
    {
      icon: Users,
      title: 'Multijoueur Temps Réel',
      description: 'Affrontez des joueurs du monde entier en temps réel avec une synchronisation parfaite.',
    },
    {
      icon: Shield,
      title: 'Rooms Privées',
      description: 'Créez des salles privées avec code d\'accès pour jouer entre amis.',
    },
    {
      icon: Zap,
      title: 'Mode Spectateur',
      description: 'Regardez les parties en cours et apprenez des meilleurs joueurs.',
    },
    {
      icon: Trophy,
      title: 'Système de Classement',
      description: 'Grimpez dans le classement ELO et devenez un maître des échecs.',
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 blur-3xl" />
        <div className="relative container mx-auto max-w-4xl">
          <Badge className="mb-6 chess-gradient text-white border-0">
            🚀 Nouvelle Plateforme d'Échecs
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
            ChessMaster
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            La plateforme d'échecs multijoueur nouvelle génération. 
            Créez des rooms, défiez vos amis et progressez dans le classement mondial.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {user ? (
              // Utilisateur connecté
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="chess-gradient hover:opacity-90 transition-all hover-lift text-lg px-8 py-6">
                    <Trophy className="mr-2 h-5 w-5" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button size="lg" variant="outline" className="border-green-400/50 hover:bg-green-400/10 text-green-400 text-lg px-8 py-6">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Test Chat
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10 text-lg px-8 py-6">
                    <Crown className="mr-2 h-5 w-5" />
                    Classement
                  </Button>
                </Link>
              </>
            ) : (
              // Utilisateur non connecté
              <>
                <Link href="/auth/register">
                  <Button size="lg" className="chess-gradient hover:opacity-90 transition-all hover-lift text-lg px-8 py-6">
                    <Play className="mr-2 h-5 w-5" />
                    Commencer à Jouer
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button size="lg" variant="outline" className="border-white/20 hover:bg-white/10 text-lg px-8 py-6">
                    <Crown className="mr-2 h-5 w-5" />
                    Voir le Classement
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section avec le Chat en avant */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Fonctionnalités Avancées
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Une expérience d'échecs complète avec toutes les fonctionnalités modernes
            </p>
          </div>

          {/* Section spéciale Chat en test - visible seulement pour les utilisateurs connectés */}
          {user && (
            <div className="mb-12">
              <Card className="glass-effect border-green-400/30 hover-lift group bg-gradient-to-r from-green-600/10 to-blue-600/10">
                <CardContent className="p-8 text-center">
                  <div className="mb-4">
                    <Badge className="bg-green-500/20 text-green-400 border-green-400/30 mb-4">
                      🔥 En Test
                    </Badge>
                  </div>
                  <MessageCircle className="h-16 w-16 text-green-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold mb-4 text-white">
                    Chat Temps Réel
                  </h3>
                  <p className="text-slate-300 text-lg mb-6 max-w-2xl mx-auto">
                    Testez notre nouveau système de chat en temps réel ! 
                    Communicquez avec les joueurs et spectateurs pendant les parties.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    <Link href="/chat">
                      <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white text-lg px-8 py-4">
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Tester le Chat
                      </Button>
                    </Link>
                    <div className="text-sm text-slate-400">
                      • Messages en temps réel • Joueurs + Spectateurs • Interface moderne
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Grille des fonctionnalités existantes */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="glass-effect hover-lift border-white/10 group">
                <CardContent className="p-6 text-center">
                  <div className="mb-4 inline-flex p-3 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 group-hover:from-blue-600/30 group-hover:to-purple-600/30 transition-all">
                    <feature.icon className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-black/20">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-12 text-white">
            Rejoignez la Communauté
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-effect p-8 rounded-xl border-white/10">
              <div className="text-4xl font-bold text-blue-400 mb-2">1,000+</div>
              <div className="text-slate-300">Joueurs Actifs</div>
            </div>
            <div className="glass-effect p-8 rounded-xl border-white/10">
              <div className="text-4xl font-bold text-purple-400 mb-2">10,000+</div>
              <div className="text-slate-300">Parties Jouées</div>
            </div>
            <div className="glass-effect p-8 rounded-xl border-white/10">
              <div className="text-4xl font-bold text-indigo-400 mb-2">24/7</div>
              <div className="text-slate-300">Disponibilité</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="glass-effect p-12 rounded-2xl border-white/10">
            <Crown className="h-16 w-16 text-blue-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4 text-white">
              Prêt à Devenir un Maître ?
            </h2>
            <p className="text-slate-300 text-lg mb-8 max-w-2xl mx-auto">
              Rejoignez ChessMaster dès maintenant et commencez votre ascension vers le sommet du classement mondial.
            </p>
            <Link href="/auth/register">
              <Button size="lg" className="chess-gradient hover:opacity-90 transition-all hover-lift text-lg px-12 py-6">
                <Play className="mr-2 h-5 w-5" />
                Commencer Maintenant
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 bg-black/20">
        <div className="container mx-auto max-w-6xl text-center text-slate-400">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Crown className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-semibold text-white">ChessMaster</span>
          </div>
          <p className="text-sm">
            © 2024 ChessMaster. Plateforme d'échecs nouvelle génération.
          </p>
        </div>
      </footer>
    </div>
  );
}