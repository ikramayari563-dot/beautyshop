FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install --no-audit --no-fund
COPY . .
RUN npx ng build
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/beautyshop/browser /usr/share/nginx/html
