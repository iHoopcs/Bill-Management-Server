# Personal Finance App — Full Stack Architecture

## The Services (What You're Building)

```
Core Services:
  1. Angular UI              — dashboard, bills, expenses, budgets
  2. API Gateway Service     — single entry point, auth, rate limiting
  3. Budget Service          — CRUD expenses, categories, budgets
  4. Bill Service            — recurring bills, due dates, reminders
  5. Notification Service    — email/SMS/push (Kafka consumer)
  6. Scheduler Service       — cron jobs, publishes Kafka events
```

---

## Full Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   ┌──────────────────┐          ┌──────────────────────┐       │
│   │   Angular Web    │          │   Angular Mobile     │       │
│   │   (Browser)      │          │   (Capacitor/PWA)    │       │
│   └────────┬─────────┘          └──────────┬───────────┘       │
└────────────┼──────────────────────────────┼───────────────────┘
             │ HTTPS                         │ HTTPS
             ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API GATEWAY SERVICE                         │
│                    (Express / AWS API GW)                       │
│                                                                 │
│   ✅ JWT Auth verification        ✅ Rate limiting (Redis)      │
│   ✅ Request routing              ✅ SSL termination            │
└────────┬─────────────┬──────────────────┬────────────────────┘
         │             │                  │
         ▼             ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Budget       │ │ Bill         │ │ User         │
│ Service      │ │ Service      │ │ Service      │
│ (Express)    │ │ (Express)    │ │ (Express)    │
│              │ │              │ │              │
│ /expenses    │ │ /bills       │ │ /auth        │
│ /categories  │ │ /reminders   │ │ /profile     │
│ /budgets     │ │ /recurring   │ │              │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────────────────────────────────────────┐
│                    Redis                        │
│                                                 │
│  • Dashboard totals cache (TTL: 5min)           │
│  • User session store                           │
│  • Rate limit counters                          │
│  • Budget threshold flags                       │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│                   MongoDB                       │
│                                                 │
│  Collections:                                   │
│  • users        • expenses                      │
│  • bills        • budgets                       │
│  • categories   • notifications_log             │
└─────────────────────────────────────────────────┘


        ASYNC / EVENT-DRIVEN LAYER
        ───────────────────────────────────────────

┌───────────────────────────────────────────────────────┐
│              Scheduler Service (cron)                 │
│                                                       │
│  Every morning at 8am:                                │
│  → Check bills due in 1, 3, 7 days                    │
│  → Check budgets at 80% / 100% threshold              │
│  → Publish events to Kafka                            │
└──────────────────────┬────────────────────────────────┘
                       │ publishes
                       ▼
┌───────────────────────────────────────────────────────┐
│                    Apache Kafka                       │
│                                                       │
│  Topics:                                              │
│  • bill.due-soon          { billId, userId, dueDate } │
│  • budget.threshold       { budgetId, userId, pct }   │
│  • expense.created        { expenseId, userId, amt }  │
│  • payment.confirmed      { billId, userId }          │
└──────────────────────┬────────────────────────────────┘
                       │ consumes
                       ▼
┌───────────────────────────────────────────────────────┐
│            Notification Service (consumer)            │
│                                                       │
│  → Resend (email): "Your rent is due in 3 days"       │
│  → Twilio (SMS):   "Budget 80% reached: Dining"       │
│  → Web Push:       In-app notification                │
│  → Logs sent notifications to MongoDB                 │
└───────────────────────────────────────────────────────┘
```

---

## Containerization & Orchestration

```
Local Development (Docker Compose):
─────────────────────────────────
docker-compose up
  ├── angular-ui           (port 4200)
  ├── api-gateway          (port 3000)
  ├── budget-service       (port 3001)
  ├── bill-service         (port 3002)
  ├── user-service         (port 3003)
  ├── notification-service (no port — consumer only)
  ├── scheduler-service    (no port — cron only)
  ├── mongodb              (port 27017)
  ├── redis                (port 6379)
  ├── kafka                (port 9092)
  ├── kafka-ui             (port 8080)  ← browse topics visually
  └── redis-commander      (port 8081)  ← browse cache visually


Production (Kubernetes on AWS EKS):
────────────────────────────────────
  Each service → Kubernetes Deployment + Service
  Kafka        → AWS MSK (managed Kafka)
  Redis        → AWS ElastiCache
  MongoDB      → MongoDB Atlas (or AWS DocumentDB)
  Angular UI   → AWS S3 + CloudFront (static hosting)
  API Gateway  → AWS ALB (Application Load Balancer)
