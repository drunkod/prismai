// e2e/extract-v2ray-config.js
import { startWorker } from "jazz-tools/worker";
import { WebSocket } from "ws";
import { TestServerAccount } from "./test-data-schema.js";
import fs from "fs";
import path from "path";

global.WebSocket = WebSocket;

async function extractV2RayConfig() {
  console.log("🔍 Connecting to Jazz...");
  
  const { worker } = await startWorker({
    syncServer: process.env.JAZZ_SYNC_URL || "ws://127.0.0.1:4200",
    accountID: process.env.JAZZ_TEST_SERVER_ACCOUNT,
    accountSecret: process.env.JAZZ_TEST_SERVER_SECRET,
    AccountSchema: TestServerAccount,
  });

  console.log("📡 Loading test data...");
  
  const account = await TestServerAccount.load(worker.id, {
    loadAs: worker,
    resolve: { 
      root: { 
        allSnapshots: {
          $each: {}
        }
      } 
    }
  });

  if (!account || !account.root || !account.root.allSnapshots) {
    console.log("❌ Could not load account data");
    return;
  }

  console.log(`Found ${account.root.allSnapshots.length} snapshots\n`);

  const allConfigs = [];
  
  // Process each snapshot
  for (const snapshot of account.root.allSnapshots) {
    if (!snapshot || !snapshot.storageContent) continue;
    
    try {
      const storageData = JSON.parse(snapshot.storageContent);
      
      if (storageData._servers_list) {
        console.log(`\n📸 Processing snapshot from: ${snapshot.testTitle}`);
        console.log(`   Retrieved at: ${new Date(snapshot.retrievedAt).toLocaleString()}`);
        
        const servers = storageData._servers_list;
        const v2rayConfigs = generateV2RayConfigs(servers);
        
        allConfigs.push({
          snapshot: {
            testTitle: snapshot.testTitle,
            retrievedAt: snapshot.retrievedAt
          },
          configs: v2rayConfigs
        });
        
        // Save individual config files
        for (const config of v2rayConfigs) {
          const filename = `v2ray-config-${config.name.toLowerCase().replace(/\s+/g, '-')}.json`;
          const filepath = path.join('e2e', 'v2ray-configs', filename);
          
          // Create directory if it doesn't exist
          const dir = path.dirname(filepath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          fs.writeFileSync(filepath, JSON.stringify(config.v2ray, null, 2));
          console.log(`   ✅ Saved: ${filename}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing snapshot:`, error.message);
    }
  }
  
  // Save combined config
  const combinedConfig = generateCombinedV2RayConfig(allConfigs);
  const combinedPath = path.join('e2e', 'v2ray-configs', 'v2ray-config-combined.json');
  fs.writeFileSync(combinedPath, JSON.stringify(combinedConfig, null, 2));
  console.log(`\n✅ Saved combined config: v2ray-config-combined.json`);
  
  // Save summary
  const summary = generateSummary(allConfigs);
  const summaryPath = path.join('e2e', 'v2ray-configs', 'servers-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`✅ Saved summary: servers-summary.json`);
}

function generateV2RayConfigs(servers) {
  const configs = [];
  
  for (const [key, server] of Object.entries(servers)) {
    if (!server.host || !server.port) continue;
    
    // Determine protocol based on server info
    const isSocks = key === 'hideme' || server.name?.includes('SOCKS');
    const protocol = isSocks ? 'socks' : 'http';
    
    const config = {
      name: server.name || key,
      host: server.host,
      port: server.port,
      v2ray: generateSingleV2RayConfig(server, protocol)
    };
    
    configs.push(config);
  }
  
  return configs;
}

function generateSingleV2RayConfig(server, protocol = 'http') {
  return {
    "log": {
      "loglevel": "warning"
    },
    "inbounds": [
      {
        "port": 1080,
        "listen": "127.0.0.1",
        "protocol": "socks",
        "settings": {
          "auth": "noauth",
          "udp": true
        }
      },
      {
        "port": 8001,
        "listen": "127.0.0.1",
        "protocol": "http"
      }
    ],
    "outbounds": [
      {
        "protocol": protocol,
        "settings": {
          "servers": [
            {
              "address": server.host,
              "port": server.port
            }
          ]
        },
        "tag": "proxy"
      },
      {
        "protocol": "freedom",
        "tag": "direct"
      }
    ],
    "routing": {
      "domainStrategy": "IPIfNonMatch",
      "rules": [
        {
          "type": "field",
          "ip": [
            "geoip:private"
          ],
          "outboundTag": "direct"
        }
      ]
    }
  };
}

function generateCombinedV2RayConfig(allConfigs) {
  const latestServers = allConfigs[allConfigs.length - 1]?.configs || [];
  
  const outbounds = [
    ...latestServers.map((server, index) => ({
      "protocol": server.host === "socks.hide.me" ? "socks" : "http",
      "settings": {
        "servers": [
          {
            "address": server.host,
            "port": server.port
          }
        ]
      },
      "tag": `proxy-${server.name.toLowerCase().replace(/\s+/g, '-')}`
    })),
    {
      "protocol": "freedom",
      "tag": "direct"
    }
  ];
  
  return {
    "log": {
      "loglevel": "warning"
    },
    "inbounds": [
      {
        "port": 1080,
        "listen": "127.0.0.1",
        "protocol": "socks",
        "settings": {
          "auth": "noauth",
          "udp": true
        }
      },
      {
        "port": 8001,
        "listen": "127.0.0.1",
        "protocol": "http"
      }
    ],
    "outbounds": outbounds,
    "routing": {
      "domainStrategy": "IPIfNonMatch",
      "rules": [
        {
          "type": "field",
          "ip": [
            "geoip:private"
          ],
          "outboundTag": "direct"
        },
        {
          "type": "field",
          "domain": [
            "geosite:cn"
          ],
          "outboundTag": "direct"
        }
      ],
      "balancers": [
        {
          "tag": "proxy-all",
          "selector": outbounds
            .filter(o => o.tag.startsWith("proxy-"))
            .map(o => o.tag)
        }
      ]
    }
  };
}

function generateSummary(allConfigs) {
  const summary = {
    totalSnapshots: allConfigs.length,
    servers: [],
    lastUpdated: new Date().toISOString()
  };
  
  // Get the latest servers
  if (allConfigs.length > 0) {
    const latest = allConfigs[allConfigs.length - 1];
    summary.snapshotInfo = {
      testTitle: latest.snapshot.testTitle,
      retrievedAt: latest.snapshot.retrievedAt
    };
    
    summary.servers = latest.configs.map(config => ({
      name: config.name,
      host: config.host,
      port: config.port,
      protocol: config.host === "socks.hide.me" ? "socks" : "http",
      address: `${config.host}:${config.port}`
    }));
  }
  
  return summary;
}

extractV2RayConfig().catch(console.error).finally(() => process.exit(0));