const express = require('express');
const { Paynow } = require('paynow');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Health check
app.get('/', (req, res) => {
    res.send('Paynow Server is running!');
});

const paynow = new Paynow(
    process.env.PAYNOW_INTEGRATION_ID ? process.env.PAYNOW_INTEGRATION_ID.trim() : '',
    process.env.PAYNOW_INTEGRATION_KEY ? process.env.PAYNOW_INTEGRATION_KEY.trim() : '',
    process.env.PAYNOW_RESULT_URL,
    process.env.PAYNOW_RETURN_URL
);

app.post('/pay', async (req, res) => {
    console.log('--- Received Payment Request ---');
    console.log('Body:', req.body);

    const { description, mobile, amount, authemail } = req.body;

    if (!description || !mobile || !amount || !authemail) {
        return res.status(400).json({ error: 'Missing required fields: description, mobile, amount, authemail' });
    }

    try {
        const payment = paynow.createPayment(description, authemail);
        payment.add(description, amount);

        const response = await paynow.sendMobile(payment, mobile, 'ecocash');

        if (response.success) {
            console.log('Payment initiated successfully. pollUrl:', response.pollUrl);

            // LONG POLLING: Wait for a final status (Paid or Cancelled)
            let finalStatus = 'Sent';
            let attempts = 0;
            const maxAttempts = 30; // 30 attempts * 3s = 90 seconds max wait

            while (attempts < maxAttempts) {
                try {
                    console.log(`Polling status (attempt ${attempts + 1}/${maxAttempts})...`);
                    const status = await paynow.pollTransaction(response.pollUrl);

                    if (status && status.status) {
                        const currentStatus = status.status.toLowerCase();
                        console.log('- Current Paynow Status:', status.status);

                        // Check for final states
                        if (currentStatus === 'paid' || currentStatus === 'cancelled') {
                            finalStatus = status.status;
                            break;
                        }
                    }
                } catch (pollErr) {
                    console.error('Error during polling attempt:', pollErr.message);
                }

                attempts++;
                // Wait 3 seconds before next poll
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            res.json({
                success: true,
                status: finalStatus,
                paid: finalStatus.toLowerCase() === 'paid',
                pollUrl: response.pollUrl,
                instructions: response.instructions || (finalStatus === 'Sent' ? 'Poll timed out.' : `Transaction is ${finalStatus}`)
            });
        } else {
            console.log('Paynow Rejected:', response.error);
            res.status(400).json({
                success: false,
                error: response.error
            });
        }
    } catch (error) {
        console.error('SERVER ERROR:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

// Endpoint to check transaction status
app.get('/status', async (req, res) => {
    const { pollUrl } = req.query;

    if (!pollUrl) {
        return res.status(400).json({ error: 'Missing pollUrl' });
    }

    try {
        const status = await paynow.pollTransaction(pollUrl);
        res.json(status);
    } catch (error) {
        console.error('Status Error:', error);
        res.status(500).json({ error: 'Error polling status' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Paynow server running on port ${PORT}`);
});
