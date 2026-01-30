// src/components/shared/ConversionWheel.jsx - VERSÃO FINAL COM TODOS OS LABELS COLADOS

import React from 'react';

const VARIABLE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
];

const buildVariableColorMap = (wheelsConfigs) => {
  const variables = new Set();
  wheelsConfigs.forEach(config => {
    const parts = config.split('|').map(p => p.trim());
    if (parts.length >= 7) {
      variables.add(parts[1]); // topo
      variables.add(parts[3]); // esquerda
      variables.add(parts[5]); // direita
    }
  });
  const colorMap = {};
  Array.from(variables).forEach((variable, index) => {
    colorMap[variable] = VARIABLE_COLORS[index % VARIABLE_COLORS.length];
  });
  return colorMap;
};

const SingleWheel = ({ config, index = 0, showLabels = true, variableColorMap = {} }) => {
  if (!config) return null;
  const parts = config.split('|').map(p => p.trim());

  if (parts.length < 7) {
    return (
      <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
        ❌ Configuração inválida
      </div>
    );
  }

  const [
    wheelColor,
    topValue, topUnit,
    leftValue, leftUnit,
    rightValue, rightUnit,
    topLabel = '',
    rightLabel = ''
  ] = parts;

  const wheelColorMap = {
    pink: { primary: '#ec4899', light: '#fce7f3', border: '#f9a8d4' },
    blue: { primary: '#3b82f6', light: '#dbeafe', border: '#93c5fd' },
    green: { primary: '#10b981', light: '#d1fae5', border: '#6ee7b7' },
    orange: { primary: '#f97316', light: '#ffedd5', border: '#fdba74' },
    purple: { primary: '#a855f7', light: '#f3e8ff', border: '#d8b4fe' },
    red: { primary: '#ef4444', light: '#fee2e2', border: '#fca5a5' },
    yellow: { primary: '#eab308', light: '#fef9c3', border: '#fde047' },
    cyan: { primary: '#06b6d4', light: '#cffafe', border: '#67e8f9' },
    gray: { primary: '#6b7280', light: '#f3f4f6', border: '#d1d5db' }
  };
  const wheelColors = wheelColorMap[wheelColor.toLowerCase()] || wheelColorMap.gray;

  const topColor = variableColorMap[topValue] || wheelColors.primary;
  const leftColor = variableColorMap[leftValue] || wheelColors.primary;
  const rightColor = variableColorMap[rightValue] || wheelColors.primary;

  const isNumeric = (val) => !isNaN(parseFloat(val)) && isFinite(val);

  // AJUSTE DINÂMICO DE TAMANHO
  const maxLength = Math.max(topValue.length, leftValue.length, rightValue.length);
  const isLongText = maxLength > 6;
  const scaleFactor = isLongText ? 1.25 : 1;
  const baseFontLarge = isLongText ? 30 : 36;
  const baseFontMedium = isLongText ? 28 : 32;
  const svgWidth = isLongText ? 360 : 280;
  const svgHeight = isLongText ? 280 : 240;

  // Posições dinâmicas
  const ellipseRx = 130 * scaleFactor;
  const ellipseRy = 100 * scaleFactor;
  const lineLeft = 200 - ellipseRx + 10;
  const lineRight = 200 + ellipseRx - 10;
  const lineBottom = 150 + ellipseRy - 10;

  // POSIÇÕES RELATIVAS (no espaço do viewBox 0-300)
  const topLabelBottomPosition = 150 - ellipseRy - 5; // 5px antes do topo da roda
  const formulaTopPosition = 150 + ellipseRy + 5; // 5px após a base da roda

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-col items-center w-full">
        {/* Container RELATIVO para toda a estrutura */}
        <div className="relative flex items-center gap-3">
          {/* SVG + Labels posicionados relativamente */}
          <div className="relative flex-shrink-0">
            {/* LABEL SUPERIOR - Posicionado RELATIVAMENTE, colado ao topo da roda */}
            {showLabels && topLabel && (
              <div
                className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-lg text-xs font-semibold text-center whitespace-nowrap"
                style={{
                  backgroundColor: `${topColor}15`,
                  color: topColor,
                  border: `2px solid ${topColor}40`,
                  maxWidth: '320px',
                  bottom: `${svgHeight - ((topLabelBottomPosition / 300) * svgHeight)}px`
                }}
              >
                {topLabel}
              </div>
            )}

            {/* SVG da Roda */}
            <svg
              viewBox="0 0 400 300"
              style={{ 
                width: `${svgWidth}px`, 
                height: `${svgHeight}px`,
                display: 'block'
              }}
            >
              <ellipse cx="200" cy="150" rx={ellipseRx} ry={ellipseRy}
                fill="white" stroke={wheelColors.primary} strokeWidth="5" />
              <line x1={lineLeft} y1="150" x2={lineRight} y2="150" stroke={wheelColors.primary} strokeWidth="3" />
              <line x1="200" y1="150" x2="200" y2={lineBottom} stroke={wheelColors.primary} strokeWidth="3" />

              {/* TOPO */}
              <text x="200" y="115" textAnchor="middle" fontSize={isNumeric(topValue) ? baseFontLarge : baseFontMedium} fontWeight="bold" fill={topColor}>
                {topValue}
              </text>
              {topUnit && <text x="200" y="138" textAnchor="middle" fontSize="15" fill="#6b7280">{topUnit}</text>}

              {/* ESQUERDA */}
              <text x="135" y="198" textAnchor="middle" fontSize={isNumeric(leftValue) ? baseFontMedium : baseFontLarge} fontWeight="bold" fill={leftColor}>
                {leftValue}
              </text>
              {leftUnit && <text x="135" y="220" textAnchor="middle" fontSize="13" fill="#6b7280">{leftUnit}</text>}

              {/* DIREITA */}
              <text x="265" y="198" textAnchor="middle" fontSize={isNumeric(rightValue) ? baseFontMedium : baseFontLarge} fontWeight="bold" fill={rightColor}>
                {rightValue}
              </text>
              {rightUnit && <text x="265" y="220" textAnchor="middle" fontSize="13" fill="#6b7280">{rightUnit}</text>}
            </svg>

            {/* FÓRMULA - Posicionada RELATIVAMENTE, colada à base da roda */}
            <div 
              className="absolute left-1/2 -translate-x-1/2 text-center text-xs text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded whitespace-nowrap"
              style={{
                top: `${(formulaTopPosition / 300) * svgHeight}px`
              }}
            >
              {topValue} = {leftValue} × {rightValue}
            </div>
          </div>

          {/* Label direita - mantém-se normal */}
          {showLabels && rightLabel && (
            <div
              className="px-3 py-1 rounded-lg text-xs font-semibold text-center"
              style={{
                backgroundColor: `${rightColor}15`,
                color: rightColor,
                border: `2px solid ${rightColor}40`,
                maxWidth: '160px',
                lineHeight: '1.3'
              }}
            >
              {rightLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ConversionWheel = ({ config, revealed = false }) => {
  if (!config) return null;
  const wheels = config.split(';').map(w => w.trim()).filter(w => w.length > 0);
  if (wheels.length === 0) {
    return <div className="text-red-500 p-4 bg-red-50 rounded-lg text-center">❌ Configuração vazia</div>;
  }

  const variableColorMap = buildVariableColorMap(wheels);

  // Roda única
  if (wheels.length === 1) {
    return (
      <div className="flex justify-center items-center py-4">
        <SingleWheel config={wheels[0]} showLabels={true} variableColorMap={variableColorMap} />
      </div>
    );
  }

  // Múltiplas rodas – compacto
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="flex flex-col items-center gap-2">
        {wheels.map((wheel, index) => (
          <SingleWheel
            key={index}
            config={wheel}
            showLabels={true}
            variableColorMap={variableColorMap}
          />
        ))}
      </div>
    </div>
  );
};

export default ConversionWheel;
