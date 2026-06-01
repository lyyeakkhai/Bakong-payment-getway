import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface QRCodeDisplayProps {
  qrString: string;
  merchantName?: string;
  size?: number;
}

export function QRCodeDisplay({ qrString, merchantName = "TaxiTrio", size = 256 }: QRCodeDisplayProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const downloadQR = () => {
    // A more advanced download that captures the whole card would require html2canvas,
    // but for now we'll just download the QR code SVG itself as requested earlier.
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size;
      canvas.height = size;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `${merchantName.replace(/\s+/g, '_')}_KHQR.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      
      {/* ABA Style Card Container */}
      <div style={{ 
        width: '100%', 
        background: '#f8f9fa', 
        borderRadius: '16px', 
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        border: '1px solid #eaeaea',
        position: 'relative'
      }}>
        
        {/* Red KHQR Header Banner */}
        <div style={{
          background: '#d32f2f', // ABA Red
          color: 'white',
          padding: '1.25rem',
          textAlign: 'center',
          position: 'relative',
          clipPath: 'polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%)' // Slight cut corner effect
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '2px', fontWeight: 800 }}>KHQR</h2>
        </div>

        {/* Merchant Name Section */}
        <div style={{
          padding: '1.25rem 1.5rem 1rem',
          textAlign: 'center',
          borderBottom: '2px dashed #ddd',
          margin: '0 1rem'
        }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {merchantName}
          </h3>
        </div>

        {/* QR Code Section */}
        <div style={{ 
          background: 'white', 
          padding: '2rem', 
          display: 'flex', 
          justifyContent: 'center',
          margin: '1.5rem',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)'
        }}>
          <QRCodeSVG 
            value={qrString} 
            size={size} 
            ref={svgRef}
            level="M"
            includeMargin={false}
            imageSettings={{
              // Using a generic red center icon (placeholder for KHQR logo)
              src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='45' fill='%23d32f2f' stroke='white' stroke-width='5'/><path d='M30,50 L45,65 L70,35' stroke='white' stroke-width='8' fill='none' stroke-linecap='round'/></svg>",
              x: undefined,
              y: undefined,
              height: 48,
              width: 48,
              excavate: true,
            }}
          />
        </div>

        {/* Account Details Footer */}
        <div style={{
          padding: '0 2rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#333', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px' }}>៛</div>
              KHR account:
            </span>
            <span>289 4425</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ background: '#333', color: 'white', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px' }}>$</div>
              USD account:
            </span>
            <span>289 4425</span>
          </div>
        </div>

      </div>

      <button 
        onClick={downloadQR}
        style={{ 
          width: '100%',
          padding: '1rem', 
          background: '#004374', // ABA Blue
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: 'pointer', 
          fontWeight: 'bold',
          fontSize: '1.1rem',
          boxShadow: '0 4px 6px rgba(0, 67, 116, 0.2)',
          transition: 'transform 0.1s'
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        Download QR Image
      </button>
    </div>
  );
}
