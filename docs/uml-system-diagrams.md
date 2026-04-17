# System UML & Data Model Diagrams

This document provides:

1. A **main-use-case UML view** of the system.
2. A **class diagram** for the core backend/domain elements.
3. An **ER diagram** for the Firestore-backed data model.

The diagrams are based on the current API routes, shared libraries, and domain types in this repository.

---

## 1) Main Use Case UML — Submit Restaurant Review

### 1.1 Use Case Diagram

```mermaid
flowchart LR
    user([Authenticated User])
    guest([Guest User])

    subgraph FriendlyEats System
      uc1((Browse Restaurant Catalog))
      uc2((View Restaurant Details))
      uc3((Submit Review))
      uc4((Recalculate Restaurant Rating))
      uc5((Persist Review in Firestore))
      uc6((Read Reviews for Restaurant))
    end

    user --> uc1
    user --> uc2
    user --> uc3

    guest --> uc1
    guest --> uc2

    uc3 -. includes .-> uc5
    uc3 -. includes .-> uc6
    uc3 -. includes .-> uc4
```

### 1.2 Sequence Diagram (Main Use Case Realization)

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant FE as Frontend UI (RestaurantInfoFront)
    participant API as POST /api/restaurants/{id}/reviews
    participant DB as Firestore

    U->>FE: Enter text + rating, click Submit
    FE->>API: POST review payload (rating, text, userEmail, userDisplayName)
    API->>API: Validate id, text, rating range

    API->>DB: add() into review collection
    DB-->>API: review document id

    API->>DB: Query reviews where restaurantId == id
    DB-->>API: Review set for restaurant

    API->>API: Compute average rating
    API->>DB: Update restaurants/{id} with rating + starsgiven
    DB-->>API: Update success

    API-->>FE: JSON { review, rating }
    FE-->>U: Updated rating and confirmation
```

---

## 2) UML Class Diagram — Core Domain + Backend Services

```mermaid
classDiagram
    class Restaurant {
      +string id
      +string name
      +string photo
      +string photoPath
      +string imagePath
      +string storagePath
      +number rating
      +number starsgiven
      +string country
      +string state
      +string city
      +string address
      +string street
      +unknown categories
      +string category
    }

    class Review {
      +string id
      +string restaurantId
      +number rating
      +number grade
      +string text
      +string userEmail
      +string userDisplayName
      +string createdAt
      +timestamp timestamp
    }

    class UserAccount {
      +string id
      +string name
      +string email
      +string passwordHash
      +string passwordSalt
      +number passwordIterations
      +string passwordHashAlgorithm
      +string createdAt
    }

    class PasswordReset {
      +string id
      +string email
      +string token
      +string createdAt
      +string expiresAt
      +boolean used
    }

    class ReviewsRoute {
      +POST(request, params) Response
    }

    class SignupRoute {
      +POST(request) Response
    }

    class AuthVerifyRoute {
      +POST(request) Response
    }

    class ResetRoute {
      +POST(request) Response
    }

    class FirebaseAdmin {
      +getAdminFirestore() Firestore
    }

    class RatingParser {
      +parseRatingValue(rating) number
    }

    class RateLimitService {
      +resolveClientIp(request) string
      +consumeRateLimit(config) RateLimitResult
    }

    ReviewsRoute --> FirebaseAdmin : uses
    ReviewsRoute --> RatingParser : uses
    ReviewsRoute --> Review : creates
    ReviewsRoute --> Restaurant : updates aggregate rating

    SignupRoute --> FirebaseAdmin : uses
    SignupRoute --> UserAccount : creates

    AuthVerifyRoute --> FirebaseAdmin : reads
    AuthVerifyRoute --> RateLimitService : throttles attempts
    AuthVerifyRoute --> UserAccount : verifies credentials

    ResetRoute --> FirebaseAdmin : uses
    ResetRoute --> PasswordReset : creates reset token

    Restaurant "1" <-- "0..*" Review : receives
    UserAccount "1" <-- "0..*" Review : author by email/displayName
    UserAccount "1" <-- "0..*" PasswordReset : requests
```

---

## 3) ER Diagram — Firestore Collections

```mermaid
erDiagram
    RESTAURANTS {
      string doc_id PK
      string name
      string photo
      string photoPath
      string imagePath
      string storagePath
      string category
      string categories
      number rating
      number starsgiven
      string country
      string state
      string city
      string address
      string street
    }

    REVIEW {
      string doc_id PK
      string restaurantId FK
      number rating
      number grade
      string text
      string userEmail FK
      string userDisplayName
      string createdAt
      timestamp timestamp
    }

    VSUSERCONTROL {
      string doc_id PK
      string name
      string email UK
      string passwordHash
      string passwordSalt
      number passwordIterations
      string passwordHashAlgorithm
      string createdAt
    }

    VSPASSWORDRESETS {
      string doc_id PK
      string email FK
      string token UK
      string createdAt
      string expiresAt
      boolean used
    }

    RESTAURANTS ||--o{ REVIEW : "has reviews"
    VSUSERCONTROL ||--o{ REVIEW : "writes (email linkage)"
    VSUSERCONTROL ||--o{ VSPASSWORDRESETS : "requests reset"
```

---

## 4) Notes and Assumptions

- Firestore is schemaless; ER attributes represent fields observed in route handlers and domain types.
- `REVIEW.userEmail` and `VSPASSWORDRESETS.email` are **logical foreign keys** (application-level linkage).
- Restaurant aggregate rating is denormalized in `restaurants.rating` and `restaurants.starsgiven` and recalculated after review insert.
