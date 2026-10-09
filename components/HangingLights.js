// Decorative string of hanging lights (same look as the PDF header).
export default function HangingLights({ className = '' }) {
  const COUNT = 22;
  const swag = (x) => 6.5 - 3.2 * Math.sin((Math.PI * x) / 210);
  const pts = Array.from({ length: 43 }, (_, i) => `${i * 5},${swag(i * 5).toFixed(2)}`).join(' ');
  return (
    <svg viewBox="0 0 210 21" className={className} aria-hidden="true" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#1F3A3D" strokeWidth="0.25" />
      {Array.from({ length: COUNT }, (_, i) => {
        const x = 1.5 + i * (207 / (COUNT - 1));
        const bulbY = 11 + ((i * 7) % 4) * 1.6;
        const fill = i % 2 ? '#1F3A3D' : '#A9852D';
        return (
          <g key={i}>
            <line x1={x} y1={swag(x)} x2={x} y2={bulbY} stroke="#1F3A3D" strokeWidth="0.2" />
            <circle cx={x} cy={bulbY + 1.4} r="1.4" fill={fill} />
            <circle cx={x} cy={bulbY + 1.4} r="0.45" fill="#FDF7EE" />
          </g>
        );
      })}
    </svg>
  );
}
