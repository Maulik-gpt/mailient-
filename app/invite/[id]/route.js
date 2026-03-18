import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export async function GET(request, { params }) {
    const { id } = params;
    
    // Set referral cookie for 30 days
    const cookieStore = cookies();
    cookieStore.set('mailient_referral', id, { 
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    
    // Redirect to home/signup to start the conversion
    return redirect('/');
}
