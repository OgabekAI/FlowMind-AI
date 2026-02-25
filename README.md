# FlowMind AI

FlowMind AI is a comprehensive productivity application designed to help users manage their tasks, goals, and time effectively. It combines features like task planning, goal tracking, analytics, and a Pomodoro timer to enhance productivity and focus.

## Features

### Backend
- **AI Engine**: Provides intelligent suggestions and insights to improve productivity.
- **Analytics**: Tracks user progress and provides detailed reports.
- **Goals Management**: Helps users set, track, and achieve their goals.
- **Planner**: Organizes tasks and schedules efficiently.
- **Pomodoro Timer**: Implements the Pomodoro technique to boost focus and productivity.
- **User Management**: Handles user authentication and profile management.

### Frontend
- **Modern UI**: Built with React and Vite for a fast and responsive user experience.
- **Multilingual Support**: Supports multiple languages (English, Uzbek, Russian).
- **Interactive Components**: Includes dynamic pages and reusable components.

## Installation

### Prerequisites
- Python 3.12
- Node.js
- npm or yarn
- Virtual environment (recommended)

### Backend Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/flowmind-ai.git
   cd flowmind-ai/flowmind-backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv env
   source env/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Apply migrations:
   ```bash
   python manage.py migrate
   ```
5. Run the development server:
   ```bash
   python manage.py runserver
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../flowmind-frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage
- Access the application at `http://127.0.0.1:8000` for the backend and the port provided by Vite for the frontend.
- Use the Pomodoro timer to focus on tasks.
- Set and track goals in the Goals module.
- Analyze your productivity with the Analytics module.

## Contributing
Contributions are welcome! Please follow these steps:
1. Fork the repository.
2. Create a new branch:
   ```bash
   git checkout -b feature-name
   ```
3. Commit your changes:
   ```bash
   git commit -m "Add feature-name"
   ```
4. Push to the branch:
   ```bash
   git push origin feature-name
   ```
5. Open a pull request.

## License
This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments
- Thanks to all contributors and the open-source community for their support.
- Special thanks to the developers of Django, React, and Vite for their amazing tools.