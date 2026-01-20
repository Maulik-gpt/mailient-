import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get dimensions from query params or use defaults (16:9 ratio)
    const width = parseInt(searchParams.get('width') || '1280');
    const height = parseInt(searchParams.get('height') || '720');

    const svgContent = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#000000;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0a0a0a;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#a1a1aa;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="buttonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#a1a1aa;stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Background -->
        <rect width="100%" height="100%" fill="url(#bgGradient)"/>
        
        <!-- Subtle radial gradients -->
        <circle cx="30%" cy="20%" r="40%" fill="rgba(255,255,255,0.03)"/>
        <circle cx="70%" cy="80%" r="35%" fill="rgba(255,255,255,0.02)"/>
        
        <!-- Header Section -->
        <g transform="translate(60, 40)">
          <!-- Logo -->
          <rect x="0" y="0" width="48" height="48" rx="12" fill="url(#logoGradient)"/>
          <path d="M12 8L24 15L36 8V26C36 27.1046 35.1046 28 34 28H14C12.8954 28 12 27.1046 12 26V8Z" fill="#000000"/>
          <path d="M12 8L24 15L36 8M12 8C12 6.89543 12.8954 6 14 6H34C35.1046 6 36 6.89543 36 8" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          
          <!-- Title -->
          <text x="64" y="20" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">Mailient</text>
          <text x="64" y="38" font-family="Arial, sans-serif" font-size="14" font-weight="500" fill="#a1a1aa">AI-Powered Email Command Center</text>
          
          <!-- Live Badge -->
          <rect x="${width - 180}" y="8" width="80" height="32" rx="16" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
          <circle cx="${width - 165}" cy="24" r="4" fill="#10b981"/>
          <text x="${width - 145}" y="28" font-family="Arial, sans-serif" font-size="12" font-weight="500" fill="#ffffff" text-anchor="middle">LIVE</text>
        </g>
        
        <!-- Main Content -->
        <g transform="translate(60, 120)">
          <!-- Email Interface Mockup -->
          <rect x="0" y="0" width="${width - 120}" height="280" rx="16" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
          
          <!-- Stats Row -->
          <g transform="translate(24, 24)">
            <!-- Emails Processed -->
            <rect x="0" y="0" width="180" height="80" rx="12" fill="rgba(255,255,255,0.08)"/>
            <text x="90" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">1,247</text>
            <text x="90" y="55" font-family="Arial, sans-serif" font-size="12" fill="#a1a1aa" text-anchor="middle">Emails Processed</text>
            
            <!-- Revenue Found -->
            <rect x="200" y="0" width="180" height="80" rx="12" fill="rgba(255,255,255,0.08)"/>
            <text x="290" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#10b981" text-anchor="middle">$2.4M</text>
            <text x="290" y="55" font-family="Arial, sans-serif" font-size="12" fill="#a1a1aa" text-anchor="middle">Revenue Found</text>
            
            <!-- Time Saved -->
            <rect x="400" y="0" width="180" height="80" rx="12" fill="rgba(255,255,255,0.08)"/>
            <text x="490" y="35" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#3b82f6" text-anchor="middle">47h</text>
            <text x="490" y="55" font-family="Arial, sans-serif" font-size="12" fill="#a1a1aa" text-anchor="middle">Time Saved</text>
          </g>
          
          <!-- Email Preview -->
          <g transform="translate(24, 120)">
            <rect x="0" y="0" width="${width - 168}" height="120" rx="12" fill="rgba(0,0,0,0.3)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
            
            <!-- Avatar -->
            <circle cx="24" cy="24" r="16" fill="url(#logoGradient)"/>
            <text x="24" y="29" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">SC</text>
            
            <!-- Sender Info -->
            <text x="48" y="20" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#ffffff">Sarah Chen</text>
            <text x="48" y="35" font-family="Arial, sans-serif" font-size="12" fill="#a1a1aa">sarah@acme-corp.com</text>
            
            <!-- Amount Badge -->
            <rect x="${width - 280}" y="12" width="60" height="24" rx="6" fill="rgba(16,185,129,0.2)"/>
            <text x="${width - 250}" y="28" font-family="Arial, sans-serif" font-size="10" font-weight="600" fill="#10b981" text-anchor="middle">$50,000</text>
            
            <!-- Subject -->
            <text x="24" y="60" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#ffffff">Enterprise Contract - $50,000 Deal Ready</text>
            
            <!-- Preview Text -->
            <text x="24" y="80" font-family="Arial, sans-serif" font-size="12" fill="#a1a1aa">Hi! We are ready to move forward with the enterprise plan.</text>
            <text x="24" y="95" font-family="Arial, sans-serif" font-size="12" fill="#a1a1aa">The legal team has approved the contract...</text>
          </g>
        </g>
        
        <!-- AI Badge -->
        <g transform="translate(60, 440)">
          <rect x="0" y="0" width="200" height="48" rx="12" fill="rgba(59,130,246,0.2)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M2 17L12 22L22 17" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <path d="M2 12L12 17L22 12" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <text x="60" y="30" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#ffffff">AI-Powered Analysis</text>
        </g>
        
        <!-- Bottom CTA -->
        <g transform="translate(${width/2}, 520)">
          <text x="0" y="0" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#ffffff" text-anchor="middle">Never Miss Revenue Again</text>
          <text x="0" y="20" font-family="Arial, sans-serif" font-size="14" fill="#a1a1aa" text-anchor="middle">Transform your chaotic inbox into clear opportunities</text>
          <rect x="-80" y="30" width="160" height="40" rx="8" fill="url(#buttonGradient)"/>
          <text x="0" y="54" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#000000" text-anchor="middle">Get Started →</text>
        </g>
      </svg>
    `;

    return new Response(svgContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error generating screenshot:', error);
    return new NextResponse('Error generating screenshot', { status: 500 });
  }
}
