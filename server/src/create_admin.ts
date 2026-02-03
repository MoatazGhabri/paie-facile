import sequelize from './sequelize';
import { User } from './models/User';
import { UserRole } from './models/UserRole';
import bcrypt from 'bcrypt';

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync models to ensure tables exist
        await sequelize.sync(); // sans alter

        const email = 'admin@paiefacile.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if admin already exists
        let user = await User.findOne({ where: { email } });
        if (user) {
            console.log('Admin user already exists.');
            return;
        }

        // Create User
        user = await User.create({
            email,
            password: hashedPassword,
        });

        // Assign Admin Role
        await UserRole.create({
            user_id: user.id,
            role: 'admin',
        });

        console.log(`Admin user created successfully.`);
        console.log(`Email: ${email}`);
        console.log(`Password: ${password}`);

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await sequelize.close();
    }
};

createAdmin();
