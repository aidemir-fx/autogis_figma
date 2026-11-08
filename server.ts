import express, { Request, Response } from "express";
import { Pool } from "pg";
import cors from "cors";
import path from "path";
import http from "http";
import { createServer as createViteServer } from "vite";

interface ProviderData {
    id: string;
    userId: string;
    fullName: string;
    businessName?: string;
    providerType: "master" | "auto_service" | "auto_wash" | "auto_shop";
    activityTypeId: string;
    status: "available" | "busy" | "unavailable";
    address: string;
    coordinates: {
        type: "Point";
        coordinates: [number, number]; // [lng, lat]
    };
    phone: string;
    workingPhone: string;
    description: string;
    workFrom: string;
    workTo: string;
    workingDays: boolean[];
    professions: string[];
    autoMarks: string[];
    services: string[];
    onlineBookingEnabled: boolean;
    rating?: number;
    reviewsCount?: number;
    avatar?: string;
    brandSupport?: string[];
    hasParking?: boolean;
    liftCount?: number;
    warranty?: boolean;
    hotline?: string;
}

const SAMPLE_PROVIDERS: ProviderData[] = [];


const ACTIVITY_TYPES = [
    { id: "1", name: "auto_service", displayName: "Автосервис" },
    { id: "2", name: "master", displayName: "Частный мастер" },
    { id: "3", name: "auto_wash", displayName: "Автомойка" },
    { id: "4", name: "auto_shop", displayName: "Магазин автозапчастей" },
];

interface Order {
    id: string;
    customer: {
        id: string;
        name: string;
        phone: string;
        avatarUrl?: string | null;
        address?: string;
    };
    provider: {
        id: string;
        name: string;
        phone: string;
        avatarUrl?: string | null;
        address?: string;
    };
    activityType: {
        id: string;
        name: string;
        displayName: string;
    };
    status: "pending" | "scheduled" | "completed" | "cancelled";
    name: string;
    phone: string;
    carBrand: string;
    description: string;
    timePreference?: "urgent" | "not_urgent";
    photoAssetIds?: string[];
    confirmedDateTime?: string;
    cancelReason?: string;
    chatId?: string;
    price?: number;
    createdAt: string;
    updatedAt: string;
}

const sampleOrders: Order[] = [];

const sampleMessages: Record<string, any[]> = {};


