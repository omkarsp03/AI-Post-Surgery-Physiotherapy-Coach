🧠 AI Post-Surgery Physiotherapy Coach

A camera-based AI physiotherapy web application that helps patients perform post-surgery rehabilitation exercises safely using real-time pose estimation and intelligent feedback.

This project uses computer vision to analyze body movements, track exercise quality, and generate professional reports — all directly inside the browser.

🚀 Features

🎥 Real-Time Pose Detection
- Camera-based movement tracking
- MediaPipe / TensorFlow.js pose estimation
- No video recording or cloud storage

🏥 Patient Workflow
- Patient registration (Name, Age, Mobile)
- Exercise selection via dropdown
- Difficulty level selection
- Guided session preparation

🧠 Smart Exercise Intelligence
- Joint angle calculation
- Rep counting
- Speed and control analysis
- Movement quality scoring
- Symmetry detection (Left vs Right)

⚠️ Safety Features
- Pain-aware adjustment
- Unsafe movement warnings
- Compensation detection
- Safety stop alerts

📊 Progress & Reports
- Session summary dashboard
- Range of motion tracking
- Performance analytics
- Professional PDF report generation
- Includes:
  - Patient details
  - Exercise & difficulty
  - Date & time
  - Session metrics

🔒 Privacy First
- All processing happens in-browser
- ❌ No raw video stored
- Only summary statistics saved locally

🖥️ Tech Stack

Frontend
- React (Vite)
- TailwindCSS
- Framer Motion

AI / Computer Vision
- MediaPipe Pose (Web)
- TensorFlow.js (optional)

Logic Layer
- Custom JavaScript modules
- Angle calculation
- Rep detection
- Safety engine

Storage
- LocalStorage / IndexedDB


