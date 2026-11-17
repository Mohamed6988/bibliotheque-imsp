#!/bin/sh
set -e
python manage.py migrate --noinput
python manage.py collectstatic --noinput >/dev/null 2>&1 || true
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py ensure_librarian || true
fi
exec "$@"
