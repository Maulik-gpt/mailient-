import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
    try {
        // Retrieve params - Must be awaited in latest Next.js versions
        const { id } = await params;
        
        if (!id) {
            return redirect('/');
        }
        
        // Set referral cookie for 30 days
        // Note: cookies() call should be awaited if it's a promise in this env
        const cookieStore = await cookies();
        
        cookieStore.set('mailient_referral', id, { 
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            httpOnly: false // Accessible by auth logic if needed
        });
        
    } catch (error) {
        console.error('Error in referral redirect:', error);
    }
    
    // Final redirect
    return redirect('/');
}
