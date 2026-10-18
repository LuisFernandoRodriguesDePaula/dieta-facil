FROM node:24-bookworm-slim AS frontend
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM eclipse-temurin:21-jdk-jammy AS backend
WORKDIR /build/backend
COPY backend/ ./
COPY --from=frontend /build/frontend/dist/ ./src/main/resources/static/
RUN chmod +x mvnw && ./mvnw -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --gid 10001 dieta && useradd --uid 10001 --gid dieta --no-create-home dieta
COPY --from=backend --chown=dieta:dieta /build/backend/target/*.jar /app/app.jar
USER dieta
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=55 -XX:InitialRAMPercentage=15 -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=48m -Xss512k"
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]

