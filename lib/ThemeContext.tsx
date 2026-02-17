import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { supabase } from './supabase';

export type Theme = 'light' | 'dark' | 'system';

export interface Colors {
    background: string;
    text: string;
    textSecondary: string;
    border: string;
    input: string;
    inputPlaceholder: string;
    card: string;
    task: string;
    taskDone: string;
    checkbox: string;
    checkboxDone: string;
    button: string;
    buttonText: string;
    actionButton: string;
    danger: string;
    dangerText: string;
    icon: string;
    donePrimary?: string;
    doneSecondary?: string;
    checkMark: string;
    textDone?: string;
}



export const lightColors: Colors = {
    background: '#F1F1F1',
    text: '#000000',
    textSecondary: '#999999',
    border: '#ebebeb',
    input: '#F1F1F1',
    inputPlaceholder: '#999999',
    card: '#ffffff',
    button: '#B3B3B3',
    buttonText: '#ffffffff',
    danger: '#d32f2f',
    dangerText: '#d32f2f',
    icon: '#000000',
    donePrimary: '#CFE7CB',
    doneSecondary: '#000000',
    task: '#FFFFFF',
    checkbox: '#DDDDDD',
    taskDone: '#424242',
    checkboxDone: '#616161',
    textDone: '#ffffff',
    checkMark: 'white',
    actionButton: 'black'
};

export const darkColors: Colors = {
    background: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#333333',
    input: '#2a2a2a',
    inputPlaceholder: '#666666',
    card: '#2a2a2a',
    button: '#343434ff',
    buttonText: '#abababff', // to use for darkmode icon aswell
    danger: '#ff5252',
    dangerText: '#ff5252',
    icon: '#ffffff',
    donePrimary: '#4d714fff',
    doneSecondary: '#73a175ff',
    task: '#3C3C3C',
    checkbox: '#4b4b4bff',
    taskDone: '#242424',
    checkboxDone: '#ffff',
    textDone: '#c0c0c0ff',
    checkMark: '#333533ff',
    actionButton: '#343434ff',
};
interface ThemeContextType {
    theme: Theme;
    actualTheme: 'light' | 'dark';
    colors: Colors;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemTheme = useColorScheme();
    const [theme, setTheme] = useState<Theme>('light');
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();
    const isOnboarding = pathname?.includes('/onboarding') ?? false;

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            // Vérifier si l'utilisateur est connecté
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                // Charger le thème depuis Supabase
                const { data, error } = await supabase
                    .from('Profiles')
                    .select('display_theme')
                    .eq('id', user.id)
                    .single();
                
                if (error) {
                    console.error('Erreur lors du chargement du thème depuis Supabase:', error);
                }
                
                if (data && (data.display_theme === 'light' || data.display_theme === 'dark' || data.display_theme === 'system')) {
                    setTheme(data.display_theme as Theme);
                    return;
                }
            }
            
            // Sinon, charger depuis AsyncStorage
            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
                setTheme(savedTheme as Theme);
            } else {
                // Utiliser le thème système par défaut
                setTheme(systemTheme === 'dark' ? 'dark' : 'light');
            }
        } catch (error) {
            console.error('Erreur lors du chargement du thème:', error);
            setTheme('light');
        } finally {
            setIsLoading(false);
        }
    };

    const saveTheme = async (newTheme: Theme) => {
        try {
            // Toujours sauvegarder dans AsyncStorage
            await AsyncStorage.setItem('theme', newTheme);
            setTheme(newTheme);
            
            // Sauvegarder dans Supabase si l'utilisateur est connecté
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                const { error } = await supabase
                    .from('Profiles')
                    .update({ display_theme: newTheme })
                    .eq('id', user.id);
                
                if (error) {
                    console.error('Erreur lors de la sauvegarde du thème dans Supabase:', error);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du thème:', error);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        saveTheme(newTheme);
    };

    const getActualTheme = (t: Theme): 'light' | 'dark' => {
        if (t === 'system') {
            return systemTheme === 'dark' ? 'dark' : 'light';
        }
        return t;
    };

    const actualTheme = getActualTheme(theme);
    const colors = isOnboarding ? lightColors : (actualTheme === 'light' ? lightColors : darkColors);

    return (
        <ThemeContext.Provider
            value={{
                theme,
                actualTheme,
                colors,
                toggleTheme,
                setTheme: saveTheme,
                isLoading,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = React.useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme doit être utilisé dans un ThemeProvider');
    }
    return context;
};
