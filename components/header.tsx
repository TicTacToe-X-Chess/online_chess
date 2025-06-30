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
import Link from 'next/link';

export function Header() {
  const { profile, signOut, isAuthenticated } = useAuth();

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
          {isAuthenticated && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/10">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white">
                      {profile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium">{profile.username}</span>
                    <Badge variant="secondary" className="text-xs">
                      {profile.rating} ELO
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-700">
                <DropdownMenuItem className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{profile.username}</span>
                    <span className="text-xs text-muted-foreground">
                      {profile.games_played} parties • {profile.games_won} victoires
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 focus:text-red-400">
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button className="chess-gradient hover:opacity-90 transition-opacity">
                Se connecter
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}