import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import studentRouter from './routers/studentAuth.routes.js';
import facultyRouter from './routers/facultyAuth.routes.js';
import adminRouter from './routers/adminAuth.routes.js';
import authRouter from './routers/auth.routes.js';
import clubRouter from './routers/club.routes.js';
import eventRouter, { clubEventRouter } from './routers/event.routes.js';
import registrationRouter from './routers/registration.routes.js';
import chatRouter from './routers/chat.routes.js';
import notificationRouter from './routers/notification.routes.js';
import onboardingRouter from './routers/onboarding.routes.js';
import dashboardRouter from './routers/dashboard.routes.js';
import clubProfileRouter from './routers/clubProfile.routes.js';
import clubTagsRouter from './routers/clubTags.routes.js';
import noticeRouter from './routers/notice.routes.js';
import auditRouter from './routers/audit.routes.js';
import uploadRouter from './routers/upload.routes.js';
import feedbackRouter from './routers/feedback.routes.js';
import { initEventCron } from './controllers/event.controller.js';

const app = express();

// Security: Helmet for HTTP Headers
app.use(helmet());

// CORS — MUST be applied BEFORE rate limiter so that 429 responses
// (and any other early short-circuited responses) still carry the
// Access-Control-Allow-Origin header. Otherwise the browser treats
// rate-limited responses as CORS failures.
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Security: Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Bumped from 100 to accommodate background polling + multi-tab usage
    standardHeaders: true,
    legacyHeaders: false,
    // Don't count CORS preflight requests against the limit
    skip: (req) => req.method === 'OPTIONS',
    message: {
        success: false,
        message: "Too many requests from this IP, please try again after 15 minutes"
    }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10kb' })); // Body limiting
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.static('public'));
app.use(cookieParser());

// Auth routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/students', studentRouter);
app.use('/api/v1/faculty', facultyRouter);
app.use('/api/v1/admin', adminRouter);

// -- student
app.use('/api/v1/students', onboardingRouter);
app.use('/api/v1/students', dashboardRouter);

//Club routes
app.use('/api/v1/clubs', clubRouter);
app.use('/api/v1/clubs', clubProfileRouter);
app.use('/api/v1/clubs', clubTagsRouter);

//Club scoped event routes
app.use('/api/v1/clubs/:clubId/events', clubEventRouter);

//Flat event routes
app.use('/api/v1/events', eventRouter);

//Registration routes
app.use('/api/v1/event-registrations', registrationRouter);

//Chat routes
app.use('/api/v1/chat', chatRouter);

// Notification routes
app.use('/api/v1/notifications', notificationRouter);

app.use('/api/v1/notices', noticeRouter);
app.use('/api/v1/uploads', uploadRouter);
app.use('/api/v1/feedback', feedbackRouter);

// Audit routes
app.use('/api/v1/audit', auditRouter);

app.get('/api/v1', (req, res) => {
    res.send('Welcome to Unisphere API');
})

// Centralized API error formatter
app.use((err, _req, res, _next) => {
    const statusCode = Number(err?.statusCode) || 500;
    const message = err?.message || 'Internal Server Error';

    if (statusCode >= 500) {
        console.error('[API_ERROR]', message, err?.stack || err);
    }

    return res.status(statusCode).json({
        success: false,
        message,
        errors: Array.isArray(err?.errors) ? err.errors : [],
    });
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.path} not found`
    })
})

export { initEventCron };
export default app;
