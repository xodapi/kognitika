#!/usr/bin/env bash
# deploy-m-kognitika.sh — deploys Expo web build to m.kognitika.syntog.ru
set -e

NGINX_CONF_SRC="/tmp/nginx-m-kognitika.conf"
NGINX_CONF_DST="/etc/nginx/sites-available/m.kognitika.syntog.ru"
WEB_DIR="/var/www/m-kognitika"
UPLOAD_DIR="/tmp/m-kognitika-upload"

echo "=== 1. Copying files to web root ==="
sudo cp -r "$UPLOAD_DIR"/. "$WEB_DIR"/
sudo chown -R www-data:www-data "$WEB_DIR"
sudo find "$WEB_DIR" -type d -exec chmod 755 {} \;
sudo find "$WEB_DIR" -type f -exec chmod 644 {} \;

echo "=== 2. Installing Nginx config ==="
sudo cp "$NGINX_CONF_SRC" "$NGINX_CONF_DST"
sudo ln -sf "$NGINX_CONF_DST" /etc/nginx/sites-enabled/m.kognitika.syntog.ru

echo "=== 3. Testing Nginx config ==="
sudo nginx -t

echo "=== 4. Reloading Nginx ==="
sudo systemctl reload nginx

echo "=== 5. Obtaining SSL certificate ==="
sudo certbot --nginx -d m.kognitika.syntog.ru --non-interactive --agree-tos --email admin@syntog.ru --redirect

echo "=== Done! Site should be live at https://m.kognitika.syntog.ru ==="
