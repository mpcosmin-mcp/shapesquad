import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 60%, #4338ca 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#f1f5f9',
          fontWeight: 900,
          letterSpacing: '-0.06em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
