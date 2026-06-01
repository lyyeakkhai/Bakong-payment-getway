import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import input from 'input';
import { loadConfig } from './src/shared/config.js';
import { confirmPayment } from './src/modules/bot/use-cases/confirm-payment.js';

const apiId = 31933203;
const apiHash = '096fee0d23f78e26263273eab59f702a';
const stringSession = new StringSession(''); // Save this string to avoid logging in again

(async () => {
  console.log('Starting ABA Forwarder Userbot...');
  
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text('Please enter your phone number (with country code, e.g. +855...): '),
    password: async () => await input.text('Please enter your 2FA password (if you have one): '),
    phoneCode: async () => await input.text('Please enter the code you received on Telegram: '),
    onError: (err) => console.log(err),
  });
  
  console.log('You are now connected!');
  console.log('Save this session string so you do not have to log in again:');
  console.log(client.session.save());

  client.addEventHandler(async (event) => {
    const message = event.message;
    // We want to detect incoming messages from ABA Bank that contain 'Received' and 'LOCAL-'
    if (message.text && message.text.includes('Received') && message.text.includes('LOCAL-')) {
      console.log('Detected ABA Bank Payment Receipt!');
      console.log(message.text);
      
      // Call the docker backend API so it updates the correct store!
      try {
        await fetch('http://localhost:3001/api/internal/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: message.text })
        });
        console.log('✅ Payment sent to backend!');
      } catch (err) {
        console.error('Error confirming payment:', err);
      }
    }
  }, new NewMessage({ incoming: true }));
  
  console.log('Listening for ABA transactions...');
})();
