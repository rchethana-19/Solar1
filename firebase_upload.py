import firebase_admin
from firebase_admin import credentials, storage
import os

def upload_to_firebase(image_path, service_account_path, bucket_name):
    """
    Upload an image to Firebase Storage in the panel images folder
    
    Parameters:
    image_path (str): Path to the image file to upload
    service_account_path (str): Path to the Firebase service account JSON file
    bucket_name (str): Firebase storage bucket name
    
    Returns:
    str: Public URL of the uploaded image
    """
    try:
        # Check if image file exists
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image file not found: {image_path}")
            
        # Initialize Firebase if not already initialized
        if not firebase_admin._apps:
            if not os.path.exists(service_account_path):
                raise FileNotFoundError(f"Service account file not found: {service_account_path}")
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })
        
        # Get the bucket
        bucket = storage.bucket()
        
        # Create blob name from the image filename
        image_filename = os.path.basename(image_path)
        blob_name = f'panel images/{image_filename}'  # Using 'panel images' folder (with space)
        
        # Upload the file
        blob = bucket.blob(blob_name)
        blob.upload_from_filename(image_path)
        
        # Make the file publicly accessible
        blob.make_public()
        
        print(f"Successfully uploaded {image_filename} to panel images folder")
        return blob.public_url
        
    except FileNotFoundError as e:
        print(f"File error: {str(e)}")
        return None
    except Exception as e:
        print(f"Error uploading to Firebase: {str(e)}")
        return None

def list_panel_images(service_account_path, bucket_name):
    """
    List all images in the panel images folder
    
    Parameters:
    service_account_path (str): Path to the Firebase service account JSON file
    bucket_name (str): Firebase storage bucket name
    
    Returns:
    list: List of image URLs
    """
    try:
        # Initialize Firebase if not already initialized
        if not firebase_admin._apps:
            if not os.path.exists(service_account_path):
                raise FileNotFoundError(f"Service account file not found: {service_account_path}")
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {
                'storageBucket': bucket_name
            })
        
        # Get the bucket
        bucket = storage.bucket()
        
        # List all blobs in the panel images folder
        blobs = bucket.list_blobs(prefix='panel images/')
        
        # Get public URLs for all images
        image_urls = []
        for blob in blobs:
            if not blob.name.endswith('/'):  # Skip folders
                blob.make_public()
                image_urls.append({
                    'name': os.path.basename(blob.name),
                    'url': blob.public_url
                })
        
        return image_urls
        
    except Exception as e:
        print(f"Error listing images: {str(e)}")
        return []

if __name__ == "__main__":
    # Configuration
    service_account_path = "/Users/chethanar/downloads/solarpanel-b1346.json"
    bucket_name = "solarpanel-b1346.firebasestorage.app"  # Correct bucket name
    
    # Example: List existing images
    print("\nListing existing images in panel images folder:")
    images = list_panel_images(service_account_path, bucket_name)
    if images:
        for img in images:
            print(f"- {img['name']}: {img['url']}")
    else:
        print("No images found in panel images folder")
    
    # Upload Solar_panel.jpeg file
    image_path = "Solar_panel.jpeg"
    print(f"\nUploading {image_path} to Firebase Storage...")
    public_url = upload_to_firebase(image_path, service_account_path, bucket_name)
    if public_url:
        print("\nUploaded image URL:", public_url)
        
    # List images again after upload
    print("\nListing images after upload:")
    images = list_panel_images(service_account_path, bucket_name)
    if images:
        for img in images:
            print(f"- {img['name']}: {img['url']}")
    else:
        print("No images found in panel images folder")
        