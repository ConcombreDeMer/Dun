import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type FontSize = 'small' | 'medium' | 'large';

export interface FontSizes {
    [key: string]: number;
}

// Définir les tailles de font pour chaque niveau
export const fontSizeMap: { [key in FontSize]: FontSizes } = {
    small: {
        xs: 11,
        sm: 13,
        base: 14,
        lg: 16,
        xl: 18,
        '2xl': 20,
        '3xl': 24,
        '4xl': 32,
        '5xl': 40,
        '6xl': 48,
        '7xl': 56,
    },
    medium: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 22,
        '3xl': 26,
        '4xl': 34,
        '5xl': 42,
        '6xl': 50,
        '7xl': 58,
    },
    large: {
        xs: 13,
        sm: 15,
        base: 18,
        lg: 20,
        xl: 22,
        '2xl': 24,
        '3xl': 28,
        '4xl': 36,
        '5xl': 44,
        '6xl': 52,
        '7xl': 60,
    },
};

interface FontContextType {
    fontSize: FontSize;
    fontSizes: FontSizes;
    setFontSize: (size: FontSize) => void;
    isLoading: boolean;
}

export const FontContext = createContext<FontContextType | undefined>(undefined);

interface FontProviderProps {
    children: ReactNode;
}

export const FontProvider: React.FC<FontProviderProps> = ({ children }) => {
    const [fontSize, setFontSize] = useState<FontSize>('medium');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadFontSize();
    }, []);

    const loadFontSize = async () => {
        try {
            // Vérifier si l'utilisateur est connecté
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                // Charger la taille de font depuis Supabase
                const { data, error } = await supabase
                    .from('Profiles')
                    .select('display_font')
                    .eq('id', user.id)
                    .single();
                
                if (error) {
                    console.error('Erreur lors du chargement de la taille de font depuis Supabase:', error);
                }
                
                if (data && (data.display_font === 'small' || data.display_font === 'medium' || data.display_font === 'large')) {
                    setFontSize(data.display_font as FontSize);
                    setIsLoading(false);
                    return;
                }
            }
            
            // Sinon, charger depuis AsyncStorage
            const savedFontSize = await AsyncStorage.getItem('fontSize');
            if (savedFontSize === 'small' || savedFontSize === 'medium' || savedFontSize === 'large') {
                setFontSize(savedFontSize as FontSize);
            }
        } catch (error) {
            console.error('Erreur lors du chargement de la taille de font:', error);
            setFontSize('medium');
        } finally {
            setIsLoading(false);
        }
    };

    const saveFontSize = async (newFontSize: FontSize) => {
        try {
            // Toujours sauvegarder dans AsyncStorage
            await AsyncStorage.setItem('fontSize', newFontSize);
            setFontSize(newFontSize);
            
            // Sauvegarder dans Supabase si l'utilisateur est connecté
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                const { error } = await supabase
                    .from('Profiles')
                    .update({ display_font: newFontSize })
                    .eq('id', user.id);
                
                if (error) {
                    console.error('Erreur lors de la sauvegarde de la taille de font dans Supabase:', error);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde de la taille de font:', error);
        }
    };

    return (
        <FontContext.Provider
            value={{
                fontSize,
                fontSizes: fontSizeMap[fontSize],
                setFontSize: saveFontSize,
                isLoading,
            }}
        >
            {children}
        </FontContext.Provider>
    );
};

export const useFont = (): FontContextType => {
    const context = React.useContext(FontContext);
    if (!context) {
        throw new Error('useFont doit être utilisé dans un FontProvider');
    }
    return context;
};
