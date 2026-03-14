# TriageAI - AI-Powered Patient Triage System

An intelligent clinical management platform built for hackathons, designed to streamline patient intake and prioritize urgent medical cases using real-time AI.

## 🚀 Key Features

- **Real-Time Voice-to-Text**: Dictate symptoms (Patient) or clinical assessments (Doctor) using high-accuracy browser-based speech recognition.
- **AI Priority Assignment**: Automatically classifies patients into **CRITICAL**, **HIGH**, **MEDIUM**, or **LOW** urgency levels using the Grok-3-mini LLM.
- **Doctor Dashboard**: Live, prioritized queue of patients to ensure life-threatening cases are seen first.
- **Structured Clinical Summaries**: Automatically generates medical summaries from patient symptoms to save time for clinicians.
- **Patient History**: Secure portal for patients to view their triage status and doctor reports.

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (TypeScript, Tailwind CSS, Framer Motion)
- **Backend**: Node.js & Express
- **AI Engine**: xAI Grok (LLM) & Web Speech API (Transcription)
- **Database**: SQLite (Local development)
- **Icons**: Lucide React

## 🏁 Getting Started

### Prerequisites

- Node.js installed
- An xAI API Key (for Grok)

### 1. Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:
```env
PORT=5000
XAI_API_KEY=your_xai_api_key_here
```

Start the backend:
```bash
npm run dev
```

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## 📂 Project Structure

- `/frontend`: Next.js application with patient and doctor portals.
- `/backend`: Express server handling AI logic and database operations.
- `/nlp`: Python scripts for additional symptom processing (if enabled).

---

Developed for the **Hackathon 2026**.
