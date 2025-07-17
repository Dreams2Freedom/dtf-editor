const fetch = require('node-fetch');

async function testImages() {
    try {
        console.log('Testing images endpoint...');
        
        // Try admin user first
        console.log('\n--- Testing Admin User ---');
        const adminLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'admin@dtfeditor.com',
                password: 'admin123'
            })
        });
        
        if (adminLoginResponse.ok) {
            const adminLoginData = await adminLoginResponse.json();
            console.log('Admin login successful for user:', adminLoginData.user.email);
            console.log('Admin User ID:', adminLoginData.user.id);
            
            // Test admin images endpoint
            const adminImagesResponse = await fetch('http://localhost:3000/api/user/images', {
                headers: {
                    'Authorization': `Bearer ${adminLoginData.token}`
                }
            });
            
            if (adminImagesResponse.ok) {
                const adminImagesData = await adminImagesResponse.json();
                console.log('Admin images response:', adminImagesData);
                console.log('Number of admin images:', adminImagesData.images ? adminImagesData.images.length : 0);
            } else {
                console.error('Admin images endpoint failed:', adminImagesResponse.status, await adminImagesResponse.text());
            }
        } else {
            console.error('Admin login failed:', adminLoginResponse.status, await adminLoginResponse.text());
        }
        
        // Try test user
        console.log('\n--- Testing Test User ---');
        const testLoginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123'
            })
        });
        
        if (testLoginResponse.ok) {
            const testLoginData = await testLoginResponse.json();
            console.log('Test login successful for user:', testLoginData.user.email);
            console.log('Test User ID:', testLoginData.user.id);
            
            // Test test user images endpoint
            const testImagesResponse = await fetch('http://localhost:3000/api/user/images', {
                headers: {
                    'Authorization': `Bearer ${testLoginData.token}`
                }
            });
            
            if (testImagesResponse.ok) {
                const testImagesData = await testImagesResponse.json();
                console.log('Test images response:', testImagesData);
                console.log('Number of test images:', testImagesData.images ? testImagesData.images.length : 0);
                
                if (testImagesData.images && testImagesData.images.length > 0) {
                    console.log('Test user images found:');
                    testImagesData.images.forEach(img => {
                        console.log(`- ${img.original_filename} (${img.image_type}) - ${img.tool_used}`);
                    });
                } else {
                    console.log('No images found for test user');
                }
            } else {
                console.error('Test images endpoint failed:', testImagesResponse.status, await testImagesResponse.text());
            }
        } else {
            console.error('Test login failed:', testLoginResponse.status, await testLoginResponse.text());
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

testImages(); 