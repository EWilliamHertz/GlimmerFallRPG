import ngrok from '@ngrok/ngrok';

const token = process.env.NGROK_AUTHTOKEN || '3GMehmbv0AKWQs4AsPTl45iYfLY_4jM3fafvRnbtDRFz6Bku6';
const port = parseInt(process.env.PORT || '8080', 10);

async function startTunnel() {
  try {
    const listener = await ngrok.forward({
      addr: port,
      authtoken: token,
    });
    console.log('\n==================================================');
    console.log('🚀 Glimmerfall Online Public Tunnel Active!');
    console.log(`🔗 Public URL: ${listener.url()}`);
    console.log(`🌐 Forwarding to: http://localhost:${port}`);
    console.log('==================================================\n');

    process.on('SIGINT', async () => {
      console.log('Closing ngrok tunnel...');
      await listener.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Closing ngrok tunnel...');
      await listener.close();
      process.exit(0);
    });

    // Keep process event loop alive indefinitely
    setInterval(() => {}, 1000 * 3600);
  } catch (err) {
    console.error('Error starting ngrok tunnel:', err);
    process.exit(1);
  }
}

startTunnel();
