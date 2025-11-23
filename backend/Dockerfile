# Use official lightweight Python image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Create a non-root user (Recommended for HF Spaces)
RUN useradd -m -u 1000 user

# Switch to the new user
USER user
ENV PATH="/home/user/.local/bin:$PATH"

# Copy requirements
COPY --chown=user requirements.txt .

# 1. Install CPU-only PyTorch first (Drastically reduces image size & startup time)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# 2. Install other dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app code
COPY --chown=user . .

# Expose port 7860 (Hugging Face default)
EXPOSE 7860

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