async function startServer() {
    const app = express();
    const PORT = 3000;

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/autogis"
    });

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                message TEXT NOT NULL,
                target_role VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Notifications table ready");
    } catch (e) {
        console.error("DB init error:", e);
    }

    app.get("/api/notifications", async (req: Request, res: Response) => {
        try {
            const role = req.query.role as string || 'all';
            const result = await pool.query(
                "SELECT * FROM notifications WHERE target_role = $1 OR target_role = 'all' ORDER BY created_at DESC LIMIT 50",
                [role]
            );
            res.json(result.rows);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "DB Error" });
        }
    });


    app.delete("/api/notifications/:id", async (req: Request, res: Response) => {
        try {
            await pool.query("DELETE FROM notifications WHERE id = $1", [req.params.id]);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "DB Error" });
        }
    });

    app.delete("/api/notifications", async (req: Request, res: Response) => {
        try {
            await pool.query("DELETE FROM notifications");
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "DB Error" });
        }
    });

    app.post("/api/notifications", async (req: Request, res: Response) => {
        try {
            const { message, targetRole } = req.body;
            if (!message || !targetRole) return res.status(400).json({error: "Missing fields"});
            const result = await pool.query(
                "INSERT INTO notifications (message, target_role) VALUES ($1, $2) RETURNING *",
                [message, targetRole]
            );
            res.json(result.rows[0]);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "DB Error" });
        }
    });


    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Request logging
    app.use((req, res, next) => {
        if (req.path.startsWith("/api")) {
            console.log(`[API] ${req.method} ${req.path}`);
        }
        next();
    });

    // ───────────────── API ROUTES ─────────────────

    app.get("/api/health", (req: Request, res: Response) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Activity types
    app.get("/api/activity-types", (req: Request, res: Response) => {
        res.json(ACTIVITY_TYPES);
    });

    // Combined Search
    app.get("/api/search/combined", (req: Request, res: Response) => {
        const { lat, lng, radius, activityTypes } = req.query;
        let results = [...SAMPLE_PROVIDERS];

        if (activityTypes) {
            const types = Array.isArray(activityTypes) ? activityTypes : [activityTypes];
            results = results.filter((p) => types.includes(p.providerType));
        }

        res.json({
            allProviders: results,
            nearbyProviders: results,
        });
    });

    // Single Provider Search
    app.get("/api/search/provider/:activityType/:id", (req: Request, res: Response) => {
        const { activityType, id } = req.params;
        const provider = SAMPLE_PROVIDERS.find(
            (p) => p.id === id || p.userId === id
        );
        if (!provider) {
            return res.status(404).json({ error: "Provider not found" });
        }
        res.json(provider);
    });

    // Masters list and detail
    app.get("/api/masters", (req: Request, res: Response) => {
        const query = req.query.query;
        let list = SAMPLE_PROVIDERS.filter((p) => p.providerType === "master");
        if (query) {
            const q = String(query).toLowerCase();
            list = list.filter(
                (p) =>
                    p.fullName.toLowerCase().includes(q) ||
                    p.services.some((s) => s.toLowerCase().includes(q)) ||
                    p.professions.some((pr) => pr.toLowerCase().includes(q))
            );
        }
        res.json(list);
    });

    app.get("/api/masters/profile/me", (req: Request, res: Response) => {
        const master = SAMPLE_PROVIDERS.find((p) => p.providerType === "master");
        if (!master) {
            return res.status(404).json({ error: "Profile not found" });
        }
        res.json(master);
    });

    app.put("/api/masters/profile/me", (req: Request, res: Response) => {
        let master = SAMPLE_PROVIDERS.find((p) => p.providerType === "master");
        if (!master) {
            master = {
                id: `master-${Date.now()}`,
                userId: "user-me",
                fullName: req.body.fullName || "Мастер",
                providerType: "master",
                activityTypeId: "2",
                status: "available",
                address: "",
                coordinates: { type: "Point", coordinates: [37.6, 55.7] },
                phone: req.body.phone || "",
                workingPhone: req.body.workingPhone || "",
                description: "",
                workFrom: "09:00",
                workTo: "20:00",
                workingDays: [true, true, true, true, true, true, false],
                professions: [],
                autoMarks: [],
                services: [],
                onlineBookingEnabled: true,
                ...req.body,
            };
            SAMPLE_PROVIDERS.push(master);
        } else {
            Object.assign(master, req.body);
        }
        res.json(master);
    });

    app.patch("/api/masters/profile/me/status", (req: Request, res: Response) => {
        const { status } = req.body;
        const master = SAMPLE_PROVIDERS.find((p) => p.providerType === "master");
        if (master && status) {
            master.status = status;
        }
        res.json({ success: true, status: master?.status || "available" });
    });

    app.get("/api/masters/:id", (req: Request, res: Response) => {
        const master = SAMPLE_PROVIDERS.find((p) => p.id === req.params.id);
        if (!master) {
            return res.status(404).json({ error: "Master not found" });
        }
        res.json(master);
    });

    // Auto Wash profile
    app.get("/api/auto_washes/profile/me", (req: Request, res: Response) => {
        const wash = SAMPLE_PROVIDERS.find((p) => p.providerType === "auto_wash");
        if (!wash) {
            return res.status(404).json({ error: "Profile not found" });
        }
        res.json({
            id: wash.id,
            phone: wash.phone,
            name: wash.fullName,
            role: "auto_wash",
            profile: wash,
        });
    });

    app.put("/api/auto_washes/profile/me", (req: Request, res: Response) => {
        let wash = SAMPLE_PROVIDERS.find((p) => p.providerType === "auto_wash");
        if (wash) {
            Object.assign(wash, req.body);
        }
        res.json(wash || {});
    });

    app.put("/api/auto_washes/status", (req: Request, res: Response) => {
        res.json({ success: true });
    });

    app.get("/api/auto_washes/additional-services", (req: Request, res: Response) => {
        res.json([
            { id: "1", name: "Химчистка багажника", price: 1500 },
            { id: "2", name: "Антидождь на лобовое", price: 1200 },
            { id: "3", name: "Озонирование салона", price: 1000 },
        ]);
    });

    // Auto Shop profile
    app.get("/api/auto_shops/profile/me", (req: Request, res: Response) => {
        const shop = SAMPLE_PROVIDERS.find((p) => p.providerType === "auto_shop");
        if (!shop) {
            return res.status(404).json({ error: "Profile not found" });
        }
        res.json({
            id: shop.id,
            phone: shop.phone,
            name: shop.fullName,
            role: "auto_shop",
            profile: shop,
        });
    });

    app.put("/api/auto_shops/profile/me", (req: Request, res: Response) => {
        let shop = SAMPLE_PROVIDERS.find((p) => p.providerType === "auto_shop");
        if (shop) {
            Object.assign(shop, req.body);
        }
        res.json(shop || {});
    });

    app.put("/api/auto_shops/status", (req: Request, res: Response) => {
        res.json({ success: true });
    });

    app.get("/api/auto_shops/additional-services", (req: Request, res: Response) => {
        res.json([
            { id: "1", name: "Экспресс доставка", price: 500 },
            { id: "2", name: "Подбор по каталогам", price: 0 },
        ]);
    });

    // Auto Service profile
    app.get("/api/auto_services/profile/me", (req: Request, res: Response) => {
        const service = SAMPLE_PROVIDERS.find((p) => p.providerType === "auto_service");
        if (!service) {
            return res.status(404).json({ error: "Profile not found" });
        }
        res.json({
            id: service.id,
            phone: service.phone,
            name: service.fullName,
            role: "auto_service",
            profile: service,
        });
    });

    app.put("/api/auto_services/profile/me", (req: Request, res: Response) => {
        let service = SAMPLE_PROVIDERS.find((p) => p.providerType === "auto_service");
        if (service) {
            Object.assign(service, req.body);
        }
        res.json(service || {});
    });

    app.put("/api/auto_services/status", (req: Request, res: Response) => {
        res.json({ success: true });
    });

    // Auth & Users
    let currentUser: any = null;

    app.post("/api/auth/register", (req: Request, res: Response) => {
        const { phone, name, role } = req.body;
        currentUser = {
            id: `user-${Date.now()}`,
            phone: phone || "",
            name: name || "",
            role: role || "customer",
            avatar: null,
            capabilities: {
                professionalCabinet: role !== "customer",
                calendar: role !== "customer",
                applications: role !== "customer",
            },
        };
        res.json({
            accessToken: "mock-access-token-" + Date.now(),
            refreshToken: "mock-refresh-token-" + Date.now(),
            user: currentUser,
        });
    });

    app.post("/api/auth/login", (req: Request, res: Response) => {
        const { phone } = req.body;
        if (!currentUser) {
            currentUser = {
                id: `user-${Date.now()}`,
                phone: phone || "",
                name: "",
                role: "customer",
                avatar: null,
                capabilities: {
                    professionalCabinet: false,
                    calendar: false,
                    applications: false,
                },
            };
        } else if (phone) {
            currentUser.phone = phone;
        }
        res.json({
            accessToken: "mock-access-token-" + Date.now(),
            refreshToken: "mock-refresh-token-" + Date.now(),
            user: currentUser,
        });
    });

    app.post("/api/auth/refresh", (req: Request, res: Response) => {
        res.json({
            accessToken: "mock-access-token-refreshed-" + Date.now(),
            refreshToken: "mock-refresh-token-refreshed-" + Date.now(),
            user: currentUser,
        });
    });

    app.get("/api/users/me", (req: Request, res: Response) => {
        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        res.json(currentUser);
    });

    app.get("/api/users/profile/me", (req: Request, res: Response) => {
        if (!currentUser) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        res.json(currentUser);
    });

    app.put("/api/users/profile", (req: Request, res: Response) => {
        if (!currentUser) {
            currentUser = {
                id: `user-${Date.now()}`,
                phone: req.body.phone || "",
                name: req.body.name || "",
                role: "customer",
                avatar: null,
                capabilities: {
                    professionalCabinet: false,
                    calendar: false,
                    applications: false,
                },
            };
        } else {
            if (req.body.name !== undefined) currentUser.name = req.body.name;
            if (req.body.phone !== undefined) currentUser.phone = req.body.phone;
        }
        res.json(currentUser);
    });

    // Orders
    app.post("/api/orders", (req: Request, res: Response) => {
        const { providerId, activityTypeId, name, phone, carBrand, description, timePreference, photoAssetIds } = req.body;
        const provider = SAMPLE_PROVIDERS.find((p) => p.id === providerId) || SAMPLE_PROVIDERS[0];
        const activity = ACTIVITY_TYPES.find((a) => a.id === activityTypeId) || ACTIVITY_TYPES[1];

        const customerId = currentUser?.id || `user-anon-${Date.now()}`;
        const customerName = name || currentUser?.name || "";
        const customerPhone = phone || currentUser?.phone || "";

        const newOrder: Order = {
            id: `order-${Date.now()}`,
            customer: {
                id: customerId,
                name: customerName,
                phone: customerPhone,
            },
            provider: provider ? {
                id: provider.id,
                name: provider.fullName,
                phone: provider.phone,
            } : {
                id: "unknown",
                name: "Мастер",
                phone: "",
            },
            activityType: activity,
            status: "pending",
            name: customerName,
            phone: customerPhone,
            carBrand: carBrand || "Автомобиль",
            description: description || "",
            timePreference: timePreference || "not_urgent",
            photoAssetIds: photoAssetIds || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        sampleOrders.unshift(newOrder);
        sampleMessages[newOrder.id] = [
            {
                id: `msg-${Date.now()}`,
                message: description || "Создана новая заявка",
                createdAt: new Date().toISOString(),
                status: "delivered",
                sender: newOrder.customer,
            },
        ];

        res.status(201).json(newOrder);
    });

    app.get("/api/orders/my", (req: Request, res: Response) => {
        res.json(sampleOrders);
    });

    app.get("/api/orders/provider", (req: Request, res: Response) => {
        res.json(sampleOrders);
    });

    app.get("/api/orders/:id", (req: Request, res: Response) => {
        const order = sampleOrders.find((o) => o.id === req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.json(order);
    });

    app.put("/api/orders/:id/status", (req: Request, res: Response) => {
        const order = sampleOrders.find((o) => o.id === req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        if (req.body.status) order.status = req.body.status;
        if (req.body.confirmedDateTime) order.confirmedDateTime = req.body.confirmedDateTime;
        if (req.body.cancelReason) order.cancelReason = req.body.cancelReason;
        order.updatedAt = new Date().toISOString();
        res.json(order);
    });

    // Chat messages
    app.get("/api/chat-messages/order/:id", (req: Request, res: Response) => {
        const order = sampleOrders.find((o) => o.id === req.params.id);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        const messages = sampleMessages[req.params.id] || [];
        const currentUserId = currentUser?.id;
        // Mark messages as read when chat is opened
        messages.forEach((m: any) => {
            if (m.sender?.id !== currentUserId) {
                m.status = "read";
            }
        });
        res.json({ order, messages });
    });

    app.post("/api/chat-messages/order/:id/read", (req: Request, res: Response) => {
        const messages = sampleMessages[req.params.id] || [];
        const currentUserId = currentUser?.id;
        messages.forEach((m: any) => {
            if (m.sender?.id !== currentUserId) {
                m.status = "read";
            }
        });
        res.json({ success: true });
    });

    app.post("/api/chat-messages/order/:id", (req: Request, res: Response) => {
        const { message } = req.body;
        const newMsg = {
            id: `msg-${Date.now()}`,
            message: message || "",
            createdAt: new Date().toISOString(),
            status: "delivered",
            sender: currentUser || { id: "user-anon", name: "Пользователь" },
        };
        if (!sampleMessages[req.params.id]) {
            sampleMessages[req.params.id] = [];
        }
        sampleMessages[req.params.id].push(newMsg);
        res.json(newMsg);
    });


    app.put("/api/test-put", (req: Request, res: Response) => { res.json({ success: true, body: req.body }); });
    app.post("/api/edit-message/:orderId/:messageId", (req: Request, res: Response) => {
        console.log("PUT chat message hit! orderId=", req.params.orderId, "messageId=", req.params.messageId);
        try {
        const { orderId, messageId } = req.params;
        const { message } = req.body;

        if (!sampleMessages[orderId]) {
            return res.status(404).json({ error: "Order not found" });
        }

        const msg = sampleMessages[orderId].find((m: any) => m.id === messageId);
        if (!msg) {
            return res.status(404).json({ error: "Message not found" });
        }

        msg.message = message;
        msg.isEdited = true;

        res.json(msg);
        } catch (err: any) {
            require('fs').writeFileSync('debug_error.log', String(err.stack || err));
            res.status(500).send(String(err));
        }
    });


    // Support Chat
    const supportMessages: any[] = [];
    app.get("/api/support/chat", (req, res) => {
        const userId = req.query.userId || currentUser?.id;
        if (!userId) {
            return res.json([]);
        }
        res.json(supportMessages.filter((m) => m.userId === userId));
    });

    app.post("/api/support/chat", (req, res) => {
        const { message, userId } = req.body;
        const targetId = userId || currentUser?.id || "user-anon";
        const newMsg = {
            id: `supp-${Date.now()}`,
            userId: targetId,
            senderId: userId ? "admin" : targetId,
            message: message || "",
            isRead: false,
            createdAt: new Date().toISOString(),
        };
        supportMessages.push(newMsg);
        res.json(newMsg);
    });

    app.get("/api/support/chats", (req, res) => {
        // Return grouped summaries based on real messages
        const summaries: any[] = [];
        const userIds = Array.from(new Set(supportMessages.map((m) => m.userId)));
        for (const uId of userIds) {
            const userMsgs = supportMessages.filter((m) => m.userId === uId);
            const lastMsg = userMsgs[userMsgs.length - 1];
            summaries.push({
                userId: uId,
                userName: currentUser?.id === uId ? (currentUser.name || "Пользователь") : "Пользователь",
                userPhone: currentUser?.id === uId ? (currentUser.phone || "") : "",
                lastMessage: lastMsg?.message || "",
                lastMessageAt: lastMsg?.createdAt || new Date().toISOString(),
                unreadCount: userMsgs.filter((m) => !m.isRead).length,
            });
        }
        res.json(summaries);
    });

    app.get("/api/support/unread-count", (req, res) => {
        res.json({ count: supportMessages.filter((m) => !m.isRead).length });
    });

    app.get("/api/chat-messages/unread-count", (req: Request, res: Response) => {
        const counts: { orderId: string; count: number }[] = [];
        const currentUserId = currentUser?.id;
        for (const [orderId, msgs] of Object.entries(sampleMessages)) {
            const unread = (msgs as any[]).filter(
                (m) => m.status !== "read" && m.sender?.id !== currentUserId
            ).length;
            if (unread > 0) {
                counts.push({ orderId, count: unread });
            }
        }
        res.json(counts);
    });

    // Media
    app.post("/api/v1/media/upload-intent", (req: Request, res: Response) => {
        res.json({
            intentId: `intent-${Date.now()}`,
            uploadUrl: "/api/v1/media/upload-mock",
            stagingKey: `key-${Date.now()}`,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            headers: {},
        });
    });

    app.all("/api/v1/media/upload-mock", (req: Request, res: Response) => {
        res.status(200).send("OK");
    });

    app.post("/api/v1/media/confirm-upload", (req: Request, res: Response) => {
        res.json({
            assetId: `asset-${Date.now()}`,
            status: "ready",
        });
    });

    app.get("/api/v1/media/assets/:id", (req: Request, res: Response) => {
        res.json({
            assetId: req.params.id,
            category: "photo",
            status: "ready",
            width: 800,
            height: 600,
            sizeBytes: 102400,
            mimeType: "image/jpeg",
            createdAt: new Date().toISOString(),
            urls: {
                original: "/car_service_icon.png",
            },
        });
    });

    app.get("/api/v1/media/:entityType/:entityId", (req: Request, res: Response) => {
        res.json({ assets: [] });
    });

    app.delete("/api/v1/media/assets/:id", (req: Request, res: Response) => {
        res.json({ success: true });
    });

    // Admin moderation
    app.get("/api/admin/moderation/cases", (req: Request, res: Response) => {
        res.json({ items: [], total: 0 });
    });

    app.get("/api/admin/moderation/cases/:id", (req: Request, res: Response) => {
        res.status(404).json({ error: "Case not found" });
    });

    app.post("/api/admin/moderation/cases/:id/assign", (req: Request, res: Response) => {
        res.json({ success: true });
    });

    app.post("/api/admin/professional-applications/:id/decision", (req: Request, res: Response) => {
        res.json({ success: true });
    });

    app.post("/api/admin/moderation/cases/:id/release", (req: Request, res: Response) => {
        res.json({ success: true });
    });

    // Reference endpoints
    app.get("/api/reference/professions", (req: Request, res: Response) => {
        res.json([
            "Автоэлектрик",
            "Диагност",
            "Моторист",
            "Ходовик",
            "Маляр",
            "Кузовщик",
            "Шиномонтаж",
            "Мастер по кондиционерам",
        ]);
    });

    app.get("/api/reference/auto-marks", (req: Request, res: Response) => {
        res.json([
            { name: "LADA", internationalName: "lada" },
            { name: "Toyota", internationalName: "toyota" },
            { name: "Hyundai", internationalName: "hyundai" },
            { name: "Kia", internationalName: "kia" },
            { name: "Volkswagen", internationalName: "volkswagen" },
            { name: "BMW", internationalName: "bmw" },
            { name: "Mercedes-Benz", internationalName: "mercedes-benz" },
            { name: "Renault", internationalName: "renault" },
        ]);
    });

    // ───────────────── VITE / STATIC SERVING ─────────────────

    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        const distPath = path.join(process.cwd(), "dist");
        app.use(express.static(distPath));
        app.get("*", (req: Request, res: Response) => {
            res.sendFile(path.join(distPath, "index.html"));
        });
    }

    const server = http.createServer(app);

    server.listen(PORT, "0.0.0.0", () => {
        console.log(`AutoGIS Server is running on port ${PORT}`);
    });
}

startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
