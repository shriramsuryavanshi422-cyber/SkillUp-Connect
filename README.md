# SkillUp Connect 🤝

The platform centralizes youth skill development missions, making it easy for students to discover workshops, join camps, and connect with social causes like the **Lighthouse Foundation** and **Madhushram**.

---

## 🚀 Features

- **Dynamic Program Discovery:** Real-time listing of active workshops, youth leadership camps, and career counseling sessions.
- **NGO Showcasing:** Dedicated sections for partner foundations to share their mission and impact.
- **Functional Contact System:** Integrated with **EmailJS** to facilitate instant inquiries and automated email notifications.
- **Responsive UI:** A modern "Slate & Teal" professional design optimized for mobile, tablet, and desktop viewing.
- **Cloud Deployment:** Frontend hosted on **Vercel** and Backend managed via **Render** for high availability.

---

## 🛠️ Tech Stack

### Frontend
- **React.js:** Component-based UI development.
- **Tailwind CSS:** Modern utility-first styling.
- **Lucide React:** Premium iconography.
- **EmailJS API:** Handling real-time client-side email notifications.

### Backend
- **Node.js & Express:** Robust REST API development.
- **MySQL:** Structured database for managing NGO programs and inquiries.
- **Cors & Body-Parser:** Middleware for secure and efficient data handling.

---

## 📁 Project Structure

```text
SkillUp-Connect/
├── Skillup-Backend/         # Node.js Express Server
│   ├── server.js            # Main API entry point
│   └── package.json         # Backend dependencies
└── skillup-frontend/        # React Application
    ├── src/                 # Application logic & UI
    ├── api/                 # API service handlers
    └── vercel.json          # Deployment configuration
```

## 🔧 Installation & Setup

### Clone the Repository
```bash
git clone https://github.com/shriramsuryavanshi422-cyber/skillup-connect.git
cd skillup-connect
```

### Setup Backend
```bash
cd Skillup-Backend
npm install
# Configure your .env or server.js with MySQL credentials
node server.js
```

### Setup Frontend
```bash
cd ../skillup-frontend
npm install
npm start
```

## 📊 Database Schema (ER Summary)

The system operates on three primary logical entities:

1. **NGOs:** Stores foundation profiles (Lighthouse, Madhushram).
2. **Programs:** Linked to NGOs via one-to-many relationship.
3. **Inquiries:** Linked to specific programs to track user interest and contact requests.

## 📄 License

This project is developed for educational purposes under the BCA curriculum.