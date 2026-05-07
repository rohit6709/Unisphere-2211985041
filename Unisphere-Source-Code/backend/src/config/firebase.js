let firebaseMessaging = null;

const initFirebase = async () => {
    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        if(!serviceAccountJson){
            console.log("Firebase service account not configured");
            return;
        }

        const admin = (await import('firebase-admin')).default;
        const serviceAccount = JSON.parse(serviceAccountJson);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        })

        firebaseMessaging = admin.messaging();
        console.log("Firebase initialized");
    } catch (error) {
        console.error("Error initializing Firebase:", error.message);
        console.log("Firebase notifications will be disabled");
        firebaseMessaging = null;
    }
}

export const initFirebaseAdmin = async () => {
    await initFirebase();
}

export const isFirebaseEnabled = () => !!firebaseMessaging;

export const sendPushNotification = async ({ token, title, body, data = {}, priority = "normal" }) => {
    if(!firebaseMessaging || !token){
        return null;
    }
    try {
        return await firebaseMessaging.send({
            token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([key, val]) => [key, String(val)])),
            android: {
                priority: ["critical", "high"].includes(priority) ? "high" : "normal",
                notification: { channelId: "unisphere_default" }
            },
            apns: {
                payload: { aps: { sound: priority === "critical" ? "critical_sound.caf" : "default", badge: 1 } }
            }
        })
    } catch (error) {
        if (["messaging/invalid-registration-token", "messaging/registration-token-not-registered"].includes(error.code)) {
            console.warn("Firebase Stale FCM token — should be cleaned up from DB");
        } else {
            console.error("Firebase Push failed:", error.message);
        }
        return null;
    }
}

export const sendPushNotificationBatch = async ({ token, title, body, data = {}, priority = "normal" }) => {
    if(!firebaseMessaging || !token?.length) return;
    try{
        const message = {
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([key, val]) => [key, String(val)])),
            android: { priority: ["critical", "high"].includes(priority) ? "high" : "normal" }
        }

        for(let i = 0;i < token.length;i += 500){
            await firebaseMessaging.sendEachForMulticast({
                ...message,
                token: token.slice(i, i + 500)
            })
        }
    }
    catch(err){
        console.error("Firebase Batch Push failed:", err.message);
    }
}