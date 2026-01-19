FROM node:alpine as build

WORKDIR /usr/src/app

COPY package*.json ./

ENV NODE_ENV=development
RUN npm ci

COPY . .

ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_API_URL

ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:alpine

COPY --from=build /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]