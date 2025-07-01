'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Users, Lock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRoom } from '@/hooks/useRoom';
import { toast } from 'sonner';

export function RoomCreator() {
    const router = useRouter();
    const { createRoom } = useRoom();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        isPrivate: false,
        timeControl: '10+0',
        maxSpectators: 10,
    });

    const timeControls = [
        { value: '1+0', label: '1 min (Bullet)' },
        { value: '3+0', label: '3 min (Blitz)' },
        { value: '5+0', label: '5 min (Blitz)' },
        { value: '10+0', label: '10 min (Rapid)' },
        { value: '15+10', label: '15+10 (Rapid)' },
        { value: '30+0', label: '30 min (Classical)' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Veuillez entrer un nom pour la salle');
            return;
        }

        setLoading(true);

        try {
            const room = await createRoom({
                name: formData.name.trim(),
                isPrivate: formData.isPrivate,
                timeControl: formData.timeControl,
                maxSpectators: formData.maxSpectators,
            });

            toast.success('Salle créée avec succès !');
            router.push(`/room/${room.id}/lobby`);
        } catch (error: any) {
            console.error('Error creating room:', error);
            toast.error(error.message || 'Erreur lors de la création de la salle');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="glass-effect border-white/10 max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-white">
                    <Settings className="h-5 w-5 text-blue-400" />
                    <span>Configuration de la Salle</span>
                </CardTitle>
                <CardDescription className="text-slate-400">
                    Personnalisez les paramètres de votre partie d'échecs
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Room Name */}
                    <div className="space-y-2">
                        <Label htmlFor="roomName" className="text-sm font-medium text-slate-200">
                            Nom de la Salle
                        </Label>
                        <Input
                            id="roomName"
                            type="text"
                            placeholder="Ma partie d'échecs"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-200">
                            Contrôle du Temps
                        </Label>
                        <Select
                            value={formData.timeControl}
                            onValueChange={(value) => setFormData({ ...formData, timeControl: value })}
                        >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/20">
                                <Clock className="h-4 w-4 mr-2 text-slate-400" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                {timeControls.map((control) => (
                                    <SelectItem key={control.value} value={control.value} className="text-white focus:bg-slate-800">
                                        {control.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center space-x-3">
                            <Lock className="h-5 w-5 text-slate-400" />
                            <div>
                                <Label className="text-sm font-medium text-slate-200">
                                    Salle Privée
                                </Label>
                                <p className="text-xs text-slate-400">
                                    Seuls les joueurs avec le code peuvent rejoindre
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={formData.isPrivate}
                            onCheckedChange={(checked) => setFormData({ ...formData, isPrivate: checked })}
                            className="data-[state=checked]:bg-blue-600"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="maxSpectators" className="text-sm font-medium text-slate-200">
                            Nombre Maximum de Spectateurs
                        </Label>
                        <Select
                            value={formData.maxSpectators.toString()}
                            onValueChange={(value) => setFormData({ ...formData, maxSpectators: parseInt(value) })}
                        >
                            <SelectTrigger className="bg-white/5 border-white/20 text-white focus:border-blue-400 focus:ring-blue-400/20">
                                <Users className="h-4 w-4 mr-2 text-slate-400" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700">
                                <SelectItem value="0" className="text-white focus:bg-slate-800">Aucun spectateur</SelectItem>
                                <SelectItem value="5" className="text-white focus:bg-slate-800">5 spectateurs</SelectItem>
                                <SelectItem value="10" className="text-white focus:bg-slate-800">10 spectateurs</SelectItem>
                                <SelectItem value="20" className="text-white focus:bg-slate-800">20 spectateurs</SelectItem>
                                <SelectItem value="50" className="text-white focus:bg-slate-800">50 spectateurs</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-4">
                        <Button
                            type="submit"
                            className="w-full chess-gradient hover:opacity-90 transition-all hover-lift py-6 text-lg font-medium"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Création en cours...
                                </>
                            ) : (
                                <>
                                    <Users className="mr-2 h-5 w-5" />
                                    Créer la Salle
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}