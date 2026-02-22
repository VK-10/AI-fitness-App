# Fitness Tracking Microservices

A Spring Boot microservices application for fitness tracking with AI-powered workout recommendations powered by Google Gemini.

---

## Architecture Overview

```
Client
  │
  ▼
┌─────────────────────────────────────────────────────────┐
│                    API Gateway (:8881)                   │
│         OAuth2 JWT Auth (Keycloak) + User Sync           │
└──────┬───────────────┬─────────────────┬────────────────┘
       │               │                 │
       ▼               ▼                 ▼
 User Service    Activity Service    AI Service
   (:8081)          (:8082)           (:8085)
  PostgreSQL        MongoDB           MongoDB
                       │
                  RabbitMQ Queue
                  (fitness.exchange)
                       │
                       ▼
                   AI Service
               (Gemini API Processing)
```

**Supporting Infrastructure:**
- **Eureka Server** (:8761) — Service discovery
- **Config Server** (:8888) — Centralized configuration
- **Keycloak** (:8090) — Identity & access management

---

## Services

### 1. Eureka Server (`/eureka`)
Service registry for all microservices to register and discover each other.

- **Port:** `8761`
- **Tech:** Spring Cloud Netflix Eureka Server

---

### 2. Config Server (`/configServer`)
Centralized configuration server using native filesystem (`classpath:/config`).

- **Port:** `8888`
- **Tech:** Spring Cloud Config Server
- Serves config for: `user-service`, `activity-service`, `ai-service`, `gateway`

---

### 3. API Gateway (`/gateway`)
Single entry point for all client requests. Handles authentication, CORS, and user synchronization.

- **Port:** `8881`
- **Tech:** Spring Cloud Gateway (WebFlux), OAuth2 Resource Server
- **Auth:** Validates JWT tokens issued by Keycloak
- **User Sync:** Automatically registers Keycloak users into the User Service on first request (`KeycloakUserSyncFilter`)
- **Routes:**
  | Path | Service |
  |------|---------|
  | `/api/users/**` | USER-SERVICE |
  | `/api/activities/**` | ACTIVITY-SERVICE |
  | `/api/recommendations/**` | AI-SERVICE |

---

### 4. User Service (`/userService`)
Manages user profiles and validates user identity.

- **Port:** `8081`
- **Tech:** Spring Boot MVC, Spring Data JPA, PostgreSQL
- **Database:** `fitness_user_db` (PostgreSQL)
- **Endpoints:**
  | Method | Path | Description |
  |--------|------|-------------|
  | `POST` | `/api/users/register` | Register a new user |
  | `GET` | `/api/users/{userId}` | Get user profile |
  | `GET` | `/api/users/{userId}/validate` | Validate user existence |

---

### 5. Activity Service (`/activityService`)
Tracks user fitness activities and publishes them to RabbitMQ for AI processing.

- **Port:** `8082`
- **Tech:** Spring Boot MVC, Spring Data MongoDB, RabbitMQ
- **Database:** `Fitness` (MongoDB)
- **Message Queue:** Publishes to `fitness.exchange` → `activity.queue` (routing key: `activity.tracking`)
- **Supported Activity Types:** `RUNNING`, `WALKING`, `CYCLING`, `SWIMMING`, `WEIGHT_TRAINING`, `YOGA`, `HIIT`, `CARDIO`, `STRETCHING`, `OTHER`
- **Endpoints:**
  | Method | Path | Description |
  |--------|------|-------------|
  | `POST` | `/api/activities` | Track a new activity |
  | `GET` | `/api/activities` | Get all activities for user |
  | `GET` | `/api/activities/{activityId}` | Get a specific activity |

---

### 6. AI Service (`/aiService`)
Listens for activity messages and generates personalized fitness recommendations using the Google Gemini API.

- **Port:** `8085`
- **Tech:** Spring Boot MVC, Spring Data MongoDB, RabbitMQ, Google Gemini API
- **Database:** `fitnessRecommendation` (MongoDB)
- **Message Queue:** Consumes from `activity.queue`
- **Endpoints:**
  | Method | Path | Description |
  |--------|------|-------------|
  | `GET` | `/api/recommendations/user/{userId}` | Get all recommendations for a user |
  | `GET` | `/api/recommendations/activity/{activityId}` | Get recommendation for an activity |

Each recommendation includes:
- **Analysis** — Overall, pace, heart rate, and calories breakdown
- **Improvements** — Area-specific improvement suggestions
- **Suggestions** — Next workout recommendations
- **Safety** — Safety guidelines

