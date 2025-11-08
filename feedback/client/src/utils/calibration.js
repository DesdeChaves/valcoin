export function calculateCalibratedScore(model, params, rawCount) {
    switch (model) {
        case 'linear':
            if (params && Array.isArray(params.points) && params.points.length >= 2) {
                params.points.sort((a, b) => a.raw - b.raw);

                for (let i = 0; i < params.points.length - 1; i++) {
                    const p1 = params.points[i];
                    const p2 = params.points[i + 1];

                    if (rawCount >= p1.raw && rawCount <= p2.raw) {
                        return p1.calibrated + (rawCount - p1.raw) * (p2.calibrated - p1.calibrated) / (p2.raw - p1.raw);
                    }
                }
                if (rawCount < params.points[0].raw) return params.points[0].calibrated;
                if (rawCount > params.points[params.points.length - 1].raw) return params.points[params.points.length - 1].calibrated;
            }
            return rawCount; // Fallback
        case 'exponencial':
            if (params.a !== undefined && params.b !== undefined) {
                return params.a * Math.exp(params.b * rawCount);
            }
            return rawCount;
        case 'logistico':
            if (params.L !== undefined && params.k !== undefined && params.x0 !== undefined) {
                return params.L / (1 + Math.exp(-params.k * (rawCount - params.x0)));
            }
            return rawCount;
        case 'nenhum':
        default:
            return rawCount;
    }
}
