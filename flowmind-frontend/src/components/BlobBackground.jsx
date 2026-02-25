export default function BlobBackground() {
    return (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            <style>{`
        @keyframes blobDrift1 {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(60px,80px) scale(1.1); }
        }
        @keyframes blobDrift2 {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(-50px,-60px) scale(1.15); }
        }
        @keyframes blobDrift3 {
          0% { transform: translate(0,0) scale(1); }
          100% { transform: translate(50px,-70px) scale(0.9); }
        }
      `}</style>
            <div style={{
                position: 'absolute', width: 500, height: 500, borderRadius: '50%',
                background: '#7c6aff', filter: 'blur(80px)', opacity: 0.12,
                top: -150, left: -150, animation: 'blobDrift1 10s ease-in-out infinite alternate'
            }} />
            <div style={{
                position: 'absolute', width: 400, height: 400, borderRadius: '50%',
                background: '#ff6b6b', filter: 'blur(80px)', opacity: 0.12,
                bottom: -100, right: -100, animation: 'blobDrift2 13s ease-in-out infinite alternate'
            }} />
            <div style={{
                position: 'absolute', width: 300, height: 300, borderRadius: '50%',
                background: '#43e97b', filter: 'blur(80px)', opacity: 0.10,
                top: '40%', left: '45%', animation: 'blobDrift3 15s ease-in-out infinite alternate'
            }} />
        </div>
    )
}
