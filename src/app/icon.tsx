import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
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
          fontSize: 212,
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
