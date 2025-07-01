'use client';

import { Crown, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserRanking } from '@/hooks/useUserRanking';
import Link from 'next/link';

export function Header() {
  const { user, profile, signOut, isAuthenticated } = useAuth(); // ✅ Ajouter user
  const { ranking } = useUserRanking(profile?.id || null);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
          <Crown className="h-8 w-8 text-blue-400" />
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ChessMaster
          </span>
        </Link>

        <nav className="hidden md:flex items-center space-x-6">
          {isAuthenticated && (
            <>
              <Link href="/dashboard" className="text-sm font-medium hover:text-blue-400 transition-colors">
                Dashboard
              </Link>
              <Link href="/create-room" className="text-sm font-medium hover:text-blue-400 transition-colors">
                Créer une Room
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? ( // ✅ Enlever "&& profile" pour afficher même sans profil
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/10">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {profile?.pseudo?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">
                      {profile?.pseudo || user?.email || 'Utilisateur'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {ranking?.elo_rating || 400} ELO
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700">
                <DropdownMenuItem className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{profile?.pseudo || user?.email || 'Utilisateur'}</span>
                    <span className="text-xs text-muted-foreground">
                      {ranking ? `${ranking.games_played} parties • ${ranking.games_won} victoires` : 'Chargement...'}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center space-x-2 cursor-pointer">
                    <User className="h-4 w-4" />
                    <span>Mon Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center space-x-2 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center space-x-2">
              <Link href="/auth/login">
                <Button variant="outline" className="border-white/20 hover:bg-white/10">
                  Se connecter
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="chess-gradient hover:opacity-90 transition-opacity">
                  S'inscrire
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}