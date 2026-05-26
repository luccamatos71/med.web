import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B4F4B',
          color: '#F9F5F0',
          borderRadius: 32,
          fontSize: 74,
          fontFamily: 'serif',
          fontWeight: 500,
          letterSpacing: 0,
        }}
      >
        .m
      </div>
    ),
    size
  )
}
