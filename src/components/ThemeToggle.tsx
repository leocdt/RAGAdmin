import React, { useEffect, useState } from 'react';
//import '../css/ThemeToggle.css';


interface ThemeToggleProps {
    className?: string;
  }
  
  const ThemeToggle: React.FC<ThemeToggleProps> = ({ className }) => {
    const [isDark, setIsDark] = useState(false);
  
    useEffect(() => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        setIsDark(true);
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    }, []);
  
    const toggleTheme = () => {
      setIsDark(!isDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
      localStorage.setItem('theme', isDark ? 'light' : 'dark');
    };
  
    return (
      <input
        type="checkbox"
        className={`theme-checkbox ${className || ''}`}
        checked={isDark}
        onChange={toggleTheme}
      />
    );
  };
  
  export default ThemeToggle;