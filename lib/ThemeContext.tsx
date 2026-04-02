import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import React, { createContext, ReactNode, useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { supabase } from './supabase';

export type Theme = 'light' | 'dark' | 'system';
export type ColorTheme = 'neutral' | 'sage' | 'ocean' | 'sunset' | 'sand';

export interface ColorThemeOption {
    id: ColorTheme;
    label: string;
    description: string;
    preview: string[];
    light: Partial<Colors>;
    dark: Partial<Colors>;
}

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
    background: '#EFEFEF',
    text: '#000000',
    textSecondary: '#999999',
    border: '#ececec',
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

export const colorThemeOptions: ColorThemeOption[] = [
    {
        id: 'neutral',
        label: 'Neutre',
        description: 'Le thème d’origine, sobre et équilibré.',
        preview: ['#EFEFEF', '#FFFFFF', '#B3B3B3'],
        light: {},
        dark: {},
    },
    {
        id: 'sage',
        label: 'Sauge',
        description: 'Vert doux, calme et organique.',
        preview: ['#E8F0E8', '#F7FBF6', '#7B9B74'],
        light: {
            background: '#E8F0E8',
            card: '#F7FBF6',
            border: '#D3E0D0',
            input: '#F1F7EF',
            button: '#7B9B74',
            buttonText: '#FFFFFF',
            actionButton: '#6A8964',
            task: '#FCFEFB',
            checkbox: '#C5D8BE',
            donePrimary: '#BFDAB6',
            doneSecondary: '#335437',
            taskDone: '#4D644C',
            checkboxDone: '#6C8B69',
            textDone: '#F3F8F2',
            checkMark: '#2F4732',
        },
        dark: {
            background: '#1D2621',
            card: '#263129',
            border: '#314036',
            input: '#2A362D',
            button: '#7FA87A',
            buttonText: '#102012',
            actionButton: '#6A9164',
            task: '#304033',
            checkbox: '#3E5243',
            donePrimary: '#577954',
            doneSecondary: '#9FC69A',
            taskDone: '#1C251F',
            checkboxDone: '#A8CEA1',
            textDone: '#DBEAD8',
            checkMark: '#203124',
        },
    },
    {
        id: 'ocean',
        label: 'Océan',
        description: 'Bleu profond, plus net et contrasté.',
        preview: ['#E7F1F8', '#F8FBFE', '#4E83A8'],
        light: {
            background: '#E7F1F8',
            card: '#F8FBFE',
            border: '#D0DFEA',
            input: '#F1F7FB',
            button: '#4E83A8',
            buttonText: '#FFFFFF',
            actionButton: '#356C92',
            task: '#FAFCFE',
            checkbox: '#C4D9E7',
            donePrimary: '#C9DCEC',
            doneSecondary: '#214764',
            taskDone: '#365166',
            checkboxDone: '#6D93AF',
            textDone: '#EDF5FB',
            checkMark: '#F6FBFF',
        },
        dark: {
            background: '#18232D',
            card: '#20303B',
            border: '#2C3E4C',
            input: '#243541',
            button: '#73A9CD',
            buttonText: '#0D1B25',
            actionButton: '#5E97BD',
            task: '#293A46',
            checkbox: '#3A5160',
            donePrimary: '#426983',
            doneSecondary: '#A7D0EB',
            taskDone: '#1B2730',
            checkboxDone: '#A0C7DF',
            textDone: '#DDECF5',
            checkMark: '#12212B',
        },
    },
    {
        id: 'sunset',
        label: 'Sunset',
        description: 'Teintes chaudes, plus vibrantes.',
        preview: ['#F7E9EE', '#FEF8FA', '#C97A6B'],
        light: {
            background: '#F7E9EE',
            card: '#FEF8FA',
            border: '#EACFD5',
            input: '#FBF1F3',
            button: '#C97A6B',
            buttonText: '#FFFFFF',
            actionButton: '#B66355',
            task: '#FFFDFD',
            checkbox: '#E7C4BD',
            donePrimary: '#E7C2BA',
            doneSecondary: '#6E352B',
            taskDone: '#6E453F',
            checkboxDone: '#CC8C7D',
            textDone: '#FFF4F1',
            checkMark: '#FFF4F1',
        },
        dark: {
            background: '#2A1D24',
            card: '#35252D',
            border: '#4A333D',
            input: '#402B35',
            button: '#D48C7E',
            buttonText: '#2B1310',
            actionButton: '#C87767',
            task: '#443039',
            checkbox: '#5A414D',
            donePrimary: '#855247',
            doneSecondary: '#F0B4A6',
            taskDone: '#24181E',
            checkboxDone: '#E9AE9F',
            textDone: '#F9E4DE',
            checkMark: '#2C1A1A',
        },
    },
    {
        id: 'sand',
        label: 'Sable',
        description: 'Beige chaleureux, plus feutré.',
        preview: ['#F4ECDD', '#FFFDF7', '#AF9371'],
        light: {
            background: '#F4ECDD',
            card: '#FFFDF7',
            border: '#E5D8C4',
            input: '#FAF3E7',
            button: '#AF9371',
            buttonText: '#FFFFFF',
            actionButton: '#9B7F5E',
            task: '#FFFCF6',
            checkbox: '#DFCDB2',
            donePrimary: '#E4D1AA',
            doneSecondary: '#5A4730',
            taskDone: '#5C5144',
            checkboxDone: '#B79F79',
            textDone: '#FFF8EA',
            checkMark: '#FFF8EA',
        },
        dark: {
            background: '#2B241B',
            card: '#362D23',
            border: '#4B3F32',
            input: '#403428',
            button: '#C6AA84',
            buttonText: '#241A10',
            actionButton: '#B8966C',
            task: '#483A2C',
            checkbox: '#61503D',
            donePrimary: '#866B49',
            doneSecondary: '#E2C79E',
            taskDone: '#241D16',
            checkboxDone: '#DAB989',
            textDone: '#F3E6D0',
            checkMark: '#2A2117',
        },
    },
];

interface ThemeContextType {
    theme: Theme;
    colorTheme: ColorTheme;
    actualTheme: 'light' | 'dark';
    colors: Colors;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
    setColorTheme: (colorTheme: ColorTheme) => void;
    isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const systemTheme = useColorScheme();
    const [theme, setTheme] = useState<Theme>('system');
    const [colorTheme, setColorThemeState] = useState<ColorTheme>('neutral');
    const [isLoading, setIsLoading] = useState(true);
    const pathname = usePathname();
    const isOnboarding = pathname?.includes('/onboarding') ?? false;

    const loadTheme = useCallback(async () => {
        try {
            let loadedTheme: Theme | null = null;

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
                    loadedTheme = data.display_theme as Theme;
                }
            }
            
            if (!loadedTheme) {
                // Sinon, charger depuis AsyncStorage
                const savedTheme = await AsyncStorage.getItem('theme');
                if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
                    loadedTheme = savedTheme as Theme;
                } else {
                    // Utiliser le thème système par défaut
                    loadedTheme = systemTheme === 'dark' ? 'dark' : 'light';
                }
            }

            const savedColorTheme = await AsyncStorage.getItem('colorTheme');
            if (savedColorTheme && colorThemeOptions.some((option) => option.id === savedColorTheme)) {
                setColorThemeState(savedColorTheme as ColorTheme);
            }

            setTheme(loadedTheme);
        } catch (error) {
            console.error('Erreur lors du chargement du thème:', error);
            setTheme('light');
            setColorThemeState('neutral');
        } finally {
            setIsLoading(false);
        }
    }, [systemTheme]);

    useEffect(() => {
        loadTheme();
    }, [loadTheme]);

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

    const saveColorTheme = async (newColorTheme: ColorTheme) => {
        try {
            await AsyncStorage.setItem('colorTheme', newColorTheme);
            setColorThemeState(newColorTheme);
        } catch (error) {
            console.error('Erreur lors de la sauvegarde du coloris:', error);
        }
    };

    const getActualTheme = (t: Theme): 'light' | 'dark' => {
        if (t === 'system') {
            return systemTheme === 'dark' ? 'dark' : 'light';
        }
        return t;
    };

    const actualTheme = getActualTheme(theme);
    const activeColorTheme = colorThemeOptions.find((option) => option.id === colorTheme) ?? colorThemeOptions[0];
    const themeColors = actualTheme === 'light' ? lightColors : darkColors;
    const themeOverrides = actualTheme === 'light' ? activeColorTheme.light : activeColorTheme.dark;
    const colors = isOnboarding
        ? lightColors
        : {
            ...themeColors,
            ...themeOverrides,
        };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                colorTheme,
                actualTheme,
                colors,
                toggleTheme,
                setTheme: saveTheme,
                setColorTheme: saveColorTheme,
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
