'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Globe } from 'lucide-react';

interface Country {
  code: string;
  name: string;
  name_fr: string;
}

interface CountrySelectProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CountrySelect({ value, onChange, disabled }: CountrySelectProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchCountries() {
      const { data, error } = await supabase
        .from('countries')
        .select('*')
        .order('name_fr');

      if (!error && data) {
        setCountries(data);
      }
      setLoading(false);
    }

    fetchCountries();
  }, [supabase]);

  if (loading) {
    return (
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <div className="pl-10 py-3 bg-white/5 border border-white/20 text-slate-400 rounded-md">
          Chargement des pays...
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 text-white rounded-md focus:border-blue-400 focus:ring-blue-400/20 focus:outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.5rem center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1.5em 1.5em'
        }}
      >
        <option value="" className="bg-slate-800 text-white">
          Sélectionnez un pays (optionnel)
        </option>
        {countries.map((country) => (
          <option key={country.code} value={country.code} className="bg-slate-800 text-white">
            {country.name_fr}
          </option>
        ))}
      </select>
    </div>
  );
}