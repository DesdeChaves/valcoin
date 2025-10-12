import React from 'react';

// Versão 1: VC Simples e Limpo
const ValCoinIcon = ({ className, variant = 'simple' }) => {
  
  if (variant === 'simple') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 16"
        fill="currentColor"
        className={className}
      >
        {/* Letra V */}
        <path 
          d="M2 2 L8 14 L14 2" 
          fill="none"
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Letra C */}
        <path 
          d="M26 4 C22 4 20 6 20 8 C20 10 22 12 26 12" 
          fill="none"
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round"
        />
      </svg>
    );
  }
  
  if (variant === 'bold') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 36 18"
        fill="currentColor"
        className={className}
      >
        {/* V mais bold */}
        <path 
          d="M2 2 L9 16 L16 2" 
          fill="none"
          stroke="currentColor" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* C mais bold */}
        <path 
          d="M30 4 C25 4 22 6.5 22 9 C22 11.5 25 14 30 14" 
          fill="none"
          stroke="currentColor" 
          strokeWidth="3.5" 
          strokeLinecap="round"
        />
      </svg>
    );
  }
  
  if (variant === 'filled') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 34 18"
        fill="currentColor"
        className={className}
      >
        {/* V preenchido */}
        <path 
          d="M2 2 L9 16 L16 2 L12 2 L9 10 L6 2 Z" 
          fill="currentColor"
        />
        
        {/* C preenchido */}
        <path 
          d="M29 4 C24 4 21 6.5 21 9 C21 11.5 24 14 29 14 C30 14 31 13.8 32 13.4 L32 11.5 C31 12 30 12.2 29 12.2 C25.5 12.2 23.2 10.8 23.2 9 C23.2 7.2 25.5 5.8 29 5.8 C30 5.8 31 6 32 6.5 L32 4.6 C31 4.2 30 4 29 4 Z" 
          fill="currentColor"
        />
      </svg>
    );
  }
  
  if (variant === 'modern') {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 40 20"
        fill="currentColor"
        className={className}
      >
        {/* V moderno com efeito */}
        <defs>
          <linearGradient id="vcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        
        <path 
          d="M2 3 L10 17 L18 3 L15 3 L10 12 L5 3 Z" 
          fill="url(#vcGradient)"
        />
        
        <path 
          d="M33 5 C27 5 24 7.5 24 10 C24 12.5 27 15 33 15 C35 15 37 14.5 38 13.8 L37 11.8 C36 12.3 34.5 12.5 33 12.5 C29 12.5 26.5 11.2 26.5 10 C26.5 8.8 29 7.5 33 7.5 C34.5 7.5 36 7.7 37 8.2 L38 6.2 C37 5.5 35 5 33 5 Z" 
          fill="url(#vcGradient)"
        />
      </svg>
    );
  }
  
  // Versão padrão (simple)
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 16"
      fill="currentColor"
      className={className}
    >
      <path 
        d="M2 2 L8 14 L14 2" 
        fill="none"
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      <path 
        d="M26 4 C22 4 20 6 20 8 C20 10 22 12 26 12" 
        fill="none"
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ValCoinIcon;
