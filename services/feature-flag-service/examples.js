#!/usr/bin/env node

// Example usage script for Feature Flag Service
// This demonstrates how to use the service programmatically

const { PrismaClient } = require('@prisma/client');
const Redis = require('redis');
const { FeatureFlagService } = require('./dist/services/FeatureFlagService');

async function demonstrateFeatureFlags() {
  console.log('🚀 Feature Flag Service Demo\n');

  // Initialize clients
  const prisma = new PrismaClient();
  const redis = Redis.createClient({
    url: 'redis://localhost:6379'
  });

  const featureFlagService = new FeatureFlagService(prisma, redis);

  try {
    await redis.connect();
    console.log('✅ Connected to Redis');

    // Example 1: Create a new feature flag
    console.log('\n📋 Creating new feature flag...');
    const newFlag = await featureFlagService.createFlag({
      key: 'demo-new-features',
      name: 'Demo New Features',
      description: 'Enable new features for demo users',
      type: 'RULE_BASED',
      enabled: true,
      createdBy: 'demo-user',
      environment: 'development',
      rules: [{
        name: 'Demo Users',
        enabled: true,
        priority: 1,
        conditions: [{
          attribute: 'email',
          operator: 'ENDS_WITH',
          value: '@demo.com'
        }]
      }]
    });
    console.log('✅ Created flag:', newFlag.key);

    // Example 2: Create a percentage rollout flag
    console.log('\n📊 Creating percentage rollout flag...');
    const percentageFlag = await featureFlagService.createFlag({
      key: 'demo-beta-rollout',
      name: 'Demo Beta Rollout',
      description: 'Gradual rollout to 25% of users',
      type: 'PERCENTAGE',
      percentage: 25,
      enabled: true,
      createdBy: 'demo-user',
      environment: 'development'
    });
    console.log('✅ Created percentage flag:', percentageFlag.key);

    // Example 3: Create an A/B test flag
    console.log('\n🧪 Creating A/B test flag...');
    const abTestFlag = await featureFlagService.createFlag({
      key: 'demo-ui-test',
      name: 'Demo UI A/B Test',
      description: 'Test different button colors',
      type: 'MULTIVARIATE',
      isAbTest: true,
      enabled: true,
      createdBy: 'demo-user',
      environment: 'development',
      variants: [{
        key: 'control',
        name: 'Blue Button',
        weight: 0.5,
        enabled: true,
        payload: JSON.stringify({ color: 'blue', text: 'Click Me' })
      }, {
        key: 'treatment',
        name: 'Green Button',
        weight: 0.5,
        enabled: true,
        payload: JSON.stringify({ color: 'green', text: 'Continue' })
      }]
    });
    console.log('✅ Created A/B test flag:', abTestFlag.key);

    // Example 4: Evaluate flags for different users
    console.log('\n👥 Evaluating flags for different users...');

    const testUsers = [
      {
        id: 'user-1',
        email: 'john@demo.com',
        role: 'PLAYER',
        customProperties: { tier: 'premium' }
      },
      {
        id: 'user-2', 
        email: 'jane@example.com',
        role: 'PLAYER',
        customProperties: { tier: 'basic' }
      },
      {
        id: 'user-3',
        email: 'bob@demo.com', 
        role: 'PLAYER',
        customProperties: { tier: 'premium' }
      },
      {
        id: 'user-4',
        email: 'alice@example.com',
        role: 'PLAYER',
        customProperties: { tier: 'basic' }
      }
    ];

    for (const user of testUsers) {
      console.log(`\n🔍 Evaluating for ${user.email}:`);
      
      // Evaluate rule-based flag
      const ruleResult = await featureFlagService.evaluateFlag(
        'demo-new-features',
        { user }
      );
      console.log(`  New Features: ${ruleResult.enabled ? '✅ ENABLED' : '❌ DISABLED'} (${ruleResult.reason})`);
      
      // Evaluate percentage flag
      const percentResult = await featureFlagService.evaluateFlag(
        'demo-beta-rollout',
        { user }
      );
      console.log(`  Beta Rollout: ${percentResult.enabled ? '✅ ENABLED' : '❌ DISABLED'} (${percentResult.reason})`);
      
      // Evaluate A/B test flag
      const abResult = await featureFlagService.evaluateFlag(
        'demo-ui-test',
        { user }
      );
      console.log(`  UI Test: ${abResult.enabled ? '✅ ENABLED' : '❌ DISABLED'} - Variant: ${abResult.variantKey || 'none'}`);
      if (abResult.payload) {
        console.log(`    Payload:`, JSON.parse(abResult.payload));
      }
    }

    // Example 5: Update a flag
    console.log('\n⚙️ Updating flag to increase rollout...');
    await featureFlagService.updateFlag('demo-beta-rollout', 'development', {
      percentage: 50,
      description: 'Increased rollout to 50% of users'
    });
    console.log('✅ Updated beta rollout to 50%');

    // Example 6: Get all flags
    console.log('\n📋 All flags in system:');
    const allFlags = await featureFlagService.getFlagConfigs('development');
    allFlags.forEach(flag => {
      console.log(`  ${flag.key}: ${flag.enabled ? 'ON' : 'OFF'} (${flag.type})`);
    });

    // Example 7: Simulate real-time updates
    console.log('\n🔄 Simulating real-time updates...');
    
    // Toggle flag
    await featureFlagService.updateFlag('demo-new-features', 'development', {
      enabled: false
    });
    console.log('📴 Turned off demo-new-features');
    
    // Re-evaluate for a demo user
    const reEvalResult = await featureFlagService.evaluateFlag(
      'demo-new-features',
      { user: testUsers[0] }
    );
    console.log(`  Re-evaluation: ${reEvalResult.enabled ? 'ENABLED' : 'DISABLED'} (${reEvalResult.reason})`);

    console.log('\n✨ Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await redis.quit();
    await prisma.$disconnect();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'demo':
      demonstrateFeatureFlags().catch(console.error);
      break;
    case 'clean':
      cleanDemoData().catch(console.error);
      break;
    default:
      console.log('Usage: node examples.js [demo|clean]');
      console.log('  demo  - Run the feature flag demonstration');
      console.log('  clean - Clean up demo data');
  }
}

async function cleanDemoData() {
  console.log('🧹 Cleaning up demo data...');
  
  const prisma = new PrismaClient();
  
  try {
    // Delete demo flags
    const demoFlags = ['demo-new-features', 'demo-beta-rollout', 'demo-ui-test'];
    
    for (const flagKey of demoFlags) {
      try {
        await prisma.featureFlag.deleteMany({
          where: {
            key: flagKey,
            environment: 'development'
          }
        });
        console.log(`✅ Deleted flag: ${flagKey}`);
      } catch (error) {
        console.log(`⚠️ Could not delete ${flagKey}: ${error.message}`);
      }
    }
    
    console.log('✅ Cleanup completed!');
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { demonstrateFeatureFlags, cleanDemoData };