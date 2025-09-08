# ---- STAGE 1: Build the Go Backend ----
# Use a specific, stable version of Golang on Alpine for a small base
FROM golang:1.21-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy dependency files first to leverage Docker's build cache
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy the rest of the backend source code
COPY backend/ ./

# Build the Go application into a single static binary.
# The output binary will be named 'server' and placed in the root directory.
RUN CGO_ENABLED=0 GOOS=linux go build -o /server .

# ---- STAGE 2: Create the Final Production Image ----
# Use a specific, stable version of Nginx on Alpine for a secure and tiny final image
FROM nginx:1.25-alpine

ENV GOFR_ENV=production

# Remove the default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/

# Copy the pre-built frontend files into the Nginx web root
COPY frontend/ /usr/share/nginx/html

# Copy the compiled Go backend from the 'builder' stage
COPY --from=builder /server /usr/local/bin/

# Copy the startup script
COPY start.sh /

# Make the startup script executable
RUN chmod +x /start.sh

# Expose port 80, which Nginx will listen on
EXPOSE 80

# Set the command to run when the container starts
CMD ["/start.sh"]
