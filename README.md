SkillUp Connect 🤝The platform centralizes youth skill development missions, making it easy for students to discover workshops, join camps, and connect with social causes.🚀 FeaturesDynamic Program Discovery: Real-time listing of active workshops, youth leadership camps, and career counseling sessions.NGO Showcasing: Dedicated sections for partner foundations to share their mission and impact.Functional Contact System: Integrated with EmailJS to facilitate instant inquiries and automated email notifications.Responsive UI: A modern "Slate & Teal" professional design optimized for mobile, tablet, and desktop viewing.Cloud Deployment: Frontend hosted on Vercel and Backend managed via Render for high availability.🛠️ Tech StackFrontendReact.js: Component-based UI development.Tailwind CSS: Modern utility-first styling.Lucide React: Premium iconography.EmailJS API: Handling real-time client-side email notifications.BackendNode.js & Express: Robust REST API development.MySQL: Structured database for managing NGO programs and inquiries.Cors & Body-Parser: Middleware for secure and efficient data handling.📁 Project StructureSkillUp-Connect/
├── Skillup-Backend/         # Node.js Express Server
│   ├── server.js            # Main API entry point
│   └── package.json         # Backend dependencies
└── skillup-frontend/        # React Application
    ├── src/                 # Application logic & UI
    ├── api/                 # API service handlers
    └── vercel.json          # Deployment configuration
⚙️ Installation & Setup1. Clone the repositorygit clone [https://github.com/shriramsuryavanshi422-cyber/skillup-connect.git](https://github.com/shriramsuryavanshi422-cyber/skillup-connect.git)
cd skillup-connect
2. Setup Backendcd Skillup-Backend
npm install
# Configure your .env with MySQL credentials
node server.js
3. Setup Frontendcd ../skillup-frontend
npm install
npm start
📊 Database Schema (ER Summary)The system operates on three primary logical entities:NGOs: Stores foundation profiles.Programs: Linked to NGOs via one-to-many relationship.Inquiries: Linked to specific programs to track user interest.📄 LicenseThis project is developed for educational purposes under the BCA curriculum.
