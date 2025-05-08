// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBceHKO6VqiLj1dnU8jdRTjnI0QmC1ltuM",  // Updated API key
    authDomain: "solarpanel-b1346.firebaseapp.com",     // Replace with your Firebase auth domain
    projectId: "solarpanel-b1346",                      // Replace with your Firebase project ID
    storageBucket: "solarpanel-b1346.firebasestorage.app", // Your storage bucket name
    messagingSenderId: "730583933743",                 // Replace with your messaging sender ID
    appId: "1:730583933743:web:9afed9e1d12b2d8dbef60b" // Replace with your Firebase app ID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the Firebase services
const storage = firebase.storage();
const auth = firebase.auth();
const storageRef = storage.ref();
const panelImagesRef = storageRef.child('panel images');

// DOM elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const uploadButton = document.getElementById('upload-button');
const uploadProgress = document.getElementById('upload-progress');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const imageContainer = document.getElementById('image-container');
const loadingMessage = document.getElementById('loading-message');
const authStatusElement = document.getElementById('auth-status');

// Sign in anonymously
function signInAnonymously() {
    auth.signInAnonymously()
        .then(() => {
            console.log('Signed in anonymously');
            if (authStatusElement) {
                authStatusElement.innerHTML = 'Authenticated anonymously';
                authStatusElement.classList.add('text-success');
            }
            // Load images after authentication
            loadImages();
        })
        .catch((error) => {
            console.error('Error signing in anonymously:', error);
            if (authStatusElement) {
                authStatusElement.innerHTML = 'Authentication failed: ' + error.message;
                authStatusElement.classList.add('text-danger');
            }
        });
}

// Monitor auth state
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User is signed in:', user.uid);
        if (authStatusElement) {
            authStatusElement.innerHTML = 'Authenticated anonymously';
            authStatusElement.classList.add('text-success');
        }
    } else {
        console.log('User is signed out');
        if (authStatusElement) {
            authStatusElement.innerHTML = 'Not authenticated';
            authStatusElement.classList.add('text-danger');
        }
        // Try to sign in if not authenticated
        signInAnonymously();
    }
});

// Event listeners for drag and drop
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('highlight');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('highlight');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('highlight');
    
    if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
    }
});

// Click events
dropzone.addEventListener('click', () => {
    fileInput.click();
});

uploadButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
        handleFiles(e.target.files);
    }
});

// Handle file uploads
function handleFiles(files) {
    // Check if user is authenticated
    if (!auth.currentUser) {
        alert('Please wait while we authenticate you...');
        signInAnonymously();
        return;
    }
    
    Array.from(files).forEach(file => {
        uploadFile(file);
    });
}

// Upload a file to Firebase Storage
function uploadFile(file) {
    // Show progress bar
    uploadProgress.style.display = 'block';
    uploadProgressBar.style.width = '0%';
    
    // Create a storage reference
    const fileName = file.name;
    const fileRef = panelImagesRef.child(fileName);
    
    // Upload file
    const uploadTask = fileRef.put(file);
    
    // Monitor upload progress
    uploadTask.on('state_changed',
        // Progress
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            uploadProgressBar.style.width = progress + '%';
            uploadProgressBar.textContent = Math.round(progress) + '%';
        },
        // Error
        (error) => {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + error.message);
            uploadProgress.style.display = 'none';
        },
        // Complete
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                console.log('File available at', downloadURL);
                uploadProgress.style.display = 'none';
                loadImages(); // Refresh the image gallery
            });
        }
    );
}

// Load images from Firebase Storage
function loadImages() {
    // Check if user is authenticated
    if (!auth.currentUser) {
        console.log('User not authenticated, waiting for auth...');
        return;
    }
    
    // Clear previous images
    const imageElements = document.querySelectorAll('.image-item');
    imageElements.forEach(el => el.remove());
    
    // Show loading message
    loadingMessage.style.display = 'block';
    
    // List all the items in the 'panel images' folder
    panelImagesRef.listAll()
        .then((res) => {
            if (res.items.length === 0) {
                imageContainer.innerHTML = '<div class="col-12 text-center"><p>No images uploaded yet</p></div>';
                loadingMessage.style.display = 'none';
                return;
            }
            
            // Hide loading once we start getting results
            loadingMessage.style.display = 'none';
            
            // Process each image
            res.items.forEach((itemRef) => {
                // Get the download URL
                itemRef.getDownloadURL().then((url) => {
                    // Create image card
                    const imageCard = createImageCard(itemRef.name, url);
                    imageContainer.appendChild(imageCard);
                });
            });
        })
        .catch((error) => {
            console.error('Error loading images:', error);
            imageContainer.innerHTML = `<div class="col-12 text-center"><p>Error loading images: ${error.message}</p></div>`;
            loadingMessage.style.display = 'none';
        });
}

// Create an image card element
function createImageCard(name, url) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 image-item';
    
    col.innerHTML = `
        <div class="card image-card">
            <img src="${url}" class="card-img-top" alt="${name}">
            <div class="card-body">
                <h5 class="card-title">${name}</h5>
                <div class="d-flex justify-content-between">
                    <a href="${url}" class="btn btn-sm btn-primary" target="_blank">View Full Size</a>
                    <button class="btn btn-sm btn-danger delete-btn" data-name="${name}">Delete</button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener for delete button
    const deleteBtn = col.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            deleteImage(name);
        }
    });
    
    return col;
}

// Delete an image from Firebase Storage
function deleteImage(name) {
    // Check if user is authenticated
    if (!auth.currentUser) {
        alert('Please wait while we authenticate you...');
        signInAnonymously();
        return;
    }
    
    const imageRef = panelImagesRef.child(name);
    
    imageRef.delete().then(() => {
        console.log(`${name} deleted successfully`);
        loadImages(); // Refresh the image list
    }).catch((error) => {
        console.error('Error deleting image:', error);
        alert('Error deleting image: ' + error.message);
    });
}

// Load images when the page loads (authentication now handles this)
document.addEventListener('DOMContentLoaded', () => {
    // Authentication will trigger loadImages after signing in
    // Check if already signed in
    if (auth.currentUser) {
        loadImages();
    }
}); 