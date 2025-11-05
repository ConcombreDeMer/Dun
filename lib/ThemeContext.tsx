import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

export type Theme = 'light' | 'dark';

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
}



export const lightColors: Colors = {
    background: '#ffffff',
    text: '#000000',
    textSecondary: '#999999',
    border: '#cccccc',
    input: '#ebebebff',
    inputPlaceholder: '#999999',
    card: '#f5f5f5',
    button: '#B3B3B3',
    buttonText: '#ffffff',
    danger: '#d32f2f',
    dangerText: '#d32f2f',
    icon: '#000000',
    donePrimary: '#CFE7CB',
    doneSecondary: '#9DBD99',
    task: '#EFEFEF',
    checkbox: '#D9D9D9',
    taskDone: '#CFE7CB',
    checkboxDone: '#9DBD99',
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
    buttonText: '#abababff',
    danger: '#ff5252',
    dangerText: '#ff5252',
    icon: '#ffffff',
    donePrimary: '#4d714fff',
    doneSecondary: '#73a175ff',
    task: '#2b2a2aff',
    checkbox: '#4b4b4bff',
    taskDone: '#475c48ff',
    checkboxDone: '#5f7760ff',
    checkMark: '#333533ff',
    actionButton: '#343434ff',
};
interface ThemeContextType {
    theme: Theme;
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

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('theme');
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setTheme(savedTheme);
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
            await AsyncStorage.setItem('theme', newTheme);
            setTheme(newTheme);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du thème:', error);
        }
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        saveTheme(newTheme);
    };

    const colors = theme === 'light' ? lightColors : darkColors;

    return (
        <ThemeContext.Provider
            value={{
                theme,
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
