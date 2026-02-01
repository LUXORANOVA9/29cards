# 🆓 AWS Free Tier Setup Guide for 29Cards

## 🎯 What You Get
✅ **12 months of free AWS services**
- 1x t3.micro EC2 instance (1 vCPU, 1GB RAM, 8GB SSD)
- 750 hours/month usage time
- $0 cost for first year

## ⚙ Setup Requirements
```bash
# Prerequisites
aws --version
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo mv aws /usr/local/bin/aws
sudo chmod +x /usr/local/bin/aws

# Configure AWS CLI
aws configure
# Set region (choose closest to you)
aws configure set default.region us-east-1

# Create EC2 Key Pair
aws ec2 create-key-pair --key-name 29cards-free-tier --query KeyMaterial=AWS_Generated_EC2_Key

# Security Group
aws ec2 create-security-group --group-name 29cards-sg --description "29Cards security group"

# Create EC2 Instance
aws ec2 run-instances \
  --instance-type t3.micro \
  --image-id ami-0c55b8cb5b5de7f6f6f43c3550a2b5948ab4be8665687e3ab15 \
  --key-name 29cards-free-tier \
  --security-group-ids 29cards-sg \
  --user-data file://<(cat <<EOF
{
  "name": "29cards-platform",
  "domain": "yourdomain.com",
  "admin_email": "admin@yourdomain.com"
  "project_type": "gaming_platform",
  "trial_period": "12"
}
EOF

## 🚀 Deploy 29Cards to AWS Free Tier

### 1. Create Infrastructure
```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag "29cards-vpc"

# Create Subnet
aws ec2 create-subnet --vpc-id 29cards-vpc --cidr 10.0.1.0/24 --tag "29cards-subnet-public"

# Create Internet Gateway
aws ec2 create-internet-gateway --vpc-id 29cards-vpc --tag "29cards-igw"

# Deploy to EC2
aws ec2 run-instances \
  --image-id ami-0c55b8cb5b5de7f6f43c3550a2b5948ab4be8665687e3ab15 \
  --instance-type t3.micro \
  --key-name 29cards-free-tier \
  --security-group-ids 29cards-sg \
  --subnet-id 29cards-subnet-public \
  --user-data file://<(cat <<EOF
{
  "services": {
    "api_gateway": {
      "replicas": 1,
      "cpu": 512,
      "memory": 1024,
      "port": 8080
    },
    "auth_service": {
      "replicas": 1,
      "cpu": 256,
      "memory": 512,
      "port": 3001
    },
    "game_service": {
      "replicas": 2,
      "cpu": 1024,
      "memory": 2048,
      "port": 3002
    },
    "wallet_service": {
      "replicas": 1,
      "cpu": 256,
      "memory": 512,
      "port": 3003
    },
    "web_frontend": {
      "replicas": 1,
      "cpu": 512,
      "memory": 1024,
      "port": 3000
    },
    "postgres": {
      "replicas": 1,
      "cpu": 512,
      "memory": 1024,
      "port": 5432,
      "storage": 20
    },
    "redis": {
      "replicas": 1,
      "cpu": 256,
      "memory": 512,
      "port": 6379,
      "storage": 8
    }
  }
}
EOF

# Security Group Rules
aws ec2 authorize-security-group-ingress --group-id 29cards-sg --protocol tcp --port 22 --source 0.0.0.0/0 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id 29cards-sg --protocol tcp --port 8080 --source 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id 29cards-sg --protocol tcp --port 3001 --source 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id 29cards-sg --protocol tcp --port 3002 --source 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id 29cards-sg --protocol tcp --port 3003 --source 0.0.0.0/0

# Wait for instance to be ready
echo "🔄 Waiting for EC2 instance to be ready..."
aws ec2 wait-for-instance-running --instance-ids $(aws ec2 run-instances --query 'Instances[].InstanceId' --filters 'Name=29cards-platform' --output text)

# Get instance details
INSTANCE_ID=$(aws ec2 run-instances --query 'Instances[].InstanceId' --filters 'Name=29cards-platform' --output text)
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Instances[].PublicIpAddress' --output text)

