async function checkTodaySubscriptions() {
    const today = new Date().toISOString().split('T')[0];
    const supabaseUrl = `https://nelscyaohnrnekscprxq.supabase.co/rest/v1/user_subscriptions?select=*&created_at=gte.${today}`;
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbHNjeWFvaG5ybmVrc2NwcnhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUyMDAzNCwiZXhwIjoyMDY5MDk2MDM0fQ.-PdyWp64BikrG-8leAPXEVNviJh21OPi7HOGdwejQ4U';

    try {
        const response = await fetch(supabaseUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        const data = await response.json();
        console.log('Subscriptions created today:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkTodaySubscriptions();
