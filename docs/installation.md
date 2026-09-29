# SERA — Installation & Setup Guide

---

## 1. System Requirements

### Hardware Requirements:
- **CPU**: 2 cores minimum (4 cores recommended)
- **RAM**: 4 GB RAM minimum (8 GB recommended)
- **Disk Space**: 2 GB free space

### Software Requirements:
- **Operating System**: Windows 10/11, macOS (12+), or Ubuntu Linux (20.04+)
- **Python**: Version 3.10, 3.11, or 3.12
- **Node.js**: Version 18.x or 20.x LTS
- **Package Managers**: `pip` (Python) and `npm` (Node.js)

---

## 2. Step-by-Step Installation

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/sera-reliability.git
cd sera-reliability
```

---

### Step 2: Backend Setup & Virtual Environment

1. Navigate to the backend directory:
   ```bash
   cd sera/backend
   ```

2. Create a Python virtual environment:
   ```bash
   python -m venv .venv
   ```

3. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **Windows (Command Prompt)**:
     ```cmd
     .venv\Scripts\activate.bat
     ```
   - **Linux / macOS**:
     ```bash
     source .venv/bin/activate
     ```

4. Install backend dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. Ingest Official CALIBER Case 2 Supporting Data:
   ```bash
   cd ..
   python scripts/ingest_official_caliber_data.py
   cd backend
   ```

6. Start FastAPI Development Server:
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   Backend will be running at `http://localhost:8000` with Swagger UI at `http://localhost:8000/docs`.

*(Alternatively, run the automated unified launcher `.\start.ps1` from root).*

---

### Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd sera/frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start Vite Development Server:
   ```bash
   npm run dev
   ```
   Frontend will be running at `http://localhost:5173`.

---

### Step 4: Verify Installation

Open your browser and navigate to `http://localhost:5173`. You should see the SERA login screen with the White & Blue Light Theme and the 1-Click Interactive Persona Switcher.
