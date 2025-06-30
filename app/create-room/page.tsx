'use client';

import { ArrowLeft } from 'lucide-react';
import { Header } from '@/components/header';
import Link from 'next/link';
import {RoomCreator} from "@/app/room/RoomCreator";

export default function CreateRoomPage() {
  return (
      <div className="min-h-screen">
        <Header />

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6">
            <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">
              Créer une Nouvelle Salle
            </h1>
            <p className="text-slate-400">
              Configurez votre partie d'échecs et invitez d'autres joueurs
            </p>
          </div>

          <RoomCreator />

          <div className="mt-6 p-6 rounded-lg bg-white/5 border border-white/10">
            <h3 className="font-semibold text-white mb-3">Informations</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• Une fois créée, votre salle apparaîtra dans le lobby en attente de joueurs</li>
              <li>• Les salles privées génèrent un code d'accès que vous pourrez partager</li>
              <li>• La partie commencera automatiquement dès qu'un second joueur rejoindra</li>
              <li>• Les spectateurs peuvent regarder la partie en temps réel</li>
              <li>• Vous pouvez gérer les participants depuis le lobby de la salle</li>
            </ul>
          </div>
        </div>
      </div>
  );
}