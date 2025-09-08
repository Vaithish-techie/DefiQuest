#!/bin/sh
# Start the Go backend server in the background
/usr/local/bin/server &
# Start Nginx in the foreground
nginx -g 'daemon off;'