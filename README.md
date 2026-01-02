# ⚙️ Quiz Master API - Scalable Quiz Management Backend

Quiz Master API is a robust, high-performance **RESTful Backend** built with **Node.js**, **Express**, and **MongoDB**. It serves as the core engine for user authentication, multi-part media management, and complex quiz data orchestration, ensuring data integrity and secure server-side operations.

---

## 🚀 Key Features

- **Secure Authentication:** Multi-layered security using JWT (JSON Web Tokens) and Bcrypt for password hashing.
- **Multipart Media Handling:** Advanced integration with Multer for processing and storing profile and cover images.
- **Dynamic Data Updates:** Intelligent controllers that build update objects dynamically to prevent accidental data overwrites.
- **Optimized Database Queries:** High-speed data retrieval using MongoDB indexing and Mongoose `.lean()` for read-heavy operations.
- **Global Error Handling:** Standardized middleware for consistent API error responses and status codes.
- **Input Sanitization:** Server-side validation to ensure clean data entry for phone numbers, emails, and quiz content.

---

## 🛠 Tech Stack

| Layer          | Technology                        |
| :------------- | :-------------------------------- |
| **Runtime**    | Node.js (LTS)                     |
| **Framework**  | Express.js                        |
| **Database**   | MongoDB (NoSQL)                   |
| **ORM**        | Mongoose                          |
| **Auth**       | JWT & Passport.js                 |
| **Storage**    | DiskStorage / Cloudinary (Multer) |
| **Validation** | Joi / Express-Validator           |

---

## 📁 Project Structure

```text
src/
├── config/         # Database connection and environment variables
├── controllers/    # Request handlers and business logic
├── middleware/     # Auth, Error handling, and Multer configs
├── models/         # Mongoose schemas and data modeling
├── routes/         # Express route definitions (Auth, User, Quiz)
├── services/       # Reusable logic (Email, File Upload helpers)
├── utils/          # Standardized response and error classes
└── index.js          # Main application entry point
⚙️ Getting Started
1. Clone the Repository
Bash

git clone [https://github.com/your-username/quiz-app-backend.git](https://github.com/your-username/quiz-app-backend.git)
cd quiz-app-backend
2. Install Dependencies
Bash

npm install
3. Environment Variables
Create a .env file in the root directory and add your configurations:

Code snippet

PORT=8080
MONGODB_URI=mongodb+srv://your_db_link
JWT_SECRET=your_secret_key

4. Run Development Server
Bash

# Using Nodemon for development
npm run dev
🎨 System Highlights
Scalable Architecture
Uses a Clean Architecture pattern (Controller-Service-Repository) to separate business logic from HTTP concerns, making the codebase easy to test and maintain.

Robust File Processing
The backend is optimized to handle binary file streams. It supports simultaneous updates for multiple image fields (e.g., Profile and Cover photos) while managing file storage naming conventions to prevent collisions.

Database Performance
Utilizes Mongoose aggregation pipelines and indexing to ensure that even with thousands of quiz questions, data retrieval remains lightning-fast.
