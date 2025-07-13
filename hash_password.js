const bcrypt = require('bcryptjs'); // Note: 'bcryptjs' is commonly used for browser compatibility, 'bcrypt' for native

const plaintextPassword = 'Omotundemibobo0'; // <-- REPLACE THIS WITH YOUR DESIRED NEW PASSWORD

async function hashMyPassword() {
    try {
        const salt = await bcrypt.genSalt(10); // Generates a salt
        const hashedPassword = await bcrypt.hash(plaintextPassword, salt); // Hashes the password
        console.log('New Hashed Password:', hashedPassword);
    } catch (error) {
        console.error('Error hashing password:', error);
    }
}

hashMyPassword();