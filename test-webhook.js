/**
 * Test Webhook Script - Send sample webhooks to local server
 * 
 * Usage: node test-webhook.js
 * 
 * This simulates Meta sending webhooks to your local server
 * Bypasses signature verification in development mode
 */

const testWebhooks = {
  messages: {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: '123456789'
              },
              messages: [
                {
                  from: '919876543210',
                  id: 'wamid.test123',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  type: 'text',
                  text: {
                    body: 'Hello! This is a test message from local testing.'
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  },

  message_status: {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '15551234567',
                phone_number_id: '123456789'
              },
              statuses: [
                {
                  id: 'wamid.test456',
                  status: 'delivered',
                  timestamp: Math.floor(Date.now() / 1000).toString(),
                  recipient_id: '919876543210'
                }
              ]
            }
          }
        ]
      }
    ]
  },

  account_alerts: {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            field: 'account_alerts',
            value: {
              phone_number: '15551234567',
              event: 'QUALITY_SCORE_UPDATE',
              quality_score: 'YELLOW',
              timestamp: Math.floor(Date.now() / 1000).toString()
            }
          }
        ]
      }
    ]
  },

  phone_number_quality_update: {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            field: 'phone_number_quality_update',
            value: {
              display_phone_number: '15551234567',
              phone_number_id: '123456789',
              current_limit: 'TIER_1K',
              quality_score: 'GREEN',
              timestamp: Math.floor(Date.now() / 1000).toString()
            }
          }
        ]
      }
    ]
  },

  message_template_status_update: {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123456789',
        changes: [
          {
            field: 'message_template_status_update',
            value: {
              event: 'APPROVED',
              message_template_id: '987654321',
              message_template_name: 'test_template',
              message_template_language: 'en',
              reason: 'NONE',
              timestamp: Math.floor(Date.now() / 1000).toString()
            }
          }
        ]
      }
    ]
  }
};

async function sendTestWebhook(webhookType) {
  const webhook = testWebhooks[webhookType];
  
  if (!webhook) {
    console.error(`❌ Unknown webhook type: ${webhookType}`);
    console.log('Available types:', Object.keys(testWebhooks).join(', '));
    return;
  }

  console.log(`\n🧪 Sending test webhook: ${webhookType}`);
  console.log('Payload:', JSON.stringify(webhook, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhook)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', data);
    } else {
      console.error('❌ Error:', data);
    }
  } catch (error) {
    console.error('❌ Failed to send webhook:', error.message);
  }
}

// Send all test webhooks
async function sendAllTests() {
  console.log('🚀 Starting webhook tests...\n');
  
  for (const webhookType of Object.keys(testWebhooks)) {
    await sendTestWebhook(webhookType);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between tests
  }
  
  console.log('\n✅ All tests completed!');
  console.log('📊 Check your webhook debugger at: http://localhost:3000/whatsapp-admin/webhook-debug');
}

// Run tests
sendAllTests();
