import { connectDB } from "../lib/db.js";
import authRoutes from '../routes/auth.route.js';
import userRoutes from '../routes/user.route.js';

const bootstrap = async (app, express) => {
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/user', userRoutes);

    app.use((req, res) => {
        res.status(404).send('Route not found');
    });


    await connectDB();
};

export default bootstrap;