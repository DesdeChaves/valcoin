import React, { useState, useEffect } from 'react';
import { scaleLinear } from 'd3-scale';

const TapButton = ({
    isAtive,
    momento,
    momentoID,
    validade,
    alunoID,
    contagem,
    incremento,
    tipinho = true,
    onRegisterTap,
    onNotAllowed,
    periodoInativacaoSegundos,
    tempoInativacaoRestante,
    cor,
    maxContagem,
}) => {
    const [valido, setValido] = useState(isAtive);
    const [tota, setTota] = useState(contagem);
    const [timeRemaining, setTimeRemaining] = useState(tempoInativacaoRestante || 0);

    // Define gradient scale for inactive buttons
    const gradientScale = scaleLinear()
        .domain([0, maxContagem])
        .range(['white', cor]);

    useEffect(() => {
        setValido(isAtive);
        setTimeRemaining(tempoInativacaoRestante || 0);

        if (!isAtive && tempoInativacaoRestante > 0) {
            const interval = setInterval(() => {
                setTimeRemaining(prevTime => {
                    if (prevTime <= 1) {
                        clearInterval(interval);
                        setValido(true);
                        return 0;
                    }
                    return prevTime - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [isAtive, tempoInativacaoRestante]);

    useEffect(() => {
        setTota(contagem);
    }, [contagem]);

    const tapActionTalento = (event) => {
        event.preventDefault();
        setTota(prevTota => prevTota + Number(incremento));
        setValido(false);
        onRegisterTap(alunoID, momentoID);
        
        // Re-enable button after inactivity period
        const timer = setTimeout(() => setValido(true), periodoInativacaoSegundos * 1000);
        return () => clearTimeout(timer);
    };

    const notAction = (event) => {
        event.preventDefault();
        onNotAllowed();
    };

    if (!tipinho) return null;

    const buttonBackgroundColor = valido ? cor : gradientScale(tota);
    const roundedTota = Math.round(tota);
    
    // Format time remaining
    const formatTime = (seconds) => {
        if (seconds < 0) seconds = 0;
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) { // less than 1 hour
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}m ${secs}s`;
        }
        if (seconds < 86400) { // less than 1 day
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${mins}m`;
        }
        if (seconds < 604800) { // less than 1 week
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            return `${days}d ${hours}h`;
        }
        const weeks = Math.floor(seconds / 604800);
        const days = Math.floor((seconds % 604800) / 86400);
        return `${weeks}w ${days}d`;
    };

    // Calculate progress percentage
    const progressPercentage = maxContagem > 0 ? Math.min((roundedTota / maxContagem) * 100, 100) : 0;
    const isMaxed = maxContagem > 0 && roundedTota >= maxContagem;

    // Determine text color based on background
    const getTextColor = () => {
        if (valido && cor) {
            const hex = cor.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 155 ? 'text-gray-900' : 'text-white';
        }
        return 'text-gray-700';
    };

    const textColorClass = getTextColor();

    return (
        <div className="inline-block m-2 relative">
            <button 
                type="button" 
                onClick={valido ? tapActionTalento : notAction} 
                className={`relative rounded-xl shadow-lg font-bold transition-all duration-300 overflow-hidden ${
                    valido 
                        ? 'hover:shadow-2xl hover:scale-105 active:scale-95 cursor-pointer' 
                        : 'cursor-not-allowed opacity-75'
                } ${
                    isMaxed ? 'ring-4 ring-red-400 ring-opacity-50' : ''
                }`}
                style={{ 
                    backgroundColor: buttonBackgroundColor,
                    width: '11rem',
                    height: '5rem',
                    border: valido ? '3px solid rgba(255,255,255,0.3)' : '2px solid rgba(0,0,0,0.1)',
                }}
                disabled={!valido}
            >
                {/* SEMÁFORO - Traffic Light Indicator */}
                <div className="absolute top-2 left-2">
                    {valido ? (
                        // Green light - Active
                        <div className="relative">
                            <div className="w-3 h-3 bg-green-500 rounded-full shadow-lg border-2 border-white" />
                            <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75" />
                        </div>
                    ) : (
                        // Red light - Inactive
                        <div className="relative">
                            <div className="w-3 h-3 bg-red-500 rounded-full shadow-lg border-2 border-white" />
                            <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-pulse opacity-75" />
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {maxContagem > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-black bg-opacity-10">
                        <div 
                            className="h-full bg-white bg-opacity-30 transition-all duration-500"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}

                {/* Counter Badge */}
                <div 
                    className="absolute -top-3 -right-3 bg-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg border-3 border-gray-100 font-bold text-gray-900"
                    style={{ fontSize: roundedTota > 99 ? '0.65rem' : '0.875rem' }}
                >
                    {roundedTota}
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full px-2">
                    {/* Title */}
                    <div className={`${textColorClass} text-base font-bold truncate w-full text-center mb-1`}>
                        {momento}
                    </div>

                    {/* Status */}
                    <div className="text-sm">
                        {valido ? (
                            <div className={`${textColorClass} font-bold flex items-center justify-center`}>
                                <span className="text-lg">+{incremento}</span>
                                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center text-gray-600 bg-white bg-opacity-90 rounded-full px-3 py-1">
                                <svg className="w-3 h-3 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-semibold tabular-nums text-red-600">{formatTime(timeRemaining)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Shimmer Effect when active */}
                {valido && (
                    <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
                        <div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"
                            style={{ 
                                animation: 'shimmer 3s infinite',
                                transform: 'translateX(-100%)'
                            }} 
                        />
                    </div>
                )}
            </button>

            {/* Max Count Indicator */}
            {isMaxed && (
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-20">
                    <span className="text-xs bg-red-500 text-white px-3 py-1 rounded-full font-bold shadow-lg animate-pulse">
                        MÁXIMO
                    </span>
                </div>
            )}

            <style jsx>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
};

export default TapButton;
