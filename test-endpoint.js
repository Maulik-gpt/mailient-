async function test() {
    try {
        const res = await fetch('https://api.datafast.io/v1/people/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
