async function checkLatestSubscriptions() {
    const supabaseUrl = 'https://nelscyaohnrnekscprxq.supabase.co/rest/v1/user_subscriptions?select=*&order=updated_at.desc&limit=5';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lbHNjeWFvaG5ybmVrc2NwcnhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUyMDAzNCwiZXhwIjoyMDY5MDk2MDM0fQ.-PdyWp64BikrG-8leAPXEVNviJh21OPi7HOGdwejQ4U';

    try {
        const response = await fetch(supabaseUrl, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

checkLatestSubscriptions();
