const fetch = require('node-fetch');

async function testSnsUser() {
    try {
        console.log('Testing snsmarketing@gmail.com user...');
        
        // Try to login with snsmarketing@gmail.com
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'snsmarketing@gmail.com',
                password: 'password123' // Try common password
            })
        });
        
        console.log('Login response status:', loginResponse.status);
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('Login successful for user:', loginData.user.email);
            console.log('User ID:', loginData.user.id);
            console.log('User data:', loginData.user);
            
            // Test the images endpoint
            const imagesResponse = await fetch('http://localhost:3000/api/user/images', {
                headers: {
                    'Authorization': `Bearer ${loginData.token}`
                }
            });
            
            console.log('Images response status:', imagesResponse.status);
            
            if (imagesResponse.ok) {
                const imagesData = await imagesResponse.json();
                console.log('Images response:', imagesData);
                console.log('Number of images:', imagesData.images ? imagesData.images.length : 0);
                
                if (imagesData.images && imagesData.images.length > 0) {
                    console.log('Images found:');
                    imagesData.images.forEach(img => {
                        console.log(`- ${img.original_filename} (${img.image_type}) - ${img.tool_used}`);
                    });
                } else {
                    console.log('No images found for this user');
                }
            } else {
                console.error('Images endpoint failed:', imagesResponse.status, await imagesResponse.text());
            }
        } else {
            const errorText = await loginResponse.text();
            console.error('Login failed:', loginResponse.status, errorText);
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testSnsUser(); 