echo "✅ EC2 Instance Ready!"
echo "🌐 Public IP: $PUBLIC_IP"
```

### 2. Deploy Docker Services
```bash
# SSH into instance
ssh -i 29cards-free-tier@$PUBLIC_IP

# Install Docker
sudo yum update -y
sudo yum install -y docker

# Clone repository
git clone https://github.com/your-username/29cards.git
cd 29cards

# Build and deploy services
docker-compose -f docker-compose.prod.yml up -d

# Set up environment
export DATABASE_URL="postgresql://postgres:password@localhost:5432/sindhi_patta"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-jwt-secret-32-chars-minimum"

# Initialize database
npm install
cd packages/database
npx prisma generate
npx prisma db push
npx prisma db seed

echo "🎮 29Cards Platform deployed successfully!"
echo "🌐 Access URLs:"
echo "   📱 Web App: http://$PUBLIC_IP:3000"
echo "   🔐 API Gateway: http://$PUBLIC_IP:8080"
echo "   🎮 Game Service: http://$PUBLIC_IP:3002"
echo "   💳 Wallet Service: http://$PUBLIC_IP:3003"
echo "   🔑 Auth Service: http://$PUBLIC_IP:3001"
```

### 3. Domain Setup (Free Options)
```bash
# Option 1: Free DNS (No-IP + Port)
# Use services like No-IP, DuckDNS, Cloudflare

# Option 2: Dynamic DNS (Paid)
# Purchase domain and use Cloudflare for free SSL

# Configure application
export DOMAIN="yourdomain.com"  # Update this
export BASE_URL="http://$PUBLIC_IP:8080"  # Or use https with SSL
```

### 4. Monitoring Setup (Free)
```bash
# Install monitoring tools on EC2
sudo yum install -y htop iotop

# Create basic monitoring script
cat > monitoring.sh << 'EOF'
#!/bin/bash
echo "📊 System Resources:"
echo "CPU: \$(top -bn1 | head -1 | awk '{print \$9}')%"
echo "Memory: \$(free -h | grep '^Mem:' | awk '{print \$4}')"
echo "Disk: \$(df -h / | grep '/$' | awk '{print \$5}')"
echo "🎮 Game Service Status: \$(curl -s http://localhost:3002/health 2>/dev/null || echo 'ERROR')"
echo "🌐 API Gateway Status: \$(curl -s http://localhost:8080/health 2>/dev/null || echo 'ERROR')"
EOF

chmod +x monitoring.sh
./monitoring.sh
```

### 5. SSL/TLS (Free - Let's Encrypt)
```bash
# Install certbot
sudo yum install -y certbot

# Generate certificate
sudo certbot certonly --standalone --non-interactive --agree-tos --email admin@yourdomain.com -d yourdomain.com

# Auto-renewal
echo "0 2 * * * * * /usr/bin/certbot renew --quiet --noninteractive"
| sudo crontab -
```

### 6. Cost Management
```bash
# Create cost monitoring alerts
aws cloudwatch put-metric-alarm \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=29cards-platform \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions enable
```

## ⏰ Free Tier Limitations
- **750 hours/month** - After free tier, costs apply
- **1 vCPU instance** - Limited for high traffic
- **No auto-scaling** - Manual scaling required
- **No managed services** - Self-managed database/Redis
- **Community support** - Limited AWS support

## 💡 Optimization Tips
1. **Use Docker Compose** - Efficient resource usage
2. **Implement caching** - Redis for session/cache
3. **Monitor closely** - Stay within free tier limits
4. **Database optimization** - Connection pooling and query optimization

## ⚡ Upgrade Path
After free tier, upgrade to:
- **DigitalOcean** ($60-150/month) - For production
- **AWS t3.small** ($25-80/month) - For growth
- **AWS RDS** - For managed database

---

**Your 29Cards platform is ready for free deployment!** 🎮

Start with AWS Free Tier for testing, then scale up based on your success!