---

## ⚙️ Prerequisites

- Java 25
- Maven 3.9+
- Docker (recommended for infrastructure)
- MongoDB
- PostgreSQL
- RabbitMQ
- Keycloak

---

## Getting Started

### 1. Start Infrastructure

Using Docker, spin up the required services:

```bash
# MongoDB
docker run -d -p 27017:27017 --name mongodb mongo

# PostgreSQL
docker run -d -p 5433:5432 -e POSTGRES_DB=fitness_user_db \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres postgres

# RabbitMQ
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:management

# Keycloak
docker run -d -p 8090:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin quay.io/keycloak/keycloak:latest start-dev
```

### 2. Configure Environment Variables

For the AI Service, set the following environment variables:

```bash
export GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
export GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start Services (in order)

```bash
# 1. Eureka Server
cd eureka && ./mvnw spring-boot:run

# 2. Config Server
cd configServer && ./mvnw spring-boot:run

# 3. User Service
cd userService && ./mvnw spring-boot:run

# 4. Activity Service
cd activityService && ./mvnw spring-boot:run

# 5. AI Service
cd aiService && ./mvnw spring-boot:run

# 6. Gateway
cd gateway && ./mvnw spring-boot:run
```

### 4. Set Up Keycloak

1. Open Keycloak at `http://localhost:8090`
2. Create a realm named `fitness-oauth2`
3. Create a client for your frontend application
4. Configure users and roles as needed

---

##  API Usage

All requests go through the gateway at `http://localhost:8881`. Include your Keycloak JWT token in the `Authorization` header.

### Track an Activity

```bash
curl -X POST http://localhost:8881/api/activities \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "RUNNING",
    "duration": 30,
    "caloriesBurned": 350,
    "startTime": "2025-02-22T08:00:00",
    "additionalMetrics": {
      "distance": 5.2,
      "avgHeartRate": 145
    }
  }'
```

### Get AI Recommendations

```bash
curl http://localhost:8881/api/recommendations/user/{userId} \
  -H "Authorization: Bearer <your_jwt_token>"
```

---

##  Project Structure

```
fitness-microservices/
├── eureka/              # Service discovery server
├── configServer/        # Centralized config server
│   └── src/main/resources/config/
│       ├── activity-service.yml
│       ├── ai-service.yml
│       ├── gateway.yml
│       └── user-service.yml
├── gateway/             # API gateway with auth & routing
├── userService/         # User management (PostgreSQL)
├── activityService/     # Activity tracking (MongoDB + RabbitMQ)
└── aiService/           # AI recommendations (MongoDB + Gemini)
```

---

##  Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Spring Boot 4.0.2 |
| Service Discovery | Spring Cloud Netflix Eureka |
| Config Management | Spring Cloud Config |
| API Gateway | Spring Cloud Gateway (WebFlux) |
| Authentication | Keycloak + OAuth2/JWT |
| User DB | PostgreSQL + Spring Data JPA |
| Activity DB | MongoDB + Spring Data MongoDB |
| Recommendations DB | MongoDB + Spring Data MongoDB |
| Messaging | RabbitMQ + Spring AMQP |
| AI Engine | Google Gemini API |
| Service Mesh | Spring Cloud LoadBalancer |
| Java Version | Java 25 |

---

##  Configuration Reference

Key configuration properties (managed via Config Server):

| Property | Default | Description |
|----------|---------|-------------|
| `rabbitmq.exchange.name` | `fitness.exchange` | RabbitMQ exchange name |
| `rabbitmq.queue.name` | `activity.queue` | RabbitMQ queue name |
| `rabbitmq.routing.key` | `activity.tracking` | Routing key for activity messages |
| `gemini.api.url` | `${GEMINI_API_URL}` | Google Gemini API endpoint |
| `gemini.api.key` | `${GEMINI_API_KEY}` | Google Gemini API key |
| `eureka.client.service-url.defaultZone` | `http://localhost:8761/eureka/` | Eureka server URL |

---

## 🔒 Security

- All API endpoints are protected by JWT tokens issued by Keycloak
- The gateway validates tokens against Keycloak's JWKS endpoint
- User IDs are propagated through the `X-User-ID` header after validation
- New Keycloak users are automatically synced to the User Service on first authenticated request
- CORS is configured to allow requests from `http://localhost:5173` (default Vite dev server)
