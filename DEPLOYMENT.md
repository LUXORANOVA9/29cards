# 🚢 Deployment & Operations Guide

## 1. Docker Deployment (Local / Staging)

The project includes a production-ready `docker-compose.yml`.

### Services

* **PostgreSQL 15**: Primary Data Store.
* **Redis 7**: Pub/Sub and Session Cache.
* **Microservices**: Auth, Game, Wallet, API Gateway.
* **Frontend**: Next.js App.

### Commands

```bash
# Build and Start
docker-compose up --build -d

# View Logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 2. Kubernetes Strategy (Production)

For production on AWS EKS, Google GKE, or Azure AKS:

### A. Scalability

* **Game Service**: StatefulSet. Requires Sticky Sessions (Session Affinity) for WebSocket connections.
* **Stateless Services** (Auth, Wallet, Gateway): Deployment with Horizontal Pod Autoscaler (HPA).
* **Redis**: Use Managed Redis (AWS ElastiCache / Google Memorystore).
* **Database**: Use Managed PostgreSQL (RDS / Cloud SQL) with Read Replicas.

### B. Secrets Management

Do **NOT** use environment variables for sensitive keys in production.

* Use **AWS Secrets Manager** or **HashiCorp Vault**.
* Inject secrets into pods at runtime.

### C. CI/CD Pipeline

1. **Build**: TurboRepo builds Docker images for each service.
2. **Test**: Run Unit and Integration tests.
3. **Push**: Push images to ECR/GCR.
4. **Deploy**: Helm Charts / ArgoCD to update the cluster.

---

## 3. Observability (Telemetry)

### A. Metrics (Prometheus)

* **API Gateway**: Exposes `/metrics` endpoint using `prom-client`.
* **Game Service**: Active Connections, Tables, Rounds/sec (Planned).
* **System**: CPU, Memory, Event Loop Lag.

### B. Visualization (Grafana)

* **Real-time Dashboard**: Player concurrency, Revenue ticker.
* **Alerting**: High error rates, Latency spikes.

### C. Tracing (Jaeger/OpenTelemetry)

* Trace requests across microservices (Gateway -> Auth -> Wallet).
* Identify bottlenecks in the Settlement flow.

### D. Logs (Loki / ELK)

* Structured JSON logging.
* Centralized aggregation for auditing and debugging.
