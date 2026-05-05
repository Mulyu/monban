FROM node:latest
ADD https://example.com/installer.sh /tmp/installer.sh
RUN sh /tmp/installer.sh
USER root
CMD ["node", "server.js"]
