# 🏆 ContestHub Backend – Contest Management API

This is the backend for **ContestHub**, a modern, role-based contest management platform. It provides secure APIs for authentication, contest management, user registration, task submission, and payment processing.

---

## 🌐 Live Backend URL
🔗 https://your-backend-api-url.com  

> The API serves requests from the frontend **ContestHub** application.

---

## ✨ Features

- 🔐 **User Authentication & Authorization**  
  - Firebase authentication integration  
  - Role-based access: Admin, Contest Creator, Normal User  
  - JWT-based server-side protected routes

- 🏆 **Contest CRUD APIs**  
  - Create, read, update, and delete contests  
  - Supports images, prize money, deadlines, contest type, and task instructions

- 💳 **Payment Integration**  
  - Stripe checkout session API for secure contest registration  
  - Handles payment success and failure

- 📝 **Task Submission**  
  - Registered users can submit tasks before contest deadlines  
  - Stores submissions in MongoDB

- 👤 **User Profile Management**  
  - Update name, profile picture (via ImgBB), and bio  
  - Server-side validation for safe updates

- 🗂️ **Registration Status Checking**  
  - APIs to verify if a user is registered for a contest  
  - Prevents multiple registrations

- ⏳ **Deadline Validation**  
  - Backend checks for contest expiration before accepting submissions or payments

- 📊 **Real-Time Participation Tracking**  
  - Keeps count of contest participants  
  - Updates dynamically via API calls

- 🛡️ **Security & Error Handling**  
  - Role-based route protection  
  - Centralized error handling  
  - Input validation for all API endpoints

- ⚡ **Scalable & Optimized**  
  - Uses MongoDB for data storage  
  - Efficient API design for high performance  
  - Easy to extend for future features

---

## 🛠️ Technologies Used

- **Backend Framework:** Node.js, Express.js  
- **Database:** MongoDB, Mongoose  
- **Authentication:** Firebase Authentication, JWT  
- **Payments:** Stripe API  
- **Image Hosting:** ImgBB  
- **Other:** Axios, CORS, dotenv  

---

## 📌 Project Goal

Provide a **secure, scalable, and reliable backend** for ContestHub that handles contest creation, registration, task submission, payments, and role-based authentication efficiently.

---

### 🚀 Quick Start

1. Clone the repository:  
```bash
git clone https://github.com/yourusername/contesthub-backend.git
