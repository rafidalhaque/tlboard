FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY . .
RUN npm run build
RUN npm run db:generate

FROM node:22-alpine
WORKDIR /repo
COPY package.json ./
COPY apps/server/package.json apps/server/package.json
RUN npm install --omit=dev --workspace=apps/server
COPY --from=build /repo/apps/server/dist apps/server/dist
COPY --from=build /repo/apps/server/drizzle apps/server/drizzle
COPY --from=build /repo/apps/web/dist apps/web/dist
WORKDIR /repo/apps/server
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
