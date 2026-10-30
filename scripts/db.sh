#!/bin/sh
# Runs a private Postgres for this project out of .pgdata on port 5433.
# Use infra/docker-compose.yml instead if you'd rather run it in Docker.
set -e
cd "$(dirname "$0")/.."
DATA=.pgdata
PORT=5433

case "$1" in
  start)
    if [ ! -d "$DATA" ]; then
      initdb -D "$DATA" -U perround --auth=trust >/dev/null
      echo "created a new database cluster in $DATA"
    fi
    if pg_isready -h localhost -p $PORT >/dev/null 2>&1; then
      echo "postgres is already running on $PORT"
    else
      pg_ctl -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/server.log" start >/dev/null
      sleep 1
      echo "postgres running on $PORT"
    fi
    psql -h localhost -p $PORT -U perround -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='perround'" | grep -q 1 \
      || createdb -h localhost -p $PORT -U perround perround
    ;;
  stop)
    pg_ctl -D "$DATA" stop >/dev/null && echo "postgres stopped"
    ;;
  *)
    echo "usage: scripts/db.sh start|stop"
    exit 1
    ;;
esac