```

---

## AWS Services Mapped to Each Component

| Component           | Local (Dev)        | AWS (Production)              |
|---------------------|--------------------|-------------------------------|
| Angular UI hosting  | `ng serve`         | S3 + CloudFront               |
| API Gateway         | Express localhost  | AWS ALB + EKS                 |
| Microservices       | Docker Compose     | EKS (Kubernetes)              |
| MongoDB             | Docker container   | MongoDB Atlas or DocumentDB   |
| Redis               | Docker container   | ElastiCache (Redis)           |
| Kafka               | Docker container   | MSK (Managed Streaming)       |
| Secrets (.env)      | `.env` file        | AWS Secrets Manager           |
| CI/CD               | GitHub Actions     | GitHub Actions → ECR → EKS   |
| Container images    | Local Docker       | AWS ECR                       |
| Logs                | Console            | AWS CloudWatch                |

---

## Kafka Topics & Triggers Mapped to Your App

```
User marks bill as paid
  → Bill Service → publishes → payment.confirmed
  → Notification Service → sends "Payment recorded ✓" email

Scheduler runs at 8am daily
  → Checks bills due within 7 days
  → publishes → bill.due-soon
  → Notification Service → sends "Rent due in 3 days" SMS

User logs $200 dining expense
  → Budget Service → checks if dining budget threshold hit
  → publishes → budget.threshold (if >80%)
  → Notification Service → sends "You've used 85% of dining budget"
```

---

## CI/CD Pipeline (GitHub Actions)

```
On Pull Request:
  → Lint + TypeScript check
  → Run unit tests per service
  → Build Docker images (verify they build)

On Merge to Main:
  → Build Docker images
  → Push to AWS ECR
  → Deploy to EKS (kubectl apply)
  → Run smoke tests against staging

One pipeline per repo (one per microservice)
```

---

## Things to Remember / Common Pitfalls

```
⚠️  Kafka consumer idempotency
    Kafka retries on failure — your notification service WILL receive
    duplicate events. Always check: "Did I already send this notification?"
    Store a notifications_log in MongoDB keyed by eventId.

⚠️  Redis is not your source of truth
    Never write to Redis only. Always MongoDB first, Redis as a read cache.
    Redis data can evict or restart. MongoDB is the record of truth.

⚠️  API Gateway owns auth, not individual services
    Services behind the gateway trust that auth is already verified.
    Don't duplicate JWT validation in every service.

⚠️  Secrets never in code or .env committed to git
    Local: .env (gitignored)
    Production: AWS Secrets Manager → injected as K8s secrets

⚠️  MongoDB schema discipline
    MongoDB is schema-less by default but use Mongoose schemas with
    strict: true. Financial data with no schema = future debugging nightmare.

⚠️  Scheduler Service is a single instance
    Don't run multiple replicas of the scheduler or bills will trigger
    duplicate Kafka events. Use a Kubernetes Deployment with replicas: 1
    or use a distributed lock in Redis.
```

---

## Recommended Build Order

```
Phase 1 — Core Monolith First
  → Angular UI + single Express API + MongoDB
  → Auth (JWT), CRUD for bills/expenses/budgets
  → Get it working end-to-end

Phase 2 — Containerize
  → Dockerfile per service
  → docker-compose.yml for local dev
  → Add Redis caching for dashboard data

Phase 3 — Extract Notification Service + Kafka
  → Add Kafka to docker-compose
  → Scheduler publishes bill.due-soon
  → Notification Service consumes and sends email/SMS

Phase 4 — Kubernetes + AWS
  → EKS cluster
  → Deploy all services
  → Switch Kafka → MSK, Redis → ElastiCache

Phase 5 — CI/CD
  → GitHub Actions pipeline
  → Auto deploy on merge to main
```

---

## Tech Stack Summary

| Layer            | Technology                        |
|------------------|-----------------------------------|
| Frontend         | Angular                           |
| Backend Services | Express.js / Node.js (TypeScript) |
| Database         | MongoDB + Mongoose                |
| Cache            | Redis                             |
| Messaging        | Apache Kafka                      |
| Containerization | Docker + Docker Compose           |
| Orchestration    | Kubernetes (AWS EKS)              |
| Cloud            | AWS (EKS, MSK, ElastiCache, S3, CloudFront, ECR, Secrets Manager) |
| CI/CD            | GitHub Actions                    |
| Notifications    | Resend (email) + Twilio (SMS)     |
