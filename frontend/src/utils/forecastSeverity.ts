export const FORECAST_COLORS = { normal: '#38bfff', warning: '#ffb238', critical: '#ff5a65' };

export function forecastColor(percent: number, warning: number, critical: number): string {
  return percent >= critical
    ? FORECAST_COLORS.critical
    : percent >= warning
      ? FORECAST_COLORS.warning
      : FORECAST_COLORS.normal;
}

// SVG coordinates match the chart's percentage scale (100% at y=14, 0% at y=118).
export function forecastColorStops(warning: number, critical: number) {
  const criticalY = 118 - critical * 1.04;
  const warningY = 118 - warning * 1.04;
  return [
    { offset: 0, color: FORECAST_COLORS.critical },
    { offset: criticalY / 132, color: FORECAST_COLORS.critical },
    { offset: criticalY / 132, color: FORECAST_COLORS.warning },
    { offset: warningY / 132, color: FORECAST_COLORS.warning },
    { offset: warningY / 132, color: FORECAST_COLORS.normal },
    { offset: 1, color: FORECAST_COLORS.normal },
  ];
}
