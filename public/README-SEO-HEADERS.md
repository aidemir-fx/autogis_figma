# Настройка серверных заголовков для SEO

Для максимальной SEO оптимизации необходимо настроить следующие HTTP заголовки на сервере:

## Nginx конфигурация

```nginx
server {
    listen 80;
    server_name autogis.pro www.autogis.pro;
    root /path/to/your/app/dist;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # SEO headers
    add_header X-Robots-Tag "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" always;

    # Cache headers для статических ресурсов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
    }

    # Cache headers для HTML
    location / {
        expires 0;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Service Worker
    location = /sw.js {
        add_header Cache-Control "no-cache";
        add_header Content-Type "application/javascript";
    }

    # Robots.txt
    location = /robots.txt {
        add_header Content-Type "text/plain";
    }

    # Sitemap
    location = /sitemap.xml {
        add_header Content-Type "application/xml";
    }

    # Manifest
    location = /site.webmanifest {
        add_header Content-Type "application/manifest+json";
    }

    # Redirect www to non-www
    if ($host = 'www.autogis.pro') {
        return 301 https://autogis.pro$request_uri;
    }

    # Force HTTPS
    if ($scheme = http) {
        return 301 https://$server_name$request_uri;
    }
}
```

## Apache конфигурация

```apache
<VirtualHost *:80>
    ServerName autogis.pro
    ServerAlias www.autogis.pro
    DocumentRoot /path/to/your/app/dist

    # Redirect www to non-www and HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTP_HOST} ^www\. [NC]
    RewriteRule ^(.*)$ https://autogis.pro/$1 [R=301,L]
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]

    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer-when-downgrade"
    Header always set Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'"

    # SEO headers
    Header always set X-Robots-Tag "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"

    # Cache headers для статических ресурсов
    <LocationMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "public, immutable"
        Header set Expires "access plus 1 year"
    </LocationMatch>

    # Cache headers для HTML
    <Location "/">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires 0
    </Location>

    # Service Worker
    <Location "/sw.js">
        Header set Cache-Control "no-cache"
        Header set Content-Type "application/javascript"
    </Location>

    # Robots.txt
    <Location "/robots.txt">
        Header set Content-Type "text/plain"
    </Location>

    # Sitemap
    <Location "/sitemap.xml">
        Header set Content-Type "application/xml"
    </Location>

    # Manifest
    <Location "/site.webmanifest">
        Header set Content-Type "application/manifest+json"
    </Location>
</VirtualHost>
```

## Важные заголовки для SEO:

1. **X-Robots-Tag** - указывает поисковикам как индексировать страницу
2. **Cache-Control** - контролирует кеширование ресурсов
3. **Content-Security-Policy** - повышает безопасность
4. **X-Frame-Options** - предотвращает кликджекинг
5. **X-Content-Type-Options** - предотвращает MIME sniffing

## Проверка заголовков:

Используйте инструменты для проверки:
- `curl -I https://autogis.pro/`
- Google Search Console
- Yandex.Webmaster
- Lighthouse в DevTools

## Дополнительные рекомендации:

1. Настройте HTTP/2 для лучшей производительности
2. Включите gzip/brotli сжатие
3. Настройте мониторинг производительности
4. Регулярно проверяйте Core Web Vitals
