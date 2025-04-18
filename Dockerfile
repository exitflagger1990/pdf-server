FROM node:20-slim

# Install ghostscript and tesseract
RUN apt-get update && apt-get install -y \
  ghostscript \
  tesseract-ocr \
  tesseract-ocr-nld \
  tesseract-ocr-fra \
  tesseract-ocr-eng \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080
CMD ["node", "server.js"]
