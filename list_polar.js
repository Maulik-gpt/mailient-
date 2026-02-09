async function listPolarProducts() {
    const orgId = 'b4f39cd4-e58b-4e0c-ae8b-afe2358f2973';
    const token = 'polar_oat_Mr9HU6en1GEM38yzFMZGuDDIUScoU8uRTBVRS0ENRs5';

    try {
        const response = await fetch(`https://api.polar.sh/v1/products?organization_id=${orgId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

listPolarProducts();
