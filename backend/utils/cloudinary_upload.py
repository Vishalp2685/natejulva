# utils/cloudinary_upload.py

import io
import cloudinary
import cloudinary.uploader
from PIL import Image


def compress_and_upload_to_cloudinary(image_file, folder="natejulva/profile_photos"):
    """
    Compresses, resizes, and converts an image to JPEG,
    then uploads it to Cloudinary. Returns the secure_url.

    Args:
        image_file: InMemoryUploadedFile or file-like object from request.FILES
        folder: Cloudinary folder path

    Returns:
        str: Cloudinary secure_url

    Raises:
        ValueError: If image processing fails
        Exception: If Cloudinary upload fails
    """
    try:
        # Open image using Pillow
        img = Image.open(image_file)

        # Convert to RGB (handles PNG with transparency, RGBA, palette modes, etc.)
        if img.mode in ("RGBA", "P", "LA", "L"):
            img = img.convert("RGB")

        # Resize to max 800x800 while preserving aspect ratio
        max_size = (800, 800)
        img.thumbnail(max_size, Image.LANCZOS)

        # Save compressed image to an in-memory buffer
        buffer = io.BytesIO()
        img.save(
            buffer,
            format="JPEG",
            quality=75,
            optimize=True
        )
        buffer.seek(0)

    except Exception as e:
        raise ValueError(f"Image processing failed: {str(e)}")

    try:
        # Upload the buffer to Cloudinary
        upload_result = cloudinary.uploader.upload(
            buffer,
            folder=folder,
            resource_type="image",
            format="jpg",
        )
        return upload_result["secure_url"]

    except Exception as e:
        raise Exception(f"Cloudinary upload failed: {str(e)}")