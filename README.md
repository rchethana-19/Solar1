# Solar Panel Image Uploader

A web application for uploading and managing thermal images of solar panels for fault detection.

## Features

- Upload images to Firebase Storage via drag-and-drop or file selection
- Anonymous authentication for secure access to Firebase Storage
- View all uploaded images in a responsive gallery
- Delete images from Firebase Storage
- Real-time upload progress monitoring
- Responsive design works on desktop and mobile

## Setup Instructions

### Prerequisites

- Python 3.6 or higher
- A Firebase project with Storage and Authentication enabled
- A service account JSON file for Firebase authentication

### Configuration

1. Update the Firebase configuration in `app.js` with your Firebase project details:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

2. Enable Anonymous Authentication in your Firebase project:
   - Go to Firebase Console > Authentication > Sign-in methods
   - Enable "Anonymous" as a sign-in provider

3. Set up Firebase Storage rules to allow authenticated access:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;  // Allow access to authenticated users
    }
  }
}
```

### Firebase Requirements

1. Enable Firebase Storage in your Firebase project
2. Enable Anonymous Authentication in your Firebase project
3. Create a "panel images" folder in your Firebase Storage
4. Update Storage rules to allow authenticated access

### Running the Application

1. Start the web server:

```
python server.py
```

2. The application will open automatically in your browser at http://localhost:8000

3. Use the drag-and-drop area or "Select Files" button to upload images

4. The app automatically authenticates you anonymously to enable uploads

## Backend Integration

The frontend integrates with the Firebase Storage service. You can also use the Python `firebase_upload.py` script to:

- Upload images from your local system via command line
- List all images in the Firebase Storage
- Get public URLs for sharing images

Example usage:

```python
python firebase_upload.py
```

## How Authentication Works

1. When the page loads, the app attempts to sign in anonymously
2. Authentication status is displayed in the header
3. All storage operations (upload, list, delete) check for authentication
4. If a user is not authenticated, the app will try to authenticate them before proceeding

## Security Notes

- The Firebase configuration in `app.js` has API keys that should be protected in a production environment
- Anonymous authentication provides a basic level of security
- For production, consider implementing more robust authentication like email/password, Google, or social logins
- Storage rules are configured to only allow access to authenticated users 