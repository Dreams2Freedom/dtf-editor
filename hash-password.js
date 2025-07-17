const bcrypt = require('bcrypt');

async function hashPassword() {
    const password = 'password123';
    const saltRounds = 10;
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        console.log('Password:', password);
        console.log('Hash:', hash);
        
        // Test the hash
        const isValid = await bcrypt.compare(password, hash);
        console.log('Hash is valid:', isValid);
        
    } catch (error) {
        console.error('Error hashing password:', error);
    }
}

hashPassword(); 