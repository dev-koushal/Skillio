# Skillio – Learning Management System (LMS)

Skillio is a full-stack Learning Management System that enables instructors to create and manage courses while allowing students to enroll and consume structured learning content. It is built with a scalable architecture, secure authentication, and real-world application flow.

---

## 🚀 Features

### Student
- Browse and explore courses  
- Enroll in courses  
- Access lectures in a structured format  
- View enrolled courses  

### Instructor
- Create and manage courses  
- Upload and organize lectures  
- Manage course content  
- Track enrolled students  

### Authentication & Security
- JWT-based authentication  
- Role-based access (Student / Instructor)  
- Protected backend and frontend routes  

---

## 🛠️ Tech Stack

Frontend:
- React.js  
- Redux Toolkit  
- Tailwind CSS  
- Axios  

Backend:
- Node.js  
- Express.js  
- MongoDB  
- Mongoose  

Other:
- Cloudinary (media storage)  
- Razorpay (payments)  

---

## 📁 Project Structure

Skillio/
├── client/  
│   ├── components/  
│   ├── pages/  
│   ├── redux/  
│   └── App.jsx  
├── server/  
│   ├── controllers/  
│   ├── models/  
│   ├── routes/  
│   ├── middleware/  
│   └── index.js  
└── README.md  

---

## ⚙️ Setup

Clone:
git clone https://github.com/your-username/skillio.git  
cd skillio  

Backend:
cd server  
npm install  

Create .env:
PORT=5000  
MONGO_URI=your_mongodb_uri  
JWT_SECRET=your_secret  
CLOUDINARY_API_KEY=your_key  
CLOUDINARY_SECRET=your_secret  
RAZORPAY_KEY=your_key  

Run:
npm run dev  

Frontend:
cd client  
npm install  
npm start  

---

## 🔑 API Routes

Auth:
- POST /api/auth/register  
- POST /api/auth/login  
- GET /api/auth/me  

Courses:
- POST /api/course/create  
- GET /api/course/all  
- GET /api/course/:id  
- PUT /api/course/update  

Lectures:
- POST /api/lecture/add  
- GET /api/lecture/:courseId  

Enrollment:
- POST /api/enroll  
- GET /api/enrolled-courses  

---

## 🔄 Flow

1. User signs up / logs in  
2. Role assigned (student/instructor)  
3. Instructor creates course and uploads lectures  
4. Student enrolls in course  
5. Student consumes content  

---

## 🧠 Concepts

- REST API design  
- Role-based authorization  
- MongoDB relationships  
- Redux state management  
- Protected routes  
- Full end-to-end system design  

---

## ⚡ Challenges

- Managing relations (User ↔ Course ↔ Lecture)  
- Authentication flow handling  
- Syncing frontend state with backend  
- Building complete LMS flow  

---

## 📈 Future Improvements

- Progress tracking  
- Reviews & ratings  
- Live classes  
- Admin panel  
- Better UI/UX  

---

## 👨‍💻 Author

Koushal Yadav  
BTech CSE | Full Stack + DSA  

---

## 📜 License

MIT License  
