import React, { createContext, useState, useContext } from 'react';
import { COLORS } from '../constants/colors';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [businessTheme, setBusinessTheme] = useState(COLORS.PRIMARY);

    const updateTheme = (color) => {
        setBusinessTheme(color);
    };

    return (
        <ThemeContext.Provider value={{ businessTheme, updateTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
