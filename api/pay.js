const express = require('express');
const { Paynow } = require('paynow');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const paynow = new Paynow(
    (process.env.PAYNOW_INTEGRATION_ID || '').trim(),
    (process.env.PAYNOW_INTEGRATION_KEY || '').trim(),
    process.env.PAYNOW_RESULT_URL,
    process.env.PAYNOW_RETURN_URL
);

// Unified endpoint for payment initiation
app.post('/api/pay', async (req, res) => {
    const { description, mobile, amount, authemail } = req.body;

    if (!description || !mobile || !amount || !authemail) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const payment = paynow.createPayment(description, authemail);
        payment.add(description, amount);

        // Initiate mobile (Ecocash) payment
        const response = await paynow.sendMobile(payment, mobile, 'ecocash');

        if (response.success) {
            // Return IMMEDIATELY to the frontend
            // The frontend will now use the pollUrl to check status
            res.json({
                success: true,
                pollUrl: response.pollUrl,
                instructions: response.instructions || "Check your phone for the Ecocash prompt"
            });
        } else {
            res.status(400).json({ success: false, error: response.error });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

// Endpoint to check transaction status (Called by your Frontend)
app.get('/api/status', async (req, res) => {
    const { pollUrl } = req.query;
    if (!pollUrl) return res.status(400).json({ error: 'Missing pollUrl' });

    try {
        const status = await paynow.pollTransaction(pollUrl);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: 'Error polling status' });
    }
});

module.exports = app; // Export the app for Vercel
