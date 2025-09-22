// Quick fix to ensure admin@phsagency.com exists in Supabase Auth
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixPHSAgencyLogin() {
    const email = 'admin@phsagency.com';
    const password = 'Admin123!'; // Default password - you can change this

    console.log(`\n🔧 Fixing login for ${email}...\n`);

    try {
        // Check if user exists
        const { data: userList } = await supabase.auth.admin.listUsers();
        const existingUser = userList?.users?.find(u => u.email === email);

        if (existingUser) {
            console.log('✅ User exists in Supabase Auth');
            console.log('🔄 Updating password...');

            // Update the password
            const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                password: password,
                email_confirm: true
            });

            if (updateError) {
                console.error('❌ Error updating password:', updateError);
            } else {
                console.log('✅ Password updated successfully!');
            }
        } else {
            console.log('⚠️ User does not exist in Supabase Auth');
            console.log('🆕 Creating user...');

            // Create the user
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                app_metadata: { role: 'admin', agency_id: 'PHS001' },
                user_metadata: { role: 'admin', agency_id: 'PHS001' }
            });

            if (createError) {
                console.error('❌ Error creating user:', createError);
            } else {
                console.log('✅ User created successfully!');
                console.log('User ID:', newUser.user.id);
            }
        }

        // Test the login
        console.log('\n🧪 Testing login...');
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (loginError) {
            console.error('❌ Login test failed:', loginError.message);
        } else {
            console.log('✅ Login test successful!');
            console.log('Token:', loginData.session.access_token.substring(0, 20) + '...');
        }

        console.log('\n📝 You can now log in with:');
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);
        console.log('\n⚠️ Remember to change this password after logging in!');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixPHSAgencyLogin();