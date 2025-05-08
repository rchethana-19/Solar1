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
const db = firebase.firestore();
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
const panelFilterSelect = document.getElementById('panel-filter');
const startScannerBtn = document.getElementById('start-scanner');
const stopScannerBtn = document.getElementById('stop-scanner');
const scannerContainer = document.getElementById('scanner-container');
const panelIdDisplay = document.getElementById('panel-id-display');
const uploadPanelId = document.getElementById('upload-panel-id');

// Global variables
let currentPanelId = null;
let html5QrCode = null;
let scannedPanelIds = new Set();

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
            // Load panel IDs for filter
            loadPanelIds();
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
        // Load images when authenticated
        loadImages();
        // Load panel IDs for filter
        loadPanelIds();
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

// QR Code Scanner Setup
startScannerBtn.addEventListener('click', startScanner);
stopScannerBtn.addEventListener('click', stopScanner);

function startScanner() {
    scannerContainer.style.display = 'block';
    startScannerBtn.style.display = 'none';
    stopScannerBtn.style.display = 'inline-block';
    
    html5QrCode = new Html5Qrcode("qr-reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start(
        { facingMode: "environment" }, 
        config,
        onScanSuccess
    ).catch(error => {
        console.error('Error starting scanner:', error);
        alert('Failed to start scanner: ' + error);
        stopScanner();
    });
}

function stopScanner() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            console.log('Scanner stopped');
            scannerContainer.style.display = 'none';
            startScannerBtn.style.display = 'inline-block';
            stopScannerBtn.style.display = 'none';
        }).catch(error => {
            console.error('Error stopping scanner:', error);
        });
    } else {
        scannerContainer.style.display = 'none';
        startScannerBtn.style.display = 'inline-block';
        stopScannerBtn.style.display = 'none';
    }
}

function onScanSuccess(decodedText) {
    try {
        // Try to parse as JSON
        const data = JSON.parse(decodedText);
        
        if (data && data.panelId) {
            currentPanelId = data.panelId;
            panelIdDisplay.textContent = `Current Panel ID: ${currentPanelId}`;
            uploadPanelId.textContent = `Images will be linked to Panel ID: ${currentPanelId}`;
            
            // Add to scanned panel IDs if not already there
            if (!scannedPanelIds.has(currentPanelId)) {
                scannedPanelIds.add(currentPanelId);
                updatePanelFilter();
            }
            
            // Optionally stop scanning after success
            stopScanner();
        } else {
            alert('Invalid QR code format. Expected JSON with panelId field.');
        }
    } catch (error) {
        console.error('Error parsing QR code:', error);
        alert('Failed to parse QR code. Expected JSON format.');
    }
}

// Update panel filter dropdown
function updatePanelFilter() {
    // Clear existing options except "All Panels"
    while (panelFilterSelect.options.length > 1) {
        panelFilterSelect.remove(1);
    }
    
    // Add panel IDs to filter
    scannedPanelIds.forEach(panelId => {
        const option = document.createElement('option');
        option.value = panelId;
        option.textContent = `Panel ${panelId}`;
        panelFilterSelect.appendChild(option);
    });
}

// Load all known panel IDs from Firestore
function loadPanelIds() {
    if (!auth.currentUser) {
        console.log('User not authenticated, waiting for auth...');
        return;
    }
    
    db.collection('panel_images')
        .get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.panelId && !scannedPanelIds.has(data.panelId)) {
                    scannedPanelIds.add(data.panelId);
                }
            });
            updatePanelFilter();
        })
        .catch((error) => {
            console.error('Error loading panel IDs:', error);
        });
}

// Filter images by panel ID
panelFilterSelect.addEventListener('change', () => {
    loadImages();
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
    
    // Check if panel ID is set
    if (!currentPanelId) {
        if (confirm('No panel ID is currently set. Images will not be linked to any specific panel. Do you want to scan a QR code first?')) {
            startScanner();
            return;
        }
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
                
                // Store image metadata in Firestore
                storeImageMetadata(fileName, downloadURL, currentPanelId);
                
                // Refresh the image gallery
                loadImages();
            });
        }
    );
}

// Store image metadata in Firestore
function storeImageMetadata(fileName, imageUrl, panelId) {
    const imageData = {
        fileName: fileName,
        imageUrl: imageUrl,
        panelId: panelId || null,  // Use null if no panel ID is set
        uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
        uploadedBy: auth.currentUser.uid
    };
    
    db.collection('panel_images').add(imageData)
        .then((docRef) => {
            console.log('Image metadata stored with ID:', docRef.id);
        })
        .catch((error) => {
            console.error('Error storing image metadata:', error);
        });
}

// Load images from Firebase Storage and Firestore
function loadImages() {
    // Check if user is authenticated
    if (!auth.currentUser) {
        console.log('User not authenticated for loading images, waiting for auth...');
        return;
    }
    
    // Clear previous images
    const imageElements = document.querySelectorAll('.image-item');
    imageElements.forEach(el => el.remove());
    
    // Show loading message
    loadingMessage.style.display = 'block';
    
    // Get the selected panel ID filter
    const selectedPanelId = panelFilterSelect.value;
    
    // Query Firestore for image metadata
    let query = db.collection('panel_images');
    if (selectedPanelId !== 'all') {
        query = query.where('panelId', '==', selectedPanelId);
    }
    
    query.orderBy('uploadedAt', 'desc')
        .get()
        .then((querySnapshot) => {
            loadingMessage.style.display = 'none';
            
            if (querySnapshot.empty) {
                imageContainer.innerHTML = '<div class="col-12 text-center"><p>No images found</p></div>';
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const imageCard = createImageCard(data.fileName, data.imageUrl, data.panelId, doc.id);
                imageContainer.appendChild(imageCard);
            });
        })
        .catch((error) => {
            console.error('Error loading images:', error);
            loadingMessage.style.display = 'none';
            imageContainer.innerHTML = `<div class="col-12 text-center"><p>Error loading images: ${error.message}</p></div>`;
            
            // Fallback to direct Storage listing if Firestore fails
            console.log('Falling back to direct Storage listing');
            loadImagesFromStorage();
        });
}

// Fallback method to load images directly from Storage
function loadImagesFromStorage() {
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
                    const imageCard = createImageCard(itemRef.name, url, null, null);
                    imageContainer.appendChild(imageCard);
                });
            });
        })
        .catch((error) => {
            console.error('Error loading images from storage:', error);
            imageContainer.innerHTML = `<div class="col-12 text-center"><p>Error loading images: ${error.message}</p></div>`;
            loadingMessage.style.display = 'none';
        });
}

// Create an image card element
function createImageCard(name, url, panelId, docId) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 image-item';
    
    const panelBadge = panelId ? 
        `<span class="badge bg-info mb-2">Panel ID: ${panelId}</span>` : 
        '<span class="badge bg-secondary mb-2">No Panel ID</span>';
    
    col.innerHTML = `
        <div class="card image-card">
            <img src="${url}" class="card-img-top" alt="${name}">
            <div class="card-body">
                <h5 class="card-title">${name}</h5>
                ${panelBadge}
                <div class="d-flex justify-content-between mt-2">
                    <a href="${url}" class="btn btn-sm btn-primary" target="_blank">View Full Size</a>
                    <button class="btn btn-sm btn-danger delete-btn" data-name="${name}" data-docid="${docId || ''}">Delete</button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listener for delete button
    const deleteBtn = col.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            deleteImage(name, docId);
        }
    });
    
    return col;
}

// Delete an image from Firebase Storage and Firestore
function deleteImage(name, docId) {
    // Check if user is authenticated
    if (!auth.currentUser) {
        alert('Please wait while we authenticate you...');
        signInAnonymously();
        return;
    }
    
    const imageRef = panelImagesRef.child(name);
    
    // Delete from Storage
    imageRef.delete().then(() => {
        console.log(`${name} deleted from Storage successfully`);
        
        // Delete from Firestore if we have a document ID
        if (docId) {
            db.collection('panel_images').doc(docId).delete()
                .then(() => {
                    console.log(`Document ${docId} deleted from Firestore successfully`);
                })
                .catch((error) => {
                    console.error('Error deleting document from Firestore:', error);
                });
        }
        
        loadImages(); // Refresh the image list
    }).catch((error) => {
        console.error('Error deleting image from Storage:', error);
        alert('Error deleting image: ' + error.message);
    });
}

// Load images when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Authentication will trigger loadImages after signing in
    // Check if already signed in
    if (auth.currentUser) {
        loadImages();
        loadPanelIds();
    }
}